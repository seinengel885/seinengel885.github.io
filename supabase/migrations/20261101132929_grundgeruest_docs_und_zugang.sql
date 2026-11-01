-- Wer darf rein: nur diese Adressen (für Clients unsichtbar, RLS ohne Policies)
create table public.allowed_users (
  email text primary key check (email = lower(email)),
  name  text not null
);
alter table public.allowed_users enable row level security;
insert into public.allowed_users (email, name) values
  ('[Adresse entfernt]', 'Patrick'),
  ('[Adresse entfernt]', 'Kerstin');

create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- Neue Konten nur für erlaubte Adressen
create or replace function public.guard_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_users where email = lower(new.email)) then
    raise exception 'Registrierung nicht erlaubt';
  end if;
  return new;
end $$;
revoke all on function public.guard_signup() from public, anon, authenticated;
create trigger guard_signup before insert on auth.users
  for each row execute function public.guard_signup();

-- Dokumente aller Projekte: app trennt die Projekte, collection/id wie bisher im Artefakt
create table public.docs (
  app        text not null,
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (app, collection, id)
);
alter table public.docs enable row level security;
create policy "nur wir" on public.docs for all to authenticated
  using ((select public.is_allowed())) with check ((select public.is_allowed()));

-- Verlauf: jede Änderung und Löschung hebt den alten Stand auf
create table public.docs_history (
  hid        bigint generated always as identity primary key,
  app        text not null,
  collection text not null,
  id         text not null,
  data       jsonb not null,
  version    integer not null,
  op         text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid
);
create index docs_history_doc on public.docs_history (app, collection, id, changed_at desc);
alter table public.docs_history enable row level security;
create policy "nur wir lesen" on public.docs_history for select to authenticated
  using ((select public.is_allowed()));

create or replace function public.docs_track()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.data is not distinct from old.data then return new; end if;
    insert into public.docs_history (app, collection, id, data, version, op, changed_by)
      values (old.app, old.collection, old.id, old.data, old.version, 'update', auth.uid());
    new.version := old.version + 1;
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  else
    insert into public.docs_history (app, collection, id, data, version, op, changed_by)
      values (old.app, old.collection, old.id, old.data, old.version, 'delete', auth.uid());
    return old;
  end if;
end $$;
revoke all on function public.docs_track() from public, anon, authenticated;
create trigger docs_track before update or delete on public.docs
  for each row execute function public.docs_track();

-- Felder zusammenführen wie "update" im Artefakt (oberste Ebene)
create or replace function public.docs_merge(p_app text, p_collection text, p_id text, p_patch jsonb)
returns void language sql security invoker set search_path = '' as $$
  update public.docs set data = data || p_patch
  where app = p_app and collection = p_collection and id = p_id;
$$;
revoke all on function public.docs_merge(text, text, text, jsonb) from public, anon;
grant execute on function public.docs_merge(text, text, text, jsonb) to authenticated;

-- Live-Änderungen
alter publication supabase_realtime add table public.docs;

-- Fotos: privater Speicher
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('bilder', 'bilder', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy "bilder lesen" on storage.objects for select to authenticated
  using (bucket_id = 'bilder' and (select public.is_allowed()));
create policy "bilder hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'bilder' and (select public.is_allowed()));
create policy "bilder ändern" on storage.objects for update to authenticated
  using (bucket_id = 'bilder' and (select public.is_allowed()));
create policy "bilder löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'bilder' and (select public.is_allowed()));
