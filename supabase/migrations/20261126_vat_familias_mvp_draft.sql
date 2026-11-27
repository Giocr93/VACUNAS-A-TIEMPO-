-- VAT Familias MVP
-- BORRADOR DE MIGRACION: no aplicar a produccion hasta validar interfaz y flujo.
-- Objetivo: permitir cuentas familiares, hijos/dependientes, captura de antecedentes
-- de vacunacion por la familia, evidencia y vinculacion/verificacion profesional.

create table if not exists public.family_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_account_id uuid not null references public.family_accounts(id) on delete cascade,
  linked_patient_id uuid references public.patients(id) on delete set null,
  full_name text not null,
  curp text,
  birth_date date,
  sex text,
  relationship_to_account text not null default 'hijo',
  guardian_name text,
  notes text,
  link_status text not null default 'independiente'
    check (link_status in ('independiente','solicitado','vinculado','desvinculado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists family_members_account_curp_uidx
  on public.family_members(family_account_id, upper(curp))
  where curp is not null and btrim(curp) <> '';

create table if not exists public.family_vaccine_entries (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  vaccine_code text not null,
  dose_code text,
  application_date date,
  lot_number text,
  manufacturer text,
  institution_name text,
  notes text,
  source text not null default 'familia'
    check (source in ('familia','portal_importado','profesional')),
  verification_status text not null default 'capturado_familia'
    check (verification_status in (
      'capturado_familia',
      'pendiente_verificacion',
      'verificado',
      'rechazado',
      'requiere_aclaracion'
    )),
  linked_vaccination_id uuid references public.vaccinations(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  verification_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_vaccine_entries_member_idx
  on public.family_vaccine_entries(family_member_id, application_date desc);

create index if not exists family_vaccine_entries_verification_idx
  on public.family_vaccine_entries(verification_status);

create table if not exists public.family_evidence (
  id uuid primary key default gen_random_uuid(),
  vaccine_entry_id uuid not null references public.family_vaccine_entries(id) on delete cascade,
  storage_bucket text not null default 'family-evidence',
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint,
  sha256 text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete restrict,
  patient_record_id text not null,
  link_method text not null default 'qr'
    check (link_method in ('qr','folio','curp','manual_profesional')),
  status text not null default 'pendiente'
    check (status in ('pendiente','aprobado','rechazado','revocado')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  notes text
);

create unique index if not exists family_links_active_member_record_uidx
  on public.family_links(family_member_id, unit_id, patient_record_id)
  where status in ('pendiente','aprobado');

alter table public.family_accounts enable row level security;
alter table public.family_members enable row level security;
alter table public.family_vaccine_entries enable row level security;
alter table public.family_evidence enable row level security;
alter table public.family_links enable row level security;

-- La familia solo ve/modifica su propio espacio.
create policy "family_accounts_owner_select"
on public.family_accounts for select
using (user_id = auth.uid());

create policy "family_accounts_owner_insert"
on public.family_accounts for insert
with check (user_id = auth.uid());

create policy "family_accounts_owner_update"
on public.family_accounts for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "family_members_owner_all"
on public.family_members for all
using (
  exists (
    select 1 from public.family_accounts fa
    where fa.id = family_members.family_account_id
      and fa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.family_accounts fa
    where fa.id = family_members.family_account_id
      and fa.user_id = auth.uid()
  )
);

create policy "family_vaccine_entries_owner_select"
on public.family_vaccine_entries for select
using (
  exists (
    select 1
    from public.family_members fm
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fm.id = family_vaccine_entries.family_member_id
      and fa.user_id = auth.uid()
  )
);

create policy "family_vaccine_entries_owner_insert"
on public.family_vaccine_entries for insert
with check (
  created_by = auth.uid()
  and verification_status in ('capturado_familia','pendiente_verificacion')
  and linked_vaccination_id is null
  and verified_by is null
  and exists (
    select 1
    from public.family_members fm
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fm.id = family_vaccine_entries.family_member_id
      and fa.user_id = auth.uid()
  )
);

create policy "family_vaccine_entries_owner_update_unverified"
on public.family_vaccine_entries for update
using (
  verification_status in ('capturado_familia','pendiente_verificacion','requiere_aclaracion')
  and exists (
    select 1
    from public.family_members fm
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fm.id = family_vaccine_entries.family_member_id
      and fa.user_id = auth.uid()
  )
)
with check (
  verification_status in ('capturado_familia','pendiente_verificacion','requiere_aclaracion')
  and linked_vaccination_id is null
  and verified_by is null
);

create policy "family_evidence_owner_all"
on public.family_evidence for all
using (
  exists (
    select 1
    from public.family_vaccine_entries fve
    join public.family_members fm on fm.id = fve.family_member_id
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fve.id = family_evidence.vaccine_entry_id
      and fa.user_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.family_vaccine_entries fve
    join public.family_members fm on fm.id = fve.family_member_id
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fve.id = family_evidence.vaccine_entry_id
      and fa.user_id = auth.uid()
  )
);

create policy "family_links_owner_select"
on public.family_links for select
using (
  exists (
    select 1
    from public.family_members fm
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fm.id = family_links.family_member_id
      and fa.user_id = auth.uid()
  )
);

create policy "family_links_owner_insert"
on public.family_links for insert
with check (
  requested_by = auth.uid()
  and status = 'pendiente'
  and exists (
    select 1
    from public.family_members fm
    join public.family_accounts fa on fa.id = fm.family_account_id
    where fm.id = family_links.family_member_id
      and fa.user_id = auth.uid()
  )
);

comment on table public.family_vaccine_entries is
'Antecedentes de vacunacion capturados por familias. Nunca sustituyen automaticamente public.vaccinations; requieren verificacion profesional para vincularse.';


-- Vincula un integrante familiar a un acceso existente del Portal Familiar.
-- No crea ni duplica pacientes; conserva unit_id + patient_record_id como identidad
-- compatible con la arquitectura actual basada en sync_records.
create or replace function public.family_app_link_from_portal(
  p_family_member_id uuid,
  p_folio text,
  p_token text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.family_accounts%rowtype;
  member public.family_members%rowtype;
  fa public.family_portal_access%rowtype;
  pr public.sync_records%rowtype;
  cp public.patients%rowtype;
  link_id uuid;
  patient_name text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok',false,'error','not_authenticated');
  end if;

  select fm.* into member
  from public.family_members fm
  join public.family_accounts a on a.id=fm.family_account_id
  where fm.id=p_family_member_id and a.user_id=auth.uid()
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','member_not_found');
  end if;

  if coalesce(length(trim(p_folio)),0) < 4 or coalesce(length(trim(p_token)),0) < 4 then
    return jsonb_build_object('ok',false,'error','invalid_credentials');
  end if;

  select a.* into fa
  from public.family_portal_access a
  where a.active=true
    and upper(a.folio)=upper(trim(p_folio))
    and (a.access_token=trim(p_token) or coalesce(a.access_code,'')=trim(p_token))
  order by a.updated_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','not_found');
  end if;

  select * into pr
  from public.sync_records r
  where r.unit_id=fa.unit_id
    and r.entity='patients'
    and r.record_id=fa.patient_record_id
    and r.deleted=false
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'error','patient_not_found');
  end if;

  select * into cp
  from public.patients p
  where p.unit_id=fa.unit_id
    and p.local_id=fa.patient_record_id
    and p.deleted=false
  limit 1;

  patient_name := trim(concat_ws(' ',
    coalesce(pr.payload->>'name', cp.first_name),
    coalesce(pr.payload->>'pat', cp.paternal_surname),
    coalesce(pr.payload->>'mat', cp.maternal_surname)
  ));

  insert into public.family_links(
    family_member_id, patient_id, unit_id, patient_record_id,
    link_method, status, requested_by, approved_by, requested_at, approved_at
  ) values (
    member.id, cp.id, fa.unit_id, fa.patient_record_id,
    'qr', 'aprobado', auth.uid(), auth.uid(), now(), now()
  )
  on conflict (family_member_id, unit_id, patient_record_id)
    where status in ('pendiente','aprobado')
  do update set
    status='aprobado',
    approved_by=auth.uid(),
    approved_at=now()
  returning id into link_id;

  update public.family_members
  set linked_patient_id=coalesce(cp.id, linked_patient_id),
      link_status='vinculado',
      updated_at=now()
  where id=member.id;

  return jsonb_build_object(
    'ok',true,
    'link_id',link_id,
    'unit_id',fa.unit_id,
    'patient_record_id',fa.patient_record_id,
    'patient_id',cp.id,
    'patient_name',patient_name,
    'folio',fa.folio
  );
end;
$$;

revoke all on function public.family_app_link_from_portal(uuid,text,text) from public;
revoke execute on function public.family_app_link_from_portal(uuid,text,text) from anon;
grant execute on function public.family_app_link_from_portal(uuid,text,text) to authenticated;
