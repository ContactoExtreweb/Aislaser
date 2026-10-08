-- =====================================================================
--  AISLASER · Migración 002: formato "Informe técnico", sello y firma
--  Ejecutar completo en: Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nuevos campos del dosier (cabecera del informe y cierre con firma)
-- ---------------------------------------------------------------------
alter table public.dossiers add column if not exists template       text    not null default 'informe';
alter table public.dossiers add column if not exists attention      text    not null default '';  -- "A/A del técnico"
alter table public.dossiers add column if not exists prepared_by    text    not null default 'TÉCNICOS DE AISLASER';
alter table public.dossiers add column if not exists issue_place    text    not null default 'Campanario';
alter table public.dossiers add column if not exists signer_name    text    not null default '';  -- vacío = el de Ajustes
alter table public.dossiers add column if not exists show_signature boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dossiers_template_check') then
    alter table public.dossiers
      add constraint dossiers_template_check check (template in ('informe', 'portada'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Ajustes de la empresa (una sola fila): firmante, sello y firma
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  id             integer primary key default 1 check (id = 1),
  signer_name    text not null default 'Isidro Calvo Gallego',
  signer_company text not null default 'AISLASER, C.B.',
  stamp_path     text,     -- imagen del sello (bucket privado "firmas")
  signature_path text,     -- imagen de la firma (bucket privado "firmas")
  updated_at     timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "app_settings: admins" on public.app_settings;
create policy "app_settings: admins" on public.app_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Storage
--    · dossier-images: fotos de los dosieres (lectura pública por URL)
--    · firmas: sello y firma, PRIVADO (sólo administradores, URLs firmadas)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dossier-images', 'dossier-images', true, 15728640,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('firmas', 'firmas', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "firmas: admins leen" on storage.objects;
create policy "firmas: admins leen" on storage.objects
  for select to authenticated
  using (bucket_id = 'firmas' and public.is_admin());

drop policy if exists "firmas: admins suben" on storage.objects;
create policy "firmas: admins suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'firmas' and public.is_admin());

drop policy if exists "firmas: admins modifican" on storage.objects;
create policy "firmas: admins modifican" on storage.objects
  for update to authenticated
  using (bucket_id = 'firmas' and public.is_admin());

drop policy if exists "firmas: admins borran" on storage.objects;
create policy "firmas: admins borran" on storage.objects
  for delete to authenticated
  using (bucket_id = 'firmas' and public.is_admin());

-- Comprobación: deben aparecer los dos buckets
select id, public from storage.buckets where id in ('dossier-images', 'firmas');
