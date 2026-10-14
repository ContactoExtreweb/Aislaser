-- =====================================================================
--  AISLASER · Migración 006: numeración de presupuestos que nunca retrocede
--  Antes, el número era «el mayor que queda + 1»: si se borraba el último
--  presupuesto, el siguiente repetía su número. Ahora un contador por año
--  lo impide (dos PDF distintos nunca llevarán el mismo «Nº»).
--  Idempotente: se puede ejecutar varias veces.
-- =====================================================================

create table if not exists public.presupuesto_contadores (
  anio   integer primary key,
  ultimo integer not null default 0
);

-- Sin políticas: sólo lo usa la función de numeración (que se ejecuta como su propietario)
alter table public.presupuesto_contadores enable row level security;

-- Arranca desde los números ya usados
insert into public.presupuesto_contadores (anio, ultimo)
select anio, max(numero) from public.presupuestos group by anio
on conflict (anio) do update set ultimo = greatest(public.presupuesto_contadores.ultimo, excluded.ultimo);

create or replace function public.numerar_presupuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.anio := extract(year from coalesce(new.fecha, (now() at time zone 'Europe/Madrid')::date))::integer;
  -- La fila del año queda bloqueada hasta el final de la transacción: dos altas a la vez no comparten número
  insert into public.presupuesto_contadores as c (anio, ultimo)
  values (new.anio, coalesce((select max(numero) from public.presupuestos where anio = new.anio), 0) + 1)
  on conflict (anio) do update set ultimo = c.ultimo + 1
  returning ultimo into new.numero;
  return new;
end;
$$;
