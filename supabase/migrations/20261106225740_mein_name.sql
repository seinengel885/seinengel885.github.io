-- Anzeigename der angemeldeten Person aus public.allowed_users, damit keine Adressen im öffentlichen Code stehen.
create or replace function public.mein_name()
returns text language sql stable security definer set search_path = '' as $$
  select name from public.allowed_users where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
revoke all on function public.mein_name() from public, anon;
grant execute on function public.mein_name() to authenticated;
