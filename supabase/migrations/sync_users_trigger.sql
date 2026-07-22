-- ============================================================================
-- Sync auth.users -> public."User"  (SubSync · Sprint 7)
-- ----------------------------------------------------------------------------
-- Da incollare nella dashboard Supabase (SQL Editor) ed eseguire una volta.
--
-- NOTA: la tabella utenti pubblica di questo progetto è `public."User"`, gestita
-- da Prisma (id text, email, "createdAt"). NON si crea `public.users`: sarebbe
-- una seconda tabella divergente che l'app non usa. Qui replichiamo ogni nuovo
-- utente di `auth.users` dentro `public."User"`, così il record esiste già al
-- momento della registrazione (l'upsert "pigro" lato app diventa superfluo).
-- ============================================================================

-- 1) Funzione: inserisce il nuovo utente auth nella tabella Prisma public."User".
--    SECURITY DEFINER + search_path fisso: eseguita coi privilegi del proprietario,
--    così il trigger su auth.users può scrivere in public."User".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."User" (id, email, "createdAt")
  values (
    new.id::text,                                    -- Prisma User.id è TEXT
    coalesce(new.email, new.id::text || '@subsync.local'),
    now()
  )
  on conflict (id) do nothing;                       -- idempotente
  return new;
end;
$$;

-- 2) Trigger: alla creazione di un utente in auth.users, popola public."User".
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- (Opzionale) Backfill degli utenti già presenti in auth.users ma non ancora
-- replicati in public."User":
--
-- insert into public."User" (id, email, "createdAt")
-- select u.id::text, coalesce(u.email, u.id::text || '@subsync.local'), now()
-- from auth.users u
-- on conflict (id) do nothing;
-- ============================================================================
