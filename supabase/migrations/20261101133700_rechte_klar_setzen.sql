revoke all on public.docs, public.docs_history, public.allowed_users from anon, authenticated;
grant select, insert, update, delete on public.docs to authenticated;
grant select on public.docs_history to authenticated;
