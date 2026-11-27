-- VAT Familias: funciones activas de revisión profesional
-- Sincronizado con la base activa después de prueba transaccional 2026-11-27.
-- Verificar un antecedente:
-- 1) crea/vincula public.vaccinations cuando corresponde,
-- 2) crea/vincula sync_records para VAT local,
-- 3) evita duplicados,
-- 4) no descuenta inventario por tratarse de antecedente histórico,
-- 5) conserva trazabilidad y evidencias.

CREATE OR REPLACE FUNCTION public.family_professional_review_queue(p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'created_at', e.created_at,
      'evidence', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id',ev.id,
          'bucket',ev.storage_bucket,
          'path',ev.storage_path,
          'mime_type',ev.mime_type,
          'file_size_bytes',ev.file_size_bytes
        ) order by ev.created_at asc),'[]'::jsonb)
        from public.family_evidence ev
        where ev.vaccine_entry_id=e.id
      )
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
$function$
;

CREATE OR REPLACE FUNCTION public.family_professional_review_entry(p_entry_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  ent public.family_vaccine_entries%rowtype;
  linkrow public.family_links%rowtype;
  prof public.profiles%rowtype;
  patient_sync public.sync_records%rowtype;
  old_status text;
  canonical_vaccination_id uuid;
  legacy_record_id text;
  legacy_patient_key text;
  canonical_key text;
  patient_canonical_key text;
  unit_name text;
  legacy_created boolean := false;
  canonical_created boolean := false;
  legacy_payload jsonb;
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
  where fl.family_member_id=ent.family_member_id
    and fl.status='aprobado'
  order by fl.approved_at desc nulls last, fl.requested_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','member_not_linked');
  end if;

  select p.* into prof
  from public.profiles p
  where p.id=uid and p.active=true
    and p.role in ('enfermeria','responsable','director','supervisor','administrador')
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','not_authorized');
  end if;

  if not (
    (prof.unit_id=linkrow.unit_id)
    or exists (
      select 1 from public.user_unit_memberships m
      where m.user_id=uid and m.unit_id=linkrow.unit_id and m.active=true
    )
    or prof.role='administrador'
  ) then
    return jsonb_build_object('ok',false,'error','unit_access_denied');
  end if;

  if p_decision='verificado' and ent.application_date is null then
    return jsonb_build_object('ok',false,'error','application_date_required_for_verification');
  end if;

  old_status := ent.verification_status;

  if p_decision='verificado' then
    select u.name into unit_name
    from public.units u
    where u.id=linkrow.unit_id;

    if linkrow.patient_id is not null then
      select v.id into canonical_vaccination_id
      from public.vaccinations v
      where v.patient_id=linkrow.patient_id
        and v.deleted=false
        and lower(trim(v.vaccine_code))=lower(trim(ent.vaccine_code))
        and v.application_date=ent.application_date
        and coalesce(trim(v.dose_code),'')=coalesce(trim(ent.dose_code),'')
      order by v.created_at asc
      limit 1;

      if canonical_vaccination_id is null then
        insert into public.vaccinations(
          unit_id, patient_id, vaccine_code, dose_code, application_date,
          lot_number, manufacturer, vaccinator_id, source, notes
        ) values (
          linkrow.unit_id, linkrow.patient_id, ent.vaccine_code, ent.dose_code, ent.application_date,
          ent.lot_number, ent.manufacturer, uid, 'familia_verificada',
          concat_ws(' · ',
            nullif(trim(coalesce(ent.notes,'')),''),
            'Antecedente capturado por familia y verificado por personal de salud'
          )
        )
        returning id into canonical_vaccination_id;
        canonical_created := true;
      end if;
    end if;

    select r.* into patient_sync
    from public.sync_records r
    where r.unit_id=linkrow.unit_id
      and r.entity='patients'
      and r.record_id=linkrow.patient_record_id
      and r.deleted=false
    limit 1;

    if found then
      legacy_patient_key := coalesce(nullif(patient_sync.payload->>'id',''),patient_sync.record_id);
      canonical_key := nullif(patient_sync.payload->>'canonicalPatientId','');
      patient_canonical_key := nullif(patient_sync.payload->>'patientCanonicalId','');

      select r.record_id into legacy_record_id
      from public.sync_records r
      where r.unit_id=linkrow.unit_id
        and r.entity='vaccinations'
        and r.deleted=false
        and (
          r.payload->>'familyEntryId'=p_entry_id::text
          or (
            lower(trim(coalesce(r.payload->>'vaccine','')))=lower(trim(ent.vaccine_code))
            and coalesce(r.payload->>'date','')=ent.application_date::text
            and coalesce(trim(r.payload->>'dose'),'')=coalesce(trim(ent.dose_code),'')
            and (
              coalesce(r.payload->>'patientId','')=legacy_patient_key
              or coalesce(r.payload->>'globalPatientId','')=legacy_patient_key
              or (canonical_key is not null and r.payload->>'canonicalPatientId'=canonical_key)
              or (patient_canonical_key is not null and r.payload->>'patientCanonicalId'=patient_canonical_key)
            )
          )
        )
      order by r.updated_at asc
      limit 1;

      if legacy_record_id is null then
        legacy_record_id := floor(extract(epoch from clock_timestamp())*1000)::bigint::text;
        while exists (
          select 1 from public.sync_records r
          where r.unit_id=linkrow.unit_id and r.entity='vaccinations' and r.record_id=legacy_record_id
        ) loop
          legacy_record_id := (legacy_record_id::bigint + 1)::text;
        end loop;

        legacy_payload := jsonb_strip_nulls(jsonb_build_object(
          'id', legacy_record_id::bigint,
          '_syncId', legacy_record_id,
          '_version', 1,
          '_updatedAt', now(),
          'familyEntryId', p_entry_id::text,
          'patientId', legacy_patient_key,
          'globalPatientId', coalesce(nullif(patient_sync.payload->>'globalPatientId',''),legacy_patient_key),
          'canonicalPatientId', canonical_key,
          'patientCanonicalId', patient_canonical_key,
          'vaccine', ent.vaccine_code,
          'dose', ent.dose_code,
          'date', ent.application_date::text,
          'lot', ent.lot_number,
          'laboratory', ent.manufacturer,
          'healthUnit', coalesce(nullif(ent.institution_name,''),unit_name),
          'source', 'Antecedente familiar verificado',
          'recordType', 'current',
          'recordedAt', now(),
          'vaccinator', prof.full_name,
          'vaccinatorId', uid::text,
          'recordedByRole', prof.role,
          'inventoryDiscounted', false,
          'obs', concat_ws(' · ',
            nullif(trim(coalesce(ent.notes,'')),''),
            'Verificado desde VAT Familias'
          )
        ));

        insert into public.sync_records(
          unit_id, entity, record_id, payload, deleted, version, updated_at, updated_by, device_id
        ) values (
          linkrow.unit_id, 'vaccinations', legacy_record_id, legacy_payload,
          false, 1, now(), uid, 'vat-familias-review'
        );
        legacy_created := true;

        insert into public.audit_log(unit_id,user_id,action,entity,entity_id,details)
        values(
          linkrow.unit_id,uid,'family_entry_promoted','vaccinations',legacy_record_id,
          jsonb_build_object(
            'family_entry_id',p_entry_id,
            'canonical_vaccination_id',canonical_vaccination_id,
            'inventory_discounted',false
          )
        );
      end if;
    end if;
  end if;

  update public.family_vaccine_entries
  set verification_status=p_decision,
      linked_vaccination_id=case
        when p_decision='verificado' then coalesce(canonical_vaccination_id, linked_vaccination_id)
        else linked_vaccination_id
      end,
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
    'canonical_vaccination_id',canonical_vaccination_id,
    'legacy_record_id',legacy_record_id,
    'canonical_record_created',canonical_created,
    'vat_record_created',legacy_created,
    'inventory_discounted',false
  );
end;
$function$
;

revoke all on function public.family_professional_review_queue(text) from public;
revoke execute on function public.family_professional_review_queue(text) from anon;
grant execute on function public.family_professional_review_queue(text) to authenticated;

revoke all on function public.family_professional_review_entry(uuid,text,text) from public;
revoke execute on function public.family_professional_review_entry(uuid,text,text) from anon;
grant execute on function public.family_professional_review_entry(uuid,text,text) to authenticated;
