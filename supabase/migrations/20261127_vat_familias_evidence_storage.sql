-- VAT Familias private evidence storage
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('family-evidence','family-evidence',false,8388608,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "family_evidence_upload_own_folder" on storage.objects;
create policy "family_evidence_upload_own_folder" on storage.objects for insert to authenticated
with check (bucket_id='family-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "family_evidence_read_own_folder" on storage.objects;
create policy "family_evidence_read_own_folder" on storage.objects for select to authenticated
using (bucket_id='family-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "family_evidence_delete_own_folder" on storage.objects;
create policy "family_evidence_delete_own_folder" on storage.objects for delete to authenticated
using (bucket_id='family-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "family_evidence_professional_read" on storage.objects;
create policy "family_evidence_professional_read" on storage.objects for select to authenticated
using (
 bucket_id='family-evidence' and exists (
  select 1 from public.family_evidence fe
  join public.family_vaccine_entries e on e.id=fe.vaccine_entry_id
  join public.family_links fl on fl.family_member_id=e.family_member_id and fl.status='aprobado'
  where fe.storage_path=storage.objects.name and (
    exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active=true and p.unit_id=fl.unit_id)
    or exists(select 1 from public.user_unit_memberships m where m.user_id=(select auth.uid()) and m.unit_id=fl.unit_id and m.active=true)
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active=true and p.role='administrador')
  )
 )
);