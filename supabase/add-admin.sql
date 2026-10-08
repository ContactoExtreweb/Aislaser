-- =====================================================================
--  Dar acceso al panel a un usuario ya creado en Authentication → Users
--  Cambia el email y ejecuta en el SQL Editor.
-- =====================================================================
insert into public.admin_users (user_id, email, full_name)
select id, email, 'Aislaser'
from auth.users
where email = 'aislaser@aislaser.es'      -- <-- CAMBIAR
on conflict (user_id) do nothing;
