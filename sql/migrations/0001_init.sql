-- ================================
-- 0001_init.sql  (Multi-tenant + RLS)
-- ================================

-- Extensions utiles
create extension if not exists pgcrypto;

-- 1) TENANTS (agences)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique check (subdomain ~ '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'),
  locale text not null default 'fr',
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenants_subdomain on public.tenants(subdomain);

-- 2) PROFILES (lié à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) USER_TENANTS (appartenance)
create table if not exists public.user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- 4) RBAC simple (roles / permissions / mapping)
create type public.role_key as enum ('owner','admin','manager','employee','marketing');

create table if not exists public.roles (
  id bigserial primary key,
  key role_key not null unique,
  description text
);

create table if not exists public.permissions (
  id bigserial primary key,
  code text not null unique,
  description text
);

create table if not exists public.role_permissions (
  role_id bigint references public.roles(id) on delete cascade,
  permission_id bigint references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete cascade,
  primary key (user_id, tenant_id, role_id)
);

-- 5) Helpers
create or replace function public.current_user_id()
returns uuid language sql stable as $$
  select auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_tenants_updated on public.tenants;
create trigger trg_tenants_updated
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

-- 6) Auto-profile à la création d'un user auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), null)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 7) RLS stricte
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.user_tenants enable row level security;
alter table public.user_roles enable row level security;

-- Tenants: SELECT réservé aux membres du tenant.
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = tenants.id and ut.user_id = public.current_user_id()
  )
);

-- UPDATE réservé owner/admin du tenant
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = tenants.id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- (Pas de policy INSERT/DELETE: réservé au service role via API serveur)

-- Profiles: chacun lit/édit son profil
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (id = public.current_user_id());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert with check (id = public.current_user_id());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (id = public.current_user_id());

-- user_tenants: visibles par l'utilisateur lui-même
drop policy if exists user_tenants_select on public.user_tenants;
create policy user_tenants_select on public.user_tenants
for select using (user_id = public.current_user_id());

-- user_roles: visibles par l'utilisateur lui-même
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
for select using (user_id = public.current_user_id());

-- 8) Seeds de base
insert into public.roles (key, description) values
  ('owner','Tenant Owner'),
  ('admin','Administrator'),
  ('manager','Manager'),
  ('employee','Employee'),
  ('marketing','Marketing')
on conflict do nothing;

insert into public.permissions (code, description) values
  ('dashboard.view','View dashboard'),
  ('users.invite','Invite users'),
  ('billing.manage','Manage billing'),
  ('shifts.edit','Edit shifts'),
  ('models.edit','Edit models'),
  ('marketing.ig.connect','Connect Instagram')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('dashboard.view','users.invite','billing.manage','shifts.edit','models.edit','marketing.ig.connect')
where r.key in ('owner','admin')
on conflict do nothing;

-- 9) RPC sécurisé: resolve tenant depuis subdomain
create or replace function public.tenant_id_by_subdomain(p_subdomain text)
returns table (id uuid, subdomain text, name text, locale text)
language sql
security definer
set search_path = public
as $$
  select t.id, t.subdomain, t.name, t.locale
  from public.tenants t
  where t.subdomain = p_subdomain
  limit 1;
$$;

-- Autoriser l'exécution à anon et authenticated
revoke all on function public.tenant_id_by_subdomain(text) from public;
grant execute on function public.tenant_id_by_subdomain(text) to anon, authenticated;
