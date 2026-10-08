-- =====================================================================
--  AISLASER · Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecutar completo en: Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede volver a ejecutar sin romper nada.
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
