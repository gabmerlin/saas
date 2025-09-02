-- ================================
-- 0002_tenant_domains.sql
-- ================================

-- 1) Table tenant_domains
create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null unique check (domain ~ '^[a-z0-9.-]+$'),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_domains_tenant_id on public.tenant_domains(tenant_id);

-- 2) RLS
alter table public.tenant_domains enable row level security;

-- Select: accessible aux membres du tenant
drop policy if exists tenant_domains_select on public.tenant_domains;
create policy tenant_domains_select on public.tenant_domains
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = tenant_domains.tenant_id
      and ut.user_id = public.current_user_id()
  )
);

-- Update: réservé owner/admin
drop policy if exists tenant_domains_update on public.tenant_domains;
create policy tenant_domains_update on public.tenant_domains
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = tenant_domains.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Insert/Delete: service role uniquement

-- 3) RPC pour resolve par domaine (wildcard)
create or replace function public.tenant_by_domain(p_domain text)
returns table (id uuid, subdomain text, name text, locale text)
language sql
security definer
set search_path = public
as $$
  select t.id, t.subdomain, t.name, t.locale
  from public.tenants t
  join public.tenant_domains td on td.tenant_id = t.id
  where td.domain = p_domain
  limit 1;
$$;

revoke all on function public.tenant_by_domain(text) from public;
grant execute on function public.tenant_by_domain(text) to anon, authenticated;
