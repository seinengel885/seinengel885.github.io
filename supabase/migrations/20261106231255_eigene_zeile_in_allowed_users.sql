-- Jede angemeldete Person darf ihre eigene Zeile in allowed_users lesen (Anzeigename); ersetzt die Funktion mein_name.
grant select (email, name) on public.allowed_users to authenticated;
create policy "eigene zeile lesen" on public.allowed_users for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
drop function public.mein_name();
