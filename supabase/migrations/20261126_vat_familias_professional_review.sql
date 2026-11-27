-- VAT Familias: bandeja profesional de verificacion

create table if not exists public.family_review_events (
  id uuid primary key default gen_random_uuid(),
  vaccine_entry_id uuid not null references public.family_vaccine_entries(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  previous_status text,
  new_status text not null check (new_status in ('verificado','requiere_aclaracion','rechazado')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists family_review_events_entry_idx
  on public.family_review_events(vaccine_entry_id, created_at desc);

alter table public.family_review_events enable row level security;

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
      'created_at', e.created_at,
      'evidence_count', (
        select count(*) from public.family_evidence ev where ev.vaccine_entry_id=e.id
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
begin
  if uid is null then
    return jsonb_build_object('ok',false,'error','not_authenticated');
  end if;

  if p_decision not in ('verificado','requiere_aclaracion','rechazado') then
    return jsonb_build_object('ok',false,'error','invalid_decision');
  end if;

  select e.* into ent from public.family_vaccine_entries e
  where e.id=p_entry_id limit 1 for update;

  if not found then
    return jsonb_build_object('ok',false,'error','entry_not_found');
  end if;

  select fl.* into linkrow from public.family_links fl
  where fl.family_member_id=ent.family_member_id and fl.status='aprobado'
  order by fl.approved_at desc nulls last, fl.requested_at desc limit 1;

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

  old_status := ent.verification_status;

  update public.family_vaccine_entries
  set verification_status=p_decision,
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
    'reviewed_at',now()
  );
end;
$$;

revoke all on function public.family_professional_review_queue(text) from public;
revoke execute on function public.family_professional_review_queue(text) from anon;
grant execute on function public.family_professional_review_queue(text) to authenticated;

revoke all on function public.family_professional_review_entry(uuid,text,text) from public;
revoke execute on function public.family_professional_review_entry(uuid,text,text) from anon;
grant execute on function public.family_professional_review_entry(uuid,text,text) to authenticated;
