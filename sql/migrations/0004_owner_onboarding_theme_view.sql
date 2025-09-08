-- ================================
-- 0004_owner_onboarding_theme_view.sql
-- Aligné sur 0001/0002/0003 fournis par toi
-- ================================

-- 1) Garde-fous optionnels sur theme JSONB (non bloquants)
--    -> Pas de contrainte hard, on laisse l’API garantir la forme.

-- 2) Vue utilitaire: domain -> tenant + theme
create or replace view public.v_tenant_by_domain as
select
  td.domain,
  td.is_primary,
  t.id as tenant_id,
  t.name,
  t.subdomain,
  t.locale,
  t.theme,
  t.created_at,
  t.updated_at
from public.tenant_domains td
join public.tenants t on t.id = td.tenant_id;

-- 3) Sécurité: lecture via invoker (RLS sur tables sous-jacentes)
alter view public.v_tenant_by_domain set (security_invoker = on);

-- 4) Index(s) de confort si absents (non destructif)
create index if not exists idx_tenants_updated_at on public.tenants(updated_at);
