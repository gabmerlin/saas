-- ================================
-- 0006_auth_enhancements.sql
-- Améliorations authentification
-- ================================

-- 1) Table des invitations
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role_key role_key not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invitations_token on public.invitations(token);
create index if not exists idx_invitations_email on public.invitations(email);
create index if not exists idx_invitations_tenant on public.invitations(tenant_id);

-- 2) Table des referrals
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_email text not null,
  code text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_referrals_code on public.referrals(code);
create index if not exists idx_referrals_tenant on public.referrals(tenant_id);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- 3) Table des sessions (pour gestion avancée)
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  device_info jsonb,
  ip_address inet,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_user on public.user_sessions(user_id);
create index if not exists idx_user_sessions_tenant on public.user_sessions(tenant_id);
create index if not exists idx_user_sessions_expires on public.user_sessions(expires_at);

-- 4) Table des tentatives de connexion (rate limiting)
create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address inet not null,
  success boolean not null,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_email on public.login_attempts(email);
create index if not exists idx_login_attempts_ip on public.login_attempts(ip_address);
create index if not exists idx_login_attempts_created on public.login_attempts(created_at);

-- 5) Table des tokens 2FA
create table if not exists public.totp_secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  secret text not null,
  backup_codes text[] not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_totp_secrets_user on public.totp_secrets(user_id);

-- 6) RLS pour les nouvelles tables
alter table public.invitations enable row level security;
alter table public.referrals enable row level security;
alter table public.user_sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.totp_secrets enable row level security;

-- Invitations: visibles par les membres du tenant
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = invitations.tenant_id 
    and ut.user_id = public.current_user_id()
  )
);

-- Invitations: création par owner/admin
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
for insert with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = invitations.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Referrals: visibles par le referrer
drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
for select using (referrer_id = public.current_user_id());

-- Referrals: création par owner/admin
drop policy if exists referrals_insert on public.referrals;
create policy referrals_insert on public.referrals
for insert with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = referrals.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Sessions: visibles par l'utilisateur
drop policy if exists user_sessions_select on public.user_sessions;
create policy user_sessions_select on public.user_sessions
for select using (user_id = public.current_user_id());

-- Sessions: création/modification par l'utilisateur
drop policy if exists user_sessions_insert on public.user_sessions;
create policy user_sessions_insert on public.user_sessions
for insert with check (user_id = public.current_user_id());

drop policy if exists user_sessions_update on public.user_sessions;
create policy user_sessions_update on public.user_sessions
for update using (user_id = public.current_user_id());

-- Login attempts: pas de RLS (données publiques pour rate limiting)

-- TOTP secrets: visibles par l'utilisateur
drop policy if exists totp_secrets_select on public.totp_secrets;
create policy totp_secrets_select on public.totp_secrets
for select using (user_id = public.current_user_id());

drop policy if exists totp_secrets_insert on public.totp_secrets;
create policy totp_secrets_insert on public.totp_secrets
for insert with check (user_id = public.current_user_id());

drop policy if exists totp_secrets_update on public.totp_secrets;
create policy totp_secrets_update on public.totp_secrets
for update using (user_id = public.current_user_id());

-- 7) Fonctions utilitaires
create or replace function public.generate_invitation_token()
returns text language sql as $$
  select encode(gen_random_bytes(32), 'hex');
$$;

create or replace function public.generate_referral_code()
returns text language sql as $$
  select upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 8));
$$;

-- 8) Fonction de nettoyage des invitations expirées
create or replace function public.cleanup_expired_invitations()
returns void language plpgsql as $$
begin
  delete from public.invitations 
  where expires_at < now() and accepted_at is null;
end; $$;

-- 9) Fonction de nettoyage des sessions expirées
create or replace function public.cleanup_expired_sessions()
returns void language plpgsql as $$
begin
  delete from public.user_sessions 
  where expires_at < now() or revoked_at is not null;
end; $$;

-- 10) Fonction de nettoyage des tentatives de connexion anciennes
create or replace function public.cleanup_old_login_attempts()
returns void language plpgsql as $$
begin
  delete from public.login_attempts 
  where created_at < now() - interval '24 hours';
end; $$;

-- 11) Triggers pour updated_at
drop trigger if exists trg_invitations_updated on public.invitations;
create trigger trg_invitations_updated
before update on public.invitations
for each row execute function public.set_updated_at();

drop trigger if exists trg_totp_secrets_updated on public.totp_secrets;
create trigger trg_totp_secrets_updated
before update on public.totp_secrets
for each row execute function public.set_updated_at();

-- 12) Fonction pour vérifier les tentatives de connexion
create or replace function public.check_login_attempts(p_email text, p_ip inet)
returns boolean language plpgsql as $$
declare
  attempt_count integer;
  lockout_until timestamptz;
begin
  -- Compter les tentatives échouées dans les dernières 15 minutes
  select count(*) into attempt_count
  from public.login_attempts
  where email = p_email 
    and ip_address = p_ip
    and success = false
    and created_at > now() - interval '15 minutes';
  
  -- Vérifier si l'utilisateur est en lockout
  select max(created_at) + interval '15 minutes' into lockout_until
  from public.login_attempts
  where email = p_email 
    and ip_address = p_ip
    and success = false
    and created_at > now() - interval '15 minutes';
  
  if lockout_until > now() then
    return false; -- En lockout
  end if;
  
  return attempt_count < 5; -- Max 5 tentatives
end; $$;

-- 13) Fonction pour enregistrer une tentative de connexion
create or replace function public.record_login_attempt(
  p_email text, 
  p_ip inet, 
  p_success boolean, 
  p_failure_reason text default null
)
returns void language plpgsql as $$
begin
  insert into public.login_attempts (email, ip_address, success, failure_reason)
  values (p_email, p_ip, p_success, p_failure_reason);
end; $$;