-- VAT Familias: convertir antecedente familiar verificado en registro profesional VAT
-- y devolver metadatos de evidencia sin descargar archivos automáticamente.

create or replace function public.family_professional_review_queue(
  p_status text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  out_json jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok',false,'error','not_authenticated');
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id=uid and p.active=true
      and p.role in ('enfermeria','responsable','director','supervisor','administrador')
  ) then
    return jsonb_build_object('ok',false,'error','not_authorized');
  end if;

  select coalesce(jsonb_agg(x order by x->>'application_date' desc nulls last, x->>'created_at' desc),'[]'::jsonb)
  into out_json
  from (
    select jsonb_build_object(
      'entry_id', e.id,
      'family_member_id', fm.id,
      'family_member_name', fm.full_name,
      'curp', fm.curp,
      'birth_date', fm.birth_date,
      'relationship', fm.relationship_to_account,
      'family_account_name', fa.display_name,
      'unit_id', fl.unit_id,
      'patient_record_id', fl.patient_record_id,
      'patient_id', fl.patient_id,
      'vaccine_code', e.vaccine_code,
      'dose_code', e.dose_code,
      'application_date', e.application_date,
      'lot_number', e.lot_number,
      'manufacturer', e.manufacturer,
      'institution_name', e.institution_name,
      'notes', e.notes,
      'source', e.source,
      'verification_status', e.verification_status,
      'verification_notes', e.verification_notes,
      'verified_at', e.verified_at,
      'linked_vaccination_id', e.linked_vaccination_id,
      'created_at', e.created_at,
      'evidence', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',ev.id,
          'bucket',ev.storage_bucket,
          'path',ev.storage_path,
          'mime_type',ev.mime_type,
          'file_size_bytes',ev.file_size_bytes
        ) order by ev.created_at)
        from public.family_evidence ev
        where ev.vaccine_entry_id=e.id
      ),'[]'::jsonb)
    ) as x
    from public.family_vaccine_entries e
    join public.family_members fm on fm.id=e.family_member_id
    join public.family_accounts fa on fa.id=fm.family_account_id
    join public.family_links fl on fl.family_member_id=fm.id and fl.status='aprobado'
    where
      (p_status is null or p_status='' or e.verification_status=p_status)
      and (
        exists (
          select 1 from public.profiles p
          where p.id=uid and p.active=true and p.unit_id=fl.unit_id
        )
        or exists (
          select 1 from public.user_unit_memberships m
          where m.user_id=uid and m.unit_id=fl.unit_id and m.active=true
        )
        or exists (
          select 1 from public.profiles p
          where p.id=uid and p.active=true and p.role='administrador'
        )
      )
  ) q;

  return jsonb_build_object('ok',true,'items',out_json);
end;
$$;

create or replace function public.family_professional_review_entry(
  p_entry_id uuid,
  p_decision text,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ent public.family_vaccine_entries%rowtype;
  linkrow public.family_links%rowtype;
  old_status text;
  vat_id uuid;
  vat_created boolean := false;
begin
  if uid is null then
    return jsonb_build_object('ok',false,'error','not_authenticated');
  end if;

  if p_decision not in ('verificado','requiere_aclaracion','rechazado') then
    return jsonb_build_object('ok',false,'error','invalid_decision');
  end if;

  select e.* into ent
  from public.family_vaccine_entries e
  where e.id=p_entry_id
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok',false,'error','entry_not_found');
  end if;

  select fl.* into linkrow
  from public.family_links fl
  where fl.family_member_id=ent.family_member_id and fl.status='aprobado'
  order by fl.approved_at desc nulls last, fl.requested_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','member_not_linked');
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id=uid and p.active=true
      and p.role in ('enfermeria','responsable','director','supervisor','administrador')
  ) then
    return jsonb_build_object('ok',false,'error','not_authorized');
  end if;

  if not (
    exists (select 1 from public.profiles p where p.id=uid and p.active=true and p.unit_id=linkrow.unit_id)
    or exists (select 1 from public.user_unit_memberships m where m.user_id=uid and m.unit_id=linkrow.unit_id and m.active=true)
    or exists (select 1 from public.profiles p where p.id=uid and p.active=true and p.role='administrador')
  ) then
    return jsonb_build_object('ok',false,'error','unit_access_denied');
  end if;

  if ent.linked_vaccination_id is not null and p_decision <> 'verificado' then
    return jsonb_build_object('ok',false,'error','verified_record_requires_vat_edit');
  end if;

  old_status := ent.verification_status;

  if p_decision='verificado' then
    if ent.application_date is null then
      return jsonb_build_object('ok',false,'error','application_date_required_for_verification');
    end if;

    if linkrow.patient_id is null then
      return jsonb_build_object('ok',false,'error','linked_patient_missing');
    end if;

    if ent.linked_vaccination_id is null then
      insert into public.vaccinations(
        unit_id, patient_id, vaccine_code, dose_code, application_date,
        lot_number, manufacturer, vaccinator_id, source, notes
      ) values (
        linkrow.unit_id,
        linkrow.patient_id,
        ent.vaccine_code,
        ent.dose_code,
        ent.application_date,
        ent.lot_number,
        ent.manufacturer,
        uid,
        'familia_verificada',
        concat_ws(' · ',
          nullif(ent.institution_name,''),
          nullif(ent.notes,''),
          'Antecedente capturado por familia y verificado por personal de salud'
        )
      )
      returning id into vat_id;
      vat_created := true;
    else
      vat_id := ent.linked_vaccination_id;
    end if;
  end if;

  update public.family_vaccine_entries
  set verification_status=p_decision,
      linked_vaccination_id=coalesce(vat_id, linked_vaccination_id),
      verified_by=uid,
      verified_at=now(),
      verification_notes=nullif(trim(coalesce(p_notes,'')),''),
      updated_at=now()
  where id=p_entry_id;

  insert into public.family_review_events(
    vaccine_entry_id, unit_id, reviewer_id, previous_status, new_status, notes
  ) values (
    p_entry_id, linkrow.unit_id, uid, old_status, p_decision,
    nullif(trim(coalesce(p_notes,'')),'')
  );

  return jsonb_build_object(
    'ok',true,
    'entry_id',p_entry_id,
    'previous_status',old_status,
    'verification_status',p_decision,
    'reviewed_at',now(),
    'linked_vaccination_id',vat_id,
    'vat_record_created',vat_created
  );
end;
$$;

revoke all on function public.family_professional_review_queue(text) from public;
revoke execute on function public.family_professional_review_queue(text) from anon;
grant execute on function public.family_professional_review_queue(text) to authenticated;

revoke all on function public.family_professional_review_entry(uuid,text,text) from public;
revoke execute on function public.family_professional_review_entry(uuid,text,text) from anon;
grant execute on function public.family_professional_review_entry(uuid,text,text) to authenticated;
