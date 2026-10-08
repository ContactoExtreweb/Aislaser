-- =====================================================================
--  AISLASER · Migración 004: galería de obras de la web
--  Las obras y sus fotos se gestionan desde el panel (/panel/obras) y la web
--  muestra sólo lo publicado, sin volver a desplegar (como la galería de IMTEX).
--  Idempotente: se puede ejecutar varias veces.
-- =====================================================================

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
-- Sin política de update: las fotos no se sobrescriben, así que se cachean un año.
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
