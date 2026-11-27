-- VAT Familias: entrada segura al motor clínico + recordatorios

create table if not exists public.family_reminders (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  engine_rule_id text not null,
  vaccine_code text not null,
  dose_code text,
  target_date date,
  remind_days_before integer not null default 7 check (remind_days_before between 0 and 60),
  status text not null default 'activo' check (status in ('activo','completado','descartado')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.family_reminders_member_rule_target_uidx;
create unique index if not exists family_reminders_member_rule_target_uidx
  on public.family_reminders(family_member_id,engine_rule_id,target_date);

alter table public.family_reminders enable row level security;

drop policy if exists family_reminders_owner_select on public.family_reminders;
create policy family_reminders_owner_select on public.family_reminders
for select to authenticated
using (
  exists (
    select 1 from public.family_members fm
    join public.family_accounts fa on fa.id=fm.family_account_id
    where fm.id=family_reminders.family_member_id
      and fa.user_id=(select auth.uid())
  )
);

drop policy if exists family_reminders_owner_insert on public.family_reminders;
create policy family_reminders_owner_insert on public.family_reminders
for insert to authenticated
with check (
  created_by=(select auth.uid())
  and exists (
    select 1 from public.family_members fm
    join public.family_accounts fa on fa.id=fm.family_account_id
    where fm.id=family_reminders.family_member_id
      and fa.user_id=(select auth.uid())
  )
);

drop policy if exists family_reminders_owner_update on public.family_reminders;
create policy family_reminders_owner_update on public.family_reminders
for update to authenticated
using (
  exists (
    select 1 from public.family_members fm
    join public.family_accounts fa on fa.id=fm.family_account_id
    where fm.id=family_reminders.family_member_id
      and fa.user_id=(select auth.uid())
  )
)
with check (created_by=(select auth.uid()));

create or replace function public.family_member_schedule_input(
  p_family_member_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  fm public.family_members%rowtype;
  fl public.family_links%rowtype;
  pr public.sync_records%rowtype;
  professional_sync jsonb := '[]'::jsonb;
  professional_new jsonb := '[]'::jsonb;
  professional jsonb := '[]'::jsonb;
  verified_family jsonb := '[]'::jsonb;
  unverified_family jsonb := '[]'::jsonb;
  patient_key text;
  canonical_key text;
  patient_canonical_key text;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;

  select m.* into fm
  from public.family_members m
  join public.family_accounts a on a.id=m.family_account_id
  where m.id=p_family_member_id and a.user_id=uid
  limit 1;
  if not found then return jsonb_build_object('ok',false,'error','member_not_found'); end if;

  select l.* into fl
  from public.family_links l
  where l.family_member_id=fm.id and l.status='aprobado'
  order by l.approved_at desc nulls last, l.requested_at desc
  limit 1;

  if found then
    select r.* into pr
    from public.sync_records r
    where r.unit_id=fl.unit_id and r.entity='patients'
      and r.record_id=fl.patient_record_id and r.deleted=false
    limit 1;

    if found then
      patient_key := coalesce(nullif(pr.payload->>'id',''),pr.record_id);
      canonical_key := nullif(pr.payload->>'canonicalPatientId','');
      patient_canonical_key := nullif(pr.payload->>'patientCanonicalId','');

      select coalesce(jsonb_agg(jsonb_build_object(
        'id',r.record_id,'vaccine',r.payload->>'vaccine','dose',r.payload->>'dose',
        'date',r.payload->>'date','lot',r.payload->>'lot',
        'source','profesional','verification_status','profesional'
      ) order by coalesce(r.payload->>'date','') asc),'[]'::jsonb)
      into professional_sync
      from public.sync_records r
      where r.unit_id=fl.unit_id and r.entity='vaccinations' and r.deleted=false
        and (
          coalesce(r.payload->>'patientId','')=patient_key
          or coalesce(r.payload->>'globalPatientId','')=patient_key
          or (canonical_key is not null and r.payload->>'canonicalPatientId'=canonical_key)
          or (patient_canonical_key is not null and r.payload->>'patientCanonicalId'=patient_canonical_key)
        );
    end if;

    if fl.patient_id is not null then
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',v.id,'vaccine',v.vaccine_code,'dose',v.dose_code,'date',v.application_date,
        'lot',v.lot,'source','profesional','verification_status','profesional'
      ) order by v.application_date asc),'[]'::jsonb)
      into professional_new
      from public.vaccinations v
      where v.patient_id=fl.patient_id and v.deleted=false;
    end if;

    professional := professional_sync || professional_new;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'vaccine',e.vaccine_code,'dose',e.dose_code,'date',e.application_date,
    'lot',e.lot_number,'source','familia_verificada','verification_status',e.verification_status
  ) order by e.application_date asc nulls last),'[]'::jsonb)
  into verified_family
  from public.family_vaccine_entries e
  where e.family_member_id=fm.id and e.verification_status='verificado';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'vaccine',e.vaccine_code,'dose',e.dose_code,'date',e.application_date,
    'lot',e.lot_number,'source','familia','verification_status',e.verification_status
  ) order by e.application_date asc nulls last),'[]'::jsonb)
  into unverified_family
  from public.family_vaccine_entries e
  where e.family_member_id=fm.id
    and e.verification_status in ('capturado_familia','pendiente_verificacion','requiere_aclaracion');

  return jsonb_build_object(
    'ok',true,
    'member',jsonb_build_object(
      'id',fm.id,'name',fm.full_name,'birth_date',fm.birth_date,'sex',fm.sex,'link_status',fm.link_status
    ),
    'professional_vaccinations',professional,
    'verified_family_vaccinations',verified_family,
    'unverified_family_vaccinations',unverified_family
  );
end;
$$;

revoke all on function public.family_member_schedule_input(uuid) from public;
revoke execute on function public.family_member_schedule_input(uuid) from anon;
grant execute on function public.family_member_schedule_input(uuid) to authenticated;
