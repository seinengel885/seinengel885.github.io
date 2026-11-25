-- tools/backup.mjs sichert mit dem Secret Key (Rolle service_role) auch den Verlauf der letzten 90 Tage.
grant select on public.docs_history to service_role;
