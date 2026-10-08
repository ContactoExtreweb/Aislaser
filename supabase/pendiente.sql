-- =====================================================================
--  AISLASER · Lo que falta en tu base de datos (versión corta)
--  Mensajes del formulario, almacenes de imágenes, campos del informe,
--  sello y firma. Se puede ejecutar varias veces sin perder nada.
--  Supabase → SQL Editor → New query → pegar TODO → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6. Mensajes del formulario de contacto de la web
-- ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 200),
  phone      text not null check (char_length(phone) between 6 and 40),
  email      text not null check (char_length(email) between 3 and 200),
  service    text not null default '' check (char_length(service) <= 100),
  message    text not null default '' check (char_length(message) <= 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Cualquiera (la web pública) puede ENVIAR un mensaje, pero no leerlos
drop policy if exists "contact_messages: enviar" on public.contact_messages;
create policy "contact_messages: enviar" on public.contact_messages
  for insert to anon, authenticated
  with check (is_read = false);

drop policy if exists "contact_messages: admins" on public.contact_messages;
create policy "contact_messages: admins" on public.contact_messages
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Almacenamiento de imágenes (Storage)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dossier-images', 'dossier-images', true, 15728640,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dossier-images: admins leen" on storage.objects;
create policy "dossier-images: admins leen" on storage.objects
  for select to authenticated
  using (bucket_id = 'dossier-images' and public.is_admin());

drop policy if exists "dossier-images: admins suben" on storage.objects;
create policy "dossier-images: admins suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dossier-images' and public.is_admin());

drop policy if exists "dossier-images: admins modifican" on storage.objects;
create policy "dossier-images: admins modifican" on storage.objects
  for update to authenticated
  using (bucket_id = 'dossier-images' and public.is_admin());

drop policy if exists "dossier-images: admins borran" on storage.objects;
create policy "dossier-images: admins borran" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dossier-images' and public.is_admin());


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

-- =====================================================================
--  COMPROBACIÓN FINAL (si no ves este resultado, el script no se pegó entero)
--  Debe mostrar:
--    tablas  → admin_users, app_settings, contact_messages, dossier_images, dossier_points, dossiers
--    buckets → dossier-images (público), firmas (privado)
-- =====================================================================
select 'tablas' as comprobacion,
       string_agg(table_name::text, ', ' order by table_name) as encontrado
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('admin_users', 'dossiers', 'dossier_points', 'dossier_images', 'contact_messages', 'app_settings')
union all
select 'buckets',
       string_agg(id || case when public then ' (público)' else ' (privado)' end, ', ' order by id)
  from storage.buckets
 where id in ('dossier-images', 'firmas');
-- FIN DEL SCRIPT
