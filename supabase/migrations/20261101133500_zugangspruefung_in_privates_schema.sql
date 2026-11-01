-- Prüffunktion aus der öffentlichen API nehmen
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function private.is_allowed() from public, anon;
grant execute on function private.is_allowed() to authenticated;

drop policy "nur wir" on public.docs;
create policy "nur wir" on public.docs for all to authenticated
  using ((select private.is_allowed())) with check ((select private.is_allowed()));
drop policy "nur wir lesen" on public.docs_history;
create policy "nur wir lesen" on public.docs_history for select to authenticated
  using ((select private.is_allowed()));
drop policy "bilder lesen" on storage.objects;
drop policy "bilder hochladen" on storage.objects;
drop policy "bilder ändern" on storage.objects;
drop policy "bilder löschen" on storage.objects;
create policy "bilder lesen" on storage.objects for select to authenticated
  using (bucket_id = 'bilder' and (select private.is_allowed()));
create policy "bilder hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'bilder' and (select private.is_allowed()));
create policy "bilder ändern" on storage.objects for update to authenticated
  using (bucket_id = 'bilder' and (select private.is_allowed()));
create policy "bilder löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'bilder' and (select private.is_allowed()));
drop function public.is_allowed();

-- Hilfsfunktion von Supabase (Event-Trigger) nicht über die API aufrufbar
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
