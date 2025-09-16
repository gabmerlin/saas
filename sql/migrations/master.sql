-- ================================
-- MASTER SQL COMPLET - QGChatting Platform
-- Next.js 15 + Supabase + Vercel + BTCPay + Instagram Marketing
-- ================================

-- Extensions utiles
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ================================
-- 1. STRUCTURE DE BASE (Multi-tenant + RLS)
-- ================================

-- 1.1 TENANTS (agences)
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

-- 1.2 PROFILES (lié à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.3 USER_TENANTS (appartenance)
create table if not exists public.user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- 1.4 RBAC (roles / permissions / mapping)
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

-- 1.5 TENANT_DOMAINS (sous-domaines)
create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null unique check (domain ~ '^[a-z0-9.-]+$'),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_domains_tenant_id on public.tenant_domains(tenant_id);
create unique index ux_tenant_domains_domain_lower on public.tenant_domains ((lower(domain)));
create unique index ux_tenant_primary_once on public.tenant_domains (tenant_id) where is_primary;

-- ================================
-- 2. CONFIGURATION AGENCE
-- ================================

-- 2.1 Configuration générale par agence
create table if not exists public.agency_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  locale_default text not null default 'fr',
  currency_display text not null default 'USD',
  enforce_verified_email boolean not null default true,
  suggest_2fa boolean not null default true,
  auto_approve_rules boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

-- 2.2 Shifts (templates éditables)
create table if not exists public.shift_template (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  start_minutes int not null check (start_minutes between 0 and 1440),
  end_minutes int not null check (end_minutes between 0 and 1440),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shift_template_tenant on public.shift_template(tenant_id);

-- 2.3 Capacité par shift (exceptions par jour)
create table if not exists public.shift_capacity (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shift_template_id uuid not null references public.shift_template(id) on delete cascade,
  date date,
  max_chatters int not null check (max_chatters >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_capacity_tenant on public.shift_capacity(tenant_id);
create index if not exists idx_shift_capacity_template on public.shift_capacity(shift_template_id);
create index if not exists idx_shift_capacity_date on public.shift_capacity(date);

-- 2.4 Strikes & assiduité
create table if not exists public.strike_policy (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  grace_minutes int not null default 0,
  late_fee_usd numeric(10,2) not null default 5.00,
  absence_fee_usd numeric(10,2) not null default 10.00,
  pool_top_count int not null default 5,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- 2.5 Paie
create table if not exists public.payroll_policy (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hourly_enabled boolean not null default false,
  hourly_usd numeric(10,2),
  revenue_share_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- 2.6 Contacts de facturation
create table if not exists public.billing_contact (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_contact_tenant on public.billing_contact(tenant_id);

-- 2.7 Invitations
create table if not exists public.invitation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text,
  role_key public.role_key not null,
  token text not null,
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_invitation_tenant on public.invitation(tenant_id);
create index if not exists idx_invitation_expires on public.invitation(expires_at);

-- 2.8 Telegram
create table if not exists public.telegram_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id text,
  daily_digest boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- 2.9 Compétition inter-agences
create table if not exists public.competition_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  opt_in boolean not null default false,
  alias text,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- 2.10 Instagram (switch global)
create table if not exists public.instagram_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- ================================
-- 3. GESTION DES EMPLOYÉS
-- ================================

-- 3.1 Fiche Employé (obligatoire)
create table if not exists public.employee_profile (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  telegram text,
  whatsapp text,
  nationality text,
  cni_file_path text, -- Storage path
  hire_date date not null default current_date,
  status text not null default 'active' check (status in ('active','suspended','trial','archived')),
  hourly_rate_override numeric(10,2),
  revenue_share_override numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_employee_profile_tenant on public.employee_profile(tenant_id);
create index if not exists idx_employee_profile_user on public.employee_profile(user_id);

-- 3.2 Historique des statuts employé
create table if not exists public.employee_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  old_status text,
  new_status text not null,
  reason text,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_status_history_tenant on public.employee_status_history(tenant_id);
create index if not exists idx_employee_status_history_employee on public.employee_status_history(employee_id);

-- 3.3 Registre global des licenciements
create table if not exists public.fired_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  reason text not null,
  fired_date date not null,
  screenshots text[], -- Array of storage paths
  fired_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_fired_registry_tenant on public.fired_registry(tenant_id);
create index if not exists idx_fired_registry_employee on public.fired_registry(employee_id);

-- ================================
-- 4. GESTION DES MODÈLES
-- ================================

-- 4.1 Profil Modèle
create table if not exists public.model_profile (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  max_boxes_per_shift int not null default 9 check (max_boxes_per_shift between 1 and 9),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_model_profile_tenant on public.model_profile(tenant_id);

-- 4.2 Attribution Modèles/Box
create table if not exists public.model_assignment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  model_id uuid not null references public.model_profile(id) on delete cascade,
  shift_template_id uuid not null references public.shift_template(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_model_assignment_tenant on public.model_assignment(tenant_id);
create index if not exists idx_model_assignment_employee on public.model_assignment(employee_id);
create index if not exists idx_model_assignment_model on public.model_assignment(model_id);

-- ================================
-- 5. PLANNING & SHIFTS
-- ================================

-- 5.1 Instances de shifts
create table if not exists public.shift_instance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shift_template_id uuid not null references public.shift_template(id) on delete cascade,
  date date not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shift_instance_tenant on public.shift_instance(tenant_id);
create index if not exists idx_shift_instance_template on public.shift_instance(shift_template_id);
create index if not exists idx_shift_instance_date on public.shift_instance(date);

-- 5.2 Soumission de planning
create table if not exists public.schedule_submission (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  shifts jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedule_submission_tenant on public.schedule_submission(tenant_id);
create index if not exists idx_schedule_submission_employee on public.schedule_submission(employee_id);

-- 5.3 Boxes (créneaux de chat)
create table if not exists public.box (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  model_id uuid not null references public.model_profile(id) on delete cascade,
  shift_instance_id uuid not null references public.shift_instance(id) on delete cascade,
  employee_id uuid references public.employee_profile(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'available' check (status in ('available','occupied','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_box_tenant on public.box(tenant_id);
create index if not exists idx_box_model on public.box(model_id);
create index if not exists idx_box_shift on public.box(shift_instance_id);
create index if not exists idx_box_employee on public.box(employee_id);

-- ================================
-- 6. PRÉSENCE & PERFORMANCE
-- ================================

-- 6.1 Présence
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  shift_instance_id uuid not null references public.shift_instance(id) on delete cascade,
  check_in timestamptz,
  check_out timestamptz,
  is_late boolean not null default false,
  is_absent boolean not null default false,
  late_minutes int default 0,
  justification text,
  justification_file text, -- Storage path
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_tenant on public.attendance(tenant_id);
create index if not exists idx_attendance_employee on public.attendance(employee_id);
create index if not exists idx_attendance_shift on public.attendance(shift_instance_id);

-- 6.2 Strikes
create table if not exists public.strike (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  type text not null check (type in ('late','absence')),
  amount_usd numeric(10,2) not null,
  reason text,
  cancelled boolean not null default false,
  cancelled_by uuid references auth.users(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_strike_tenant on public.strike(tenant_id);
create index if not exists idx_strike_employee on public.strike(employee_id);

-- 6.3 Primes
create table if not exists public.bonus (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  amount_usd numeric(10,2) not null,
  reason text not null,
  type text not null check (type in ('manual','auto','pool_redistribution')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_bonus_tenant on public.bonus(tenant_id);
create index if not exists idx_bonus_employee on public.bonus(employee_id);

-- 6.4 CA par modèle
create table if not exists public.revenue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profile(id) on delete cascade,
  model_id uuid not null references public.model_profile(id) on delete cascade,
  shift_instance_id uuid not null references public.shift_instance(id) on delete cascade,
  amount_usd numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_revenue_tenant on public.revenue(tenant_id);
create index if not exists idx_revenue_employee on public.revenue(employee_id);
create index if not exists idx_revenue_model on public.revenue(model_id);

-- ================================
-- 7. PAIEMENTS & FACTURATION
-- ================================

-- 7.1 Plans d'abonnement
create table if not exists public.subscription_plan (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_usd numeric(10,2) not null,
  max_agencies int not null,
  max_employees int,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7.2 Abonnements
create table if not exists public.subscription (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.subscription_plan(id),
  status text not null default 'active' check (status in ('active','cancelled','expired','suspended')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  price_locked_usd numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscription_tenant on public.subscription(tenant_id);
create index if not exists idx_subscription_plan on public.subscription(plan_id);

-- 7.3 Transactions BTCPay
create table if not exists public.transaction (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid references public.subscription_plan(id),
  btcpay_invoice_id text unique,
  amount_usd numeric(10,2) not null,
  amount_btc numeric(20,8),
  amount_usdt numeric(20,8),
  amount_usdc numeric(20,8),
  currency text not null,
  status text not null check (status in ('pending','paid','expired','cancelled')),
  payment_method text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_transaction_tenant on public.transaction(tenant_id);
create index if not exists idx_transaction_btcpay on public.transaction(btcpay_invoice_id);

-- 7.4 Factures
create table if not exists public.invoice (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid not null references public.subscription(id),
  invoice_number text not null unique,
  amount_usd numeric(10,2) not null,
  tax_amount_usd numeric(10,2) default 0,
  total_amount_usd numeric(10,2) not null,
  status text not null check (status in ('draft','sent','paid','overdue')),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_tenant on public.invoice(tenant_id);
create index if not exists idx_invoice_subscription on public.invoice(subscription_id);

-- ================================
-- 8. INSTAGRAM MARKETING
-- ================================

-- 8.1 Comptes Instagram
create table if not exists public.instagram_account (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  model_id uuid not null references public.model_profile(id) on delete cascade,
  instagram_user_id text not null,
  username text not null,
  access_token_encrypted text not null, -- Chiffré
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  is_active boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, model_id, instagram_user_id)
);

create index if not exists idx_instagram_account_tenant on public.instagram_account(tenant_id);
create index if not exists idx_instagram_account_model on public.instagram_account(model_id);

-- 8.2 Médias Instagram
create table if not exists public.instagram_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null references public.instagram_account(id) on delete cascade,
  instagram_media_id text not null,
  media_type text not null check (media_type in ('image','video','carousel_album')),
  permalink text,
  caption text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (account_id, instagram_media_id)
);

create index if not exists idx_instagram_media_tenant on public.instagram_media(tenant_id);
create index if not exists idx_instagram_media_account on public.instagram_media(account_id);
create index if not exists idx_instagram_media_published on public.instagram_media(published_at);

-- 8.3 Métriques Instagram
create table if not exists public.instagram_metric (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  media_id uuid not null references public.instagram_media(id) on delete cascade,
  metric_date date not null,
  impressions bigint default 0,
  reach bigint default 0,
  plays bigint default 0,
  likes bigint default 0,
  comments bigint default 0,
  saves bigint default 0,
  shares bigint default 0,
  created_at timestamptz not null default now(),
  unique (media_id, metric_date)
);

create index if not exists idx_instagram_metric_tenant on public.instagram_metric(tenant_id);
create index if not exists idx_instagram_metric_media on public.instagram_metric(media_id);
create index if not exists idx_instagram_metric_date on public.instagram_metric(metric_date);

-- ================================
-- 9. NOTIFICATIONS & AUDIT
-- ================================

-- 9.1 Notifications
create table if not exists public.notification (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  type text not null,
  title text not null,
  message text not null,
  data jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_tenant on public.notification(tenant_id);
create index if not exists idx_notification_user on public.notification(user_id);
create index if not exists idx_notification_read on public.notification(is_read);

-- 9.2 Audit log
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  resource_type text,
  resource_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_tenant on public.audit_log(tenant_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at);

-- ================================
-- 10. FONCTIONS UTILITAIRES
-- ================================

-- 10.1 Helpers de base
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

create or replace function public.is_owner_or_admin(p_tenant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = public.current_user_id()
      and ur.tenant_id = p_tenant
      and r.key in ('owner','admin')
  );
$$;

create or replace function public.is_member(p_tenant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_tenants ut
    where ut.user_id = public.current_user_id()
      and ut.tenant_id = p_tenant
  );
$$;

-- 10.2 RPC pour résolution de domaines
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

-- 10.3 Vue utilitaire
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

alter view public.v_tenant_by_domain set (security_invoker = on);

-- ================================
-- 11. TRIGGERS
-- ================================

-- 11.1 Auto-profile à la création d'un user auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name',''), 
    null,
    coalesce(new.raw_user_meta_data->>'username','')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 11.2 Triggers updated_at
drop trigger if exists trg_tenants_updated on public.tenants;
create trigger trg_tenants_updated
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_agency_settings_updated on public.agency_settings;
create trigger trg_agency_settings_updated
before update on public.agency_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_shift_template_updated on public.shift_template;
create trigger trg_shift_template_updated
before update on public.shift_template
for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_profile_updated on public.employee_profile;
create trigger trg_employee_profile_updated
before update on public.employee_profile
for each row execute function public.set_updated_at();

drop trigger if exists trg_model_profile_updated on public.model_profile;
create trigger trg_model_profile_updated
before update on public.model_profile
for each row execute function public.set_updated_at();

drop trigger if exists trg_shift_instance_updated on public.shift_instance;
create trigger trg_shift_instance_updated
before update on public.shift_instance
for each row execute function public.set_updated_at();

drop trigger if exists trg_box_updated on public.box;
create trigger trg_box_updated
before update on public.box
for each row execute function public.set_updated_at();

drop trigger if exists trg_attendance_updated on public.attendance;
create trigger trg_attendance_updated
before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscription_updated on public.subscription;
create trigger trg_subscription_updated
before update on public.subscription
for each row execute function public.set_updated_at();

drop trigger if exists trg_instagram_account_updated on public.instagram_account;
create trigger trg_instagram_account_updated
before update on public.instagram_account
for each row execute function public.set_updated_at();

-- ================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ================================

-- 12.1 Activer RLS sur toutes les tables
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.user_tenants enable row level security;
alter table public.user_roles enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.agency_settings enable row level security;
alter table public.shift_template enable row level security;
alter table public.shift_capacity enable row level security;
alter table public.strike_policy enable row level security;
alter table public.payroll_policy enable row level security;
alter table public.billing_contact enable row level security;
alter table public.invitation enable row level security;
alter table public.telegram_settings enable row level security;
alter table public.competition_settings enable row level security;
alter table public.instagram_settings enable row level security;
alter table public.employee_profile enable row level security;
alter table public.employee_status_history enable row level security;
alter table public.fired_registry enable row level security;
alter table public.model_profile enable row level security;
alter table public.model_assignment enable row level security;
alter table public.shift_instance enable row level security;
alter table public.schedule_submission enable row level security;
alter table public.box enable row level security;
alter table public.attendance enable row level security;
alter table public.strike enable row level security;
alter table public.bonus enable row level security;
alter table public.revenue enable row level security;
alter table public.subscription enable row level security;
alter table public.transaction enable row level security;
alter table public.invoice enable row level security;
alter table public.instagram_account enable row level security;
alter table public.instagram_media enable row level security;
alter table public.instagram_metric enable row level security;
alter table public.notification enable row level security;
alter table public.audit_log enable row level security;

-- 12.2 Policies de base (SELECT pour membres du tenant)
do $$ begin
  perform 1 from pg_policies where schemaname='public' and tablename='tenants' and policyname='tenants_select';
  if not found then
    create policy tenants_select on public.tenants
      for select using (
        exists (
          select 1 from public.user_tenants ut
          where ut.tenant_id = tenants.id and ut.user_id = public.current_user_id()
        )
      );
  end if;
end $$;

-- 12.3 Policies pour toutes les tables avec tenant_id
do $policies$
declare t text;
begin
  for t in
    select unnest(array[
      'tenant_domains','agency_settings','shift_template','shift_capacity','strike_policy',
      'payroll_policy','billing_contact','invitation','telegram_settings','competition_settings',
      'instagram_settings','employee_profile','employee_status_history','fired_registry',
      'model_profile','model_assignment','shift_instance','schedule_submission','box',
      'attendance','strike','bonus','revenue','subscription','transaction','invoice',
      'instagram_account','instagram_media','instagram_metric','notification','audit_log'
    ])
  loop
    -- SELECT policy
    execute format(
      'do $$ begin
         perform 1 from pg_policies where schemaname=''public'' and tablename=%L and policyname=%L;
         if not found then
           create policy %I on public.%I for select using (public.is_member(tenant_id));
         end if; end $$;',
      t, t||'_select', t||'_select', t
    );

    -- UPDATE policy (owner/admin)
    execute format(
      'do $$ begin
         perform 1 from pg_policies where schemaname=''public'' and tablename=%L and policyname=%L;
         if not found then
           create policy %I on public.%I for update using (public.is_owner_or_admin(tenant_id));
         end if; end $$;',
      t, t||'_update', t||'_update', t
    );

    -- INSERT policy (owner/admin)
    execute format(
      'do $$ begin
         perform 1 from pg_policies where schemaname=''public'' and tablename=%L and policyname=%L;
         if not found then
           create policy %I on public.%I for insert with check (public.is_owner_or_admin(tenant_id));
         end if; end $$;',
      t, t||'_insert', t||'_insert', t
    );
  end loop;
end
$policies$;

-- 12.4 Policies spéciales
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

-- 12.5 Permissions sur les fonctions
revoke all on function public.tenant_id_by_subdomain(text) from public;
grant execute on function public.tenant_id_by_subdomain(text) to anon, authenticated;

revoke all on function public.tenant_by_domain(text) from public;
grant execute on function public.tenant_by_domain(text) to anon, authenticated;

revoke all on function public.domain_exists(text) from public;
grant execute on function public.domain_exists(text) to anon, authenticated;

revoke all on function public.subdomain_exists(text) from public;
grant execute on function public.subdomain_exists(text) to anon, authenticated;

-- ================================
-- 13. SEEDS & DONNÉES DE BASE
-- ================================

-- 13.1 Rôles
insert into public.roles (key, description) values
  ('owner','Tenant Owner'),
  ('admin','Administrator'),
  ('manager','Manager'),
  ('employee','Employee'),
  ('marketing','Marketing')
on conflict do nothing;

-- 13.2 Permissions
insert into public.permissions (code, description) values
  ('dashboard.view','View dashboard'),
  ('users.invite','Invite users'),
  ('users.manage','Manage users'),
  ('billing.manage','Manage billing'),
  ('shifts.edit','Edit shifts'),
  ('shifts.view','View shifts'),
  ('models.edit','Edit models'),
  ('models.view','View models'),
  ('employees.manage','Manage employees'),
  ('employees.view','View employees'),
  ('marketing.ig.connect','Connect Instagram'),
  ('marketing.ig.view','View Instagram data'),
  ('reports.view','View reports'),
  ('settings.manage','Manage settings')
on conflict do nothing;

-- 13.3 Mapping rôles-permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','users.invite','users.manage','billing.manage',
  'shifts.edit','shifts.view','models.edit','models.view',
  'employees.manage','employees.view','marketing.ig.connect',
  'marketing.ig.view','reports.view','settings.manage'
)
where r.key = 'owner'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','users.invite','shifts.edit','shifts.view',
  'models.edit','models.view','employees.manage','employees.view',
  'marketing.ig.view','reports.view'
)
where r.key = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','shifts.view','models.view','employees.view',
  'marketing.ig.view','reports.view'
)
where r.key = 'manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','shifts.view','models.view'
)
where r.key = 'employee'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view','marketing.ig.connect','marketing.ig.view','reports.view'
)
where r.key = 'marketing'
on conflict do nothing;

-- 13.4 Plans d'abonnement
insert into public.subscription_plan (name, description, price_usd, max_agencies, max_employees, features) values
  ('Starter', 'Plan de base pour petites agences', 17.00, 1, 3, '{"shifts": true, "basic_reporting": true}'),
  ('Advanced', 'Plan avancé pour agences moyennes', 35.00, 1, 7, '{"shifts": true, "advanced_reporting": true, "instagram_basic": true}'),
  ('Professional', 'Plan professionnel illimité', 75.00, 1, null, '{"shifts": true, "advanced_reporting": true, "instagram_full": true, "competition": true}'),
  ('On-Demand', 'Plan à la demande', 75.00, 1, null, '{"shifts": true, "advanced_reporting": true, "instagram_full": true, "competition": true, "on_demand": true}')
on conflict do nothing;

-- ================================
-- 14. INDEXES SUPPLÉMENTAIRES
-- ================================

-- Indexes pour les performances
create index if not exists idx_tenants_updated_at on public.tenants(updated_at);
create index if not exists idx_employee_profile_status on public.employee_profile(status);
create index if not exists idx_shift_instance_status on public.shift_instance(status);
create index if not exists idx_box_status on public.box(status);
create index if not exists idx_attendance_shift_date on public.attendance(shift_instance_id, created_at);
create index if not exists idx_revenue_date on public.revenue(created_at);
create index if not exists idx_subscription_status on public.subscription(status);
create index if not exists idx_transaction_status on public.transaction(status);
create index if not exists idx_notification_type on public.notification(type);

-- ================================
-- FIN DU MASTER SQL
-- ================================