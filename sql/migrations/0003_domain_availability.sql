-- ================================
-- 0003_domain_availability.sql
-- Compléments sur ton schéma actuel :
--  - Unicité insensible à la casse pour tenant_domains.domain
--  - Un seul domaine primaire par tenant
--  - RPC: domain_exists(p_domain), subdomain_exists(p_subdomain)
-- ================================

-- 1) Unicité insensible à la casse pour 'domain'
-- Si un unique existant gêne, on garde l'unique actuel ET on ajoute un unique fonctionnel.
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_tenant_domains_domain_lower'
  ) then
    execute 'create unique index ux_tenant_domains_domain_lower on public.tenant_domains ((lower(domain)))';
  end if;
end$$;

-- 2) Un seul domaine primaire par tenant (partiel sur is_primary = true)
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_tenant_primary_once'
  ) then
    execute 'create unique index ux_tenant_primary_once on public.tenant_domains (tenant_id) where is_primary';
  end if;
end$$;

-- 3) RPC: domain_exists(p_domain)
create or replace function public.domain_exists(p_domain text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_domains td
    where lower(td.domain) = lower(p_domain)
  );
$$;

revoke all on function public.domain_exists(text) from public;
grant execute on function public.domain_exists(text) to anon, authenticated;

-- 4) RPC: subdomain_exists(p_subdomain)
-- Vérifie collision directe sur tenants.subdomain (utile pour message "déjà pris" dès l'UI)
create or replace function public.subdomain_exists(p_subdomain text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenants t
    where lower(t.subdomain) = lower(p_subdomain)
  );
$$;

revoke all on function public.subdomain_exists(text) from public;
grant execute on function public.subdomain_exists(text) to anon, authenticated;
