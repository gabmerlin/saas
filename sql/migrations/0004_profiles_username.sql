-- sql/migrations/0004_profiles_username.sql
alter table public.profiles add column if not exists username text unique;
-- on remplit depuis raw_user_meta_data si présent
update public.profiles p
set username = coalesce(p.username, nullif((select raw_user_meta_data->>'username' from auth.users u where u.id = p.id), ''));
