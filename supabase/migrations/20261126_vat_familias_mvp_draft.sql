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
  application_date date not null,
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
  patient_id uuid not null references public.patients(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
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

create unique index if not exists family_links_active_member_patient_uidx
  on public.family_links(family_member_id, patient_id)
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
