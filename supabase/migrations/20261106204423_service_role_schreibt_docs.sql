-- Importskripte (Secret Key, Rolle service_role) dürfen Inhalte in public.docs lesen und schreiben.
-- Der Verlauf entsteht weiter über den Trigger docs_track (security definer). Kein Löschrecht.
grant select, insert, update on public.docs to service_role;
