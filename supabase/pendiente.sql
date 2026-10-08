-- =====================================================================
--  AISLASER · Script completo de la base de datos (repara lo que falte)
--  Tu base de datos se quedó a medias: tablas creadas pero sin las reglas
--  de acceso de informes/fotos, sin mensajes y sin almacenes de imágenes.
--  Este archivo lo crea o repara TODO y se puede ejecutar varias veces.
--  Supabase → SQL Editor → "+ New query" → pegar TODO → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Administradores del panel
--    Solo los usuarios que estén en esta tabla pueden entrar al panel.
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin_users: ver" on public.admin_users;
create policy "admin_users: ver" on public.admin_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Utilidad: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Dosieres
-- ---------------------------------------------------------------------
create table if not exists public.dossiers (
  id               uuid primary key default gen_random_uuid(),
  title            text not null default 'Nuevo dosier',
  subtitle         text not null default '',
  client_name      text not null default '',
  location         text not null default '',
  work_date        date,
  reference        text not null default '',
  intro            text not null default '',          -- HTML del editor
  cover_image_path text,                               -- ruta en Storage
  status           text not null default 'borrador'
                   check (status in ('borrador', 'terminado')),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists dossiers_updated_at on public.dossiers;
create trigger dossiers_updated_at
  before update on public.dossiers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Puntos del dosier (1., 2., 3. ...)
-- ---------------------------------------------------------------------
create table if not exists public.dossier_points (
  id           uuid primary key default gen_random_uuid(),
  dossier_id   uuid not null references public.dossiers (id) on delete cascade,
  position     integer not null default 0,
  title        text not null default '',
  body         text not null default '',               -- HTML del editor
  image_layout text not null default 'grid-2'
               check (image_layout in ('grid-1', 'grid-2', 'grid-3')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dossier_points_dossier_idx
  on public.dossier_points (dossier_id, position);

drop trigger if exists dossier_points_updated_at on public.dossier_points;
create trigger dossier_points_updated_at
  before update on public.dossier_points
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Imágenes de cada punto
-- ---------------------------------------------------------------------
create table if not exists public.dossier_images (
  id           uuid primary key default gen_random_uuid(),
  dossier_id   uuid not null references public.dossiers (id) on delete cascade,
  point_id     uuid not null references public.dossier_points (id) on delete cascade,
  storage_path text not null,
  caption      text not null default '',
  position     integer not null default 0,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now()
);

create index if not exists dossier_images_point_idx
  on public.dossier_images (point_id, position);
create index if not exists dossier_images_dossier_idx
  on public.dossier_images (dossier_id);

-- Cualquier cambio en puntos o imágenes actualiza la fecha del dosier
create or replace function public.touch_dossier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dossiers
     set updated_at = now()
   where id = coalesce(new.dossier_id, old.dossier_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists dossier_points_touch on public.dossier_points;
create trigger dossier_points_touch
  after insert or update or delete on public.dossier_points
  for each row execute function public.touch_dossier();

drop trigger if exists dossier_images_touch on public.dossier_images;
create trigger dossier_images_touch
  after insert or update or delete on public.dossier_images
  for each row execute function public.touch_dossier();

-- RLS: solo administradores
alter table public.dossiers       enable row level security;
alter table public.dossier_points enable row level security;
alter table public.dossier_images enable row level security;

drop policy if exists "dossiers: admins" on public.dossiers;
create policy "dossiers: admins" on public.dossiers
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "dossier_points: admins" on public.dossier_points;
create policy "dossier_points: admins" on public.dossier_points
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "dossier_images: admins" on public.dossier_images;
create policy "dossier_images: admins" on public.dossier_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

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

-- =====================================================================
-- Migración 002 incluida (formato informe, sello y firma).
-- En una instalación nueva basta con ejecutar este archivo; en una
-- instalación que ya tenía el esquema, ejecutar migrations/002_informe_y_firma.sql
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

-- ---------------------------------------------------------------------
-- Migración 003 incluida: protección de los mensajes del formulario
-- ---------------------------------------------------------------------
-- Sólo se pueden enviar estos campos; id, fecha y "leído" los pone la base de datos
revoke insert on public.contact_messages from anon, authenticated;
grant insert (name, phone, email, service, message) on public.contact_messages to anon, authenticated;

-- Email con formato válido y sin caracteres que permitan manipular un enlace mailto:
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contact_messages_email_format') then
    alter table public.contact_messages
      add constraint contact_messages_email_format
      check (email ~* '^[^[:space:]@?&%=<>"'',;:()\\]+@[^[:space:]@?&%=<>"'',;:()\\]+\.[a-z]{2,}$') not valid;
  end if;
end $$;

-- Valores forzados y tope anti-spam (20 mensajes cada 10 minutos en total)
create or replace function public.contact_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  new.is_read := false;
  if (select count(*) from public.contact_messages where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Demasiados mensajes en poco tiempo. Inténtalo más tarde.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists contact_messages_guard on public.contact_messages;
create trigger contact_messages_guard
  before insert on public.contact_messages
  for each row execute function public.contact_messages_guard();

-- ---------------------------------------------------------------------
-- Migración 004 incluida: galería de obras de la web (se gestiona en /panel/obras)
-- ---------------------------------------------------------------------
create table if not exists public.web_obras (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo      text not null check (char_length(titulo) between 1 and 160),
  ubicacion   text not null default '' check (char_length(ubicacion) <= 160),
  anio        text not null default '' check (char_length(anio) <= 20),   -- «2025» o «2017-2024»
  sector      text check (sector in ('infraestructuras', 'industria', 'edificacion', 'piscinas', 'residencial', 'tecnicas')),
  servicios   text[] not null default '{}',                               -- slugs de servicios relacionados
  resumen     text not null default '' check (char_length(resumen) <= 400),
  descripcion text not null default '' check (char_length(descripcion) <= 5000),
  destacada   boolean not null default false,                             -- sale en la portada
  publicada   boolean not null default false,
  orden       integer not null default 0,                                 -- orden en el listado (menor primero)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  -- No se publica sin sector
  constraint web_obras_publicar_con_sector check (not publicada or sector is not null),
  constraint web_obras_servicios_validos check (
    servicios <@ array['poliurea', 'poliuretano', 'aislamientos', 'taladro-y-corte-de-hormigon',
                       'refuerzo-de-estructuras', 'anclajes-inyecciones-y-chorreado']::text[]
  )
);

create index if not exists web_obras_publicada_idx on public.web_obras (publicada, orden);

create table if not exists public.web_fotos (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.web_obras (id) on delete cascade,
  storage_path text not null unique,          -- ruta en el bucket «galeria»
  alt          text not null default '' check (char_length(alt) <= 200),
  ancho        integer not null check (ancho > 0),
  alto         integer not null check (alto > 0),
  orden        integer not null default 0,    -- la primera foto es la portada
  created_at   timestamptz not null default now(),
  created_by   uuid default auth.uid()
);

create index if not exists web_fotos_obra_idx on public.web_fotos (obra_id, orden);

drop trigger if exists web_obras_updated_at on public.web_obras;
create trigger web_obras_updated_at
  before update on public.web_obras
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: los visitantes sólo leen lo publicado; el panel (admin) lo gestiona todo
-- ---------------------------------------------------------------------
alter table public.web_obras enable row level security;
alter table public.web_fotos enable row level security;

drop policy if exists "web_obras: publicas" on public.web_obras;
create policy "web_obras: publicas" on public.web_obras
  for select to anon, authenticated
  using (publicada);

drop policy if exists "web_obras: admins" on public.web_obras;
create policy "web_obras: admins" on public.web_obras
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "web_fotos: publicas" on public.web_fotos;
create policy "web_fotos: publicas" on public.web_fotos
  for select to anon, authenticated
  using (exists (select 1 from public.web_obras o where o.id = web_fotos.obra_id and o.publicada));

drop policy if exists "web_fotos: admins" on public.web_fotos;
create policy "web_fotos: admins" on public.web_fotos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Storage: bucket público «galeria» (las fotos se sirven por URL sin sesión).
-- JPEG o WebP de hasta 5 MB (el panel las comprime antes de subirlas).
-- Sin política de update: las fotos no se sobrescriben nunca (cada una tiene su propia ruta).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "galeria: admins leen" on storage.objects;
create policy "galeria: admins leen" on storage.objects
  for select to authenticated
  using (bucket_id = 'galeria' and public.is_admin());

drop policy if exists "galeria: admins suben" on storage.objects;
create policy "galeria: admins suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'galeria' and public.is_admin());

drop policy if exists "galeria: admins borran" on storage.objects;
create policy "galeria: admins borran" on storage.objects
  for delete to authenticated
  using (bucket_id = 'galeria' and public.is_admin());

-- =====================================================================
--  COMPROBACIÓN FINAL (si no ves este resultado, el script no se pegó entero)
--  Debe mostrar:
--    tablas  → admin_users, app_settings, contact_messages, dossier_images, dossier_points, dossiers, web_fotos, web_obras
--    buckets → dossier-images (público), firmas (privado), galeria (público)
-- =====================================================================
select 'tablas' as comprobacion,
       string_agg(table_name::text, ', ' order by table_name) as encontrado
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('admin_users', 'dossiers', 'dossier_points', 'dossier_images', 'contact_messages', 'app_settings', 'web_obras', 'web_fotos')
union all
select 'buckets',
       string_agg(id || case when public then ' (público)' else ' (privado)' end, ', ' order by id)
  from storage.buckets
 where id in ('dossier-images', 'firmas', 'galeria');
-- FIN DEL SCRIPT
