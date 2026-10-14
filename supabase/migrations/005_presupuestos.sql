-- =====================================================================
--  AISLASER · Migración 005: presupuestos y servicio de insuflado
--  · Presupuestos del panel (/panel/presupuestos) con sus partidas.
--    Numeración automática por año: 2026-001, 2026-002…
--  · Condiciones por defecto de los presupuestos, en Ajustes.
--  · «insuflado» pasa a ser un servicio válido para las obras de la web.
--  Idempotente: se puede ejecutar varias veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Presupuestos
-- ---------------------------------------------------------------------
create table if not exists public.presupuestos (
  id                uuid primary key default gen_random_uuid(),
  anio              integer not null,                       -- lo pone la base de datos al crearlo
  numero            integer not null,                       -- correlativo dentro del año
  estado            text not null default 'borrador' check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado')),
  fecha             date not null default (now() at time zone 'Europe/Madrid')::date,
  validez_dias      integer not null default 30 check (validez_dias between 1 and 365),
  cliente_nombre    text not null default '' check (char_length(cliente_nombre) <= 200),
  cliente_nif       text not null default '' check (char_length(cliente_nif) <= 30),
  cliente_direccion text not null default '' check (char_length(cliente_direccion) <= 300),
  cliente_email     text not null default '' check (char_length(cliente_email) <= 200),
  cliente_telefono  text not null default '' check (char_length(cliente_telefono) <= 40),
  atencion          text not null default '' check (char_length(atencion) <= 200),   -- «A/A»
  obra              text not null default '' check (char_length(obra) <= 300),       -- asunto del presupuesto
  ubicacion         text not null default '' check (char_length(ubicacion) <= 200),
  introduccion      text not null default '' check (char_length(introduccion) <= 5000),
  condiciones       text not null default '' check (char_length(condiciones) <= 8000),
  notas_internas    text not null default '' check (char_length(notas_internas) <= 5000),  -- no salen en el documento
  iva               numeric(5, 2) not null default 21 check (iva between 0 and 100),
  descuento         numeric(5, 2) not null default 0 check (descuento between 0 and 100),
  mostrar_firma     boolean not null default true,
  mensaje_id        uuid references public.contact_messages (id) on delete set null,  -- solicitud de la web de la que sale
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid default auth.uid(),
  constraint presupuestos_numero_unico unique (anio, numero)
);

create index if not exists presupuestos_fecha_idx on public.presupuestos (anio desc, numero desc);

-- Número correlativo por año, asignado al crear (nunca cambia después)
create or replace function public.numerar_presupuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.anio := extract(year from coalesce(new.fecha, (now() at time zone 'Europe/Madrid')::date))::integer;
  -- Un candado por año evita que dos presupuestos creados a la vez reciban el mismo número
  perform pg_advisory_xact_lock(hashtext('presupuestos-' || new.anio));
  select coalesce(max(numero), 0) + 1 into new.numero from public.presupuestos where anio = new.anio;
  return new;
end;
$$;

drop trigger if exists presupuestos_numerar on public.presupuestos;
create trigger presupuestos_numerar
  before insert on public.presupuestos
  for each row execute function public.numerar_presupuesto();

-- El número y el año no se pueden cambiar a mano
create or replace function public.proteger_numero_presupuesto()
returns trigger
language plpgsql
as $$
begin
  new.anio := old.anio;
  new.numero := old.numero;
  return new;
end;
$$;

drop trigger if exists presupuestos_proteger_numero on public.presupuestos;
create trigger presupuestos_proteger_numero
  before update on public.presupuestos
  for each row execute function public.proteger_numero_presupuesto();

drop trigger if exists presupuestos_updated_at on public.presupuestos;
create trigger presupuestos_updated_at
  before update on public.presupuestos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Partidas (líneas) de cada presupuesto. «capitulo» es un título que agrupa
--    las partidas que van debajo, hasta el siguiente capítulo.
-- ---------------------------------------------------------------------
create table if not exists public.presupuesto_partidas (
  id             uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos (id) on delete cascade,
  orden          integer not null default 0,
  tipo           text not null default 'partida' check (tipo in ('partida', 'capitulo')),
  descripcion    text not null default '' check (char_length(descripcion) <= 2000),
  unidad         text not null default 'm²' check (char_length(unidad) <= 20),
  cantidad       numeric(12, 3) not null default 1 check (abs(cantidad) < 1000000000),
  precio         numeric(12, 2) not null default 0 check (abs(precio) < 1000000000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists presupuesto_partidas_idx on public.presupuesto_partidas (presupuesto_id, orden);

drop trigger if exists presupuesto_partidas_updated_at on public.presupuesto_partidas;
create trigger presupuesto_partidas_updated_at
  before update on public.presupuesto_partidas
  for each row execute function public.set_updated_at();

-- Cualquier cambio en las partidas actualiza la fecha del presupuesto
create or replace function public.touch_presupuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.presupuestos
     set updated_at = now()
   where id = coalesce(new.presupuesto_id, old.presupuesto_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists presupuesto_partidas_touch on public.presupuesto_partidas;
create trigger presupuesto_partidas_touch
  after insert or update or delete on public.presupuesto_partidas
  for each row execute function public.touch_presupuesto();

-- ---------------------------------------------------------------------
-- 3. RLS: sólo administradores
-- ---------------------------------------------------------------------
alter table public.presupuestos enable row level security;
alter table public.presupuesto_partidas enable row level security;

drop policy if exists "presupuestos: admins" on public.presupuestos;
create policy "presupuestos: admins" on public.presupuestos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "presupuesto_partidas: admins" on public.presupuesto_partidas;
create policy "presupuesto_partidas: admins" on public.presupuesto_partidas
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Condiciones por defecto de los presupuestos (se editan en Ajustes)
-- ---------------------------------------------------------------------
alter table public.app_settings
  add column if not exists condiciones_presupuesto text not null default
    E'Forma de pago: 50 % al aceptar el presupuesto y el 50 % restante al terminar los trabajos, mediante transferencia bancaria.\n' ||
    E'Plazo de ejecución: a convenir, según la disponibilidad y las condiciones meteorológicas.\n' ||
    E'No incluye trabajos no descritos en este presupuesto, medios auxiliares especiales (andamios, grúas o plataformas) salvo que se indique, ni licencias o tasas municipales.\n' ||
    E'Cualquier trabajo adicional se presupuestará aparte.\n' ||
    E'Garantía: la indicada por el fabricante de los materiales y la que marca la normativa vigente.';

-- ---------------------------------------------------------------------
-- 5. Obras de la web: «insuflado» es un servicio válido
-- ---------------------------------------------------------------------
alter table public.web_obras drop constraint if exists web_obras_servicios_validos;
alter table public.web_obras add constraint web_obras_servicios_validos check (
  servicios <@ array['poliurea', 'poliuretano', 'aislamientos', 'insuflado', 'taladro-y-corte-de-hormigon',
                     'refuerzo-de-estructuras', 'anclajes-inyecciones-y-chorreado']::text[]
);
