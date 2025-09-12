-- ================================
-- 0005_onboarding_agency.sql
-- Compléments Onboarding Agence (adapté à 0001..0004)
-- - RLS basées sur user_tenants + roles (owner/admin)
-- - Pas de table "agency_theme" (on garde tenants.theme)
-- ================================

-- Helpers ---------------------------------------------------------------

-- Vérif: la fonction current_user_id() existe déjà dans 0001.
-- On ajoute deux helpers non-intrusifs:

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

-- Tables ----------------------------------------------------------------

-- Configuration générale par agence (hors "theme" qui reste dans tenants.theme)
create table if not exists public.agency_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,                             -- branding email = name
  locale_default text not null default 'fr',      -- 'fr' | 'en'
  currency_display text not null default 'USD',   -- affichage (paiement: géré côté billing)
  enforce_verified_email boolean not null default true,
  suggest_2fa boolean not null default true,
  auto_approve_rules boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

-- Shifts (templates éditables)
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

-- Capacité par shift (exceptions par jour)
create table if not exists public.shift_capacity (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shift_template_id uuid not null references public.shift_template(id) on delete cascade,
  date date,                                       -- null => défaut global
  max_chatters int not null check (max_chatters >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_shift_capacity_tenant on public.shift_capacity(tenant_id);
create index if not exists idx_shift_capacity_template on public.shift_capacity(shift_template_id);
create index if not exists idx_shift_capacity_date on public.shift_capacity(date);

-- Strikes & assiduité
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

-- Paie (affichage USD, calcule côté app)
create table if not exists public.payroll_policy (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hourly_enabled boolean not null default false,
  hourly_usd numeric(10,2),                                -- nullable si disabled
  revenue_share_percent numeric(5,2) not null default 0,   -- ex: 5.00 = 5%
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- Contacts de facturation (Owner + secondaire(s))
create table if not exists public.billing_contact (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_billing_contact_tenant on public.billing_contact(tenant_id);

-- Invitations (referral/email, reset quotidien à 00:00 UTC via Cron)
create table if not exists public.invitation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text,                                  -- optionnel si lien referral
  role_key public.role_key not null,           -- réutilise ton enum
  token text not null,
  expires_at timestamptz not null,             -- généralement 24h à minuit UTC
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_invitation_tenant on public.invitation(tenant_id);
create index if not exists idx_invitation_expires on public.invitation(expires_at);

-- Telegram (paramètres d’agence)
create table if not exists public.telegram_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id text,
  daily_digest boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- Compétition inter-agences
create table if not exists public.competition_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  opt_in boolean not null default false,
  alias text,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- Instagram (switch global; les tables métier IG viendront plus tard)
create table if not exists public.instagram_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

-- Audit log minimal (traçabilité onboarding)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_tenant on public.audit_log(tenant_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at);

-- RLS -------------------------------------------------------------------

alter table public.agency_settings       enable row level security;
alter table public.shift_template        enable row level security;
alter table public.shift_capacity        enable row level security;
alter table public.strike_policy         enable row level security;
alter table public.payroll_policy        enable row level security;
alter table public.billing_contact       enable row level security;
alter table public.invitation            enable row level security;
alter table public.telegram_settings     enable row level security;
alter table public.competition_settings  enable row level security;
alter table public.instagram_settings    enable row level security;
alter table public.audit_log             enable row level security;

-- SELECT: membres du tenant
do $$ begin
  perform 1 from pg_policies where schemaname='public' and tablename='agency_settings' and policyname='agency_settings_select';
  if not found then
    create policy agency_settings_select on public.agency_settings
      for select using (public.is_member(tenant_id));
  end if;
end $$;

-- UPDATE: owner/admin
do $$ begin
  perform 1 from pg_policies where schemaname='public' and tablename='agency_settings' and policyname='agency_settings_update';
  if not found then
    create policy agency_settings_update on public.agency_settings
      for update using (public.is_owner_or_admin(tenant_id));
  end if;
end $$;

-- INSERT: owner/admin (ou service role)
do $$ begin
  perform 1 from pg_policies where schemaname='public' and tablename='agency_settings' and policyname='agency_settings_insert';
  if not found then
    create policy agency_settings_insert on public.agency_settings
      for insert with check (public.is_owner_or_admin(tenant_id));
  end if;
end $$;

-- Répliquer via une boucle pour les autres tables
do $policies$
declare t text;
begin
  for t in
    select unnest(array[
      'shift_template','shift_capacity','strike_policy','payroll_policy',
      'billing_contact','invitation','telegram_settings','competition_settings',
      'instagram_settings','audit_log'
    ])
  loop
    execute format(
      'do $$ begin
         perform 1 from pg_policies where schemaname=''public'' and tablename=%L and policyname=%L;
         if not found then
           create policy %I on public.%I for select using (public.is_member(tenant_id));
         end if; end $$;',
      t, t||'_select', t||'_select', t
    );

    execute format(
      'do $$ begin
         perform 1 from pg_policies where schemaname=''public'' and tablename=%L and policyname=%L;
         if not found then
           create policy %I on public.%I for update using (public.is_owner_or_admin(tenant_id));
         end if; end $$;',
      t, t||'_update', t||'_update', t
    );

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

-- Triggers "updated_at" pour les tables qui l'ont -----------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_agency_settings_updated on public.agency_settings;
create trigger trg_agency_settings_updated
before update on public.agency_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_shift_template_updated on public.shift_template;
create trigger trg_shift_template_updated
before update on public.shift_template
for each row execute function public.set_updated_at();

-- Seeds légers (optionnels) --------------------------------------------

-- Default agency_settings pour chaque tenant existant sans ligne:
insert into public.agency_settings (tenant_id, name, locale_default, currency_display)
select t.id, t.name, coalesce(t.locale,'fr'), 'USD'
from public.tenants t
left join public.agency_settings s on s.tenant_id = t.id
where s.tenant_id is null;

-- Quatre shifts par défaut là où il n'y en a aucun:
insert into public.shift_template (tenant_id, label, start_minutes, end_minutes, is_active, sort_order)
select t.id, x.label, x.start_m, x.end_m, true, x.ord
from public.tenants t
left join public.shift_template st on st.tenant_id = t.id
cross join (
  values
    ('08–14', 8*60, 14*60, 0),
    ('14–20', 14*60, 20*60, 1),
    ('20–02', 20*60, 2*60,  2),
    ('02–08', 2*60,  8*60,  3)
) as x(label, start_m, end_m, ord)
where st.tenant_id is null;

-- Politiques par défaut (payroll/strike) si manquantes:
insert into public.payroll_policy (tenant_id, hourly_enabled, hourly_usd, revenue_share_percent)
select t.id, false, null, 0
from public.tenants t
left join public.payroll_policy p on p.tenant_id = t.id
where p.tenant_id is null;

insert into public.strike_policy (tenant_id, grace_minutes, late_fee_usd, absence_fee_usd, pool_top_count)
select t.id, 0, 5.00, 10.00, 5
from public.tenants t
left join public.strike_policy sp on sp.tenant_id = t.id
where sp.tenant_id is null;

-- FIN 0005
