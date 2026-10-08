-- =====================================================================
--  AISLASER · Migración 003: proteger los mensajes del formulario
--  Evita que alguien se salte el formulario escribiendo directamente en
--  la base de datos (fechas falsas, marcar como leído, spam masivo).
--  Idempotente: se puede ejecutar varias veces.
-- =====================================================================

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
