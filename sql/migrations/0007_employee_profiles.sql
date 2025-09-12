-- ================================
-- 0007_employee_profiles.sql
-- Fiches employés et gestion du personnel
-- ================================

-- 1) Table des fiches employés
create table if not exists public.employee_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Informations personnelles
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  telegram text,
  whatsapp text,
  nationality text,
  cni_document_url text, -- Storage URL
  
  -- Informations professionnelles
  hire_date date not null,
  status text not null check (status in ('active', 'suspended', 'trial', 'archived')),
  roles text[] not null default '{}',
  assigned_models text[] not null default '{}',
  assigned_shifts text[] not null default '{}',
  
  -- Configuration paie
  hourly_rate_usd decimal(10,2),
  commission_percentage decimal(5,2),
  use_global_rates boolean not null default true,
  
  -- Métadonnées
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  
  -- Contraintes
  unique(tenant_id, user_id),
  unique(tenant_id, email)
);

create index if not exists idx_employee_profiles_tenant on public.employee_profiles(tenant_id);
create index if not exists idx_employee_profiles_user on public.employee_profiles(user_id);
create index if not exists idx_employee_profiles_status on public.employee_profiles(status);
create index if not exists idx_employee_profiles_hire_date on public.employee_profiles(hire_date);

-- 2) Table des modèles
create table if not exists public.model_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  status text not null check (status in ('active', 'inactive', 'archived')),
  max_boxes_per_shift integer not null default 9,
  instagram_connected boolean not null default false,
  instagram_account_id uuid references public.instagram_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists idx_model_profiles_tenant on public.model_profiles(tenant_id);
create index if not exists idx_model_profiles_status on public.model_profiles(status);

-- 3) Table des shifts templates
create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  max_employees integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shift_templates_tenant on public.shift_templates(tenant_id);
create index if not exists idx_shift_templates_active on public.shift_templates(is_active);

-- 4) Table des instances de shifts
create table if not exists public.shift_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_id uuid not null references public.shift_templates(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  max_employees integer,
  status text not null check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shift_instances_tenant on public.shift_instances(tenant_id);
create index if not exists idx_shift_instances_date on public.shift_instances(shift_date);
create index if not exists idx_shift_instances_status on public.shift_instances(status);

-- 5) Table des boxes
create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  model_id uuid not null references public.model_profiles(id) on delete cascade,
  shift_instance_id uuid not null references public.shift_instances(id) on delete cascade,
  employee_id uuid references public.employee_profiles(id),
  slot_number integer not null,
  status text not null check (status in ('available', 'assigned', 'occupied', 'completed')),
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_boxes_tenant on public.boxes(tenant_id);
create index if not exists idx_boxes_model on public.boxes(model_id);
create index if not exists idx_boxes_shift on public.boxes(shift_instance_id);
create index if not exists idx_boxes_employee on public.boxes(employee_id);
create index if not exists idx_boxes_status on public.boxes(status);

-- 6) Table des soumissions de planning
create table if not exists public.schedule_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  shifts jsonb not null, -- {shift_id: {preference: 'preferred'|'available'|'unavailable'}}
  status text not null check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schedule_submissions_tenant on public.schedule_submissions(tenant_id);
create index if not exists idx_schedule_submissions_employee on public.schedule_submissions(employee_id);
create index if not exists idx_schedule_submissions_week on public.schedule_submissions(week_start);
create index if not exists idx_schedule_submissions_status on public.schedule_submissions(status);

-- 7) Table de présence
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employee_profiles(id) on delete cascade,
  shift_instance_id uuid not null references public.shift_instances(id) on delete cascade,
  box_id uuid references public.boxes(id),
  clock_in timestamptz,
  clock_out timestamptz,
  status text not null check (status in ('present', 'late', 'absent', 'excused')),
  late_reason text,
  late_document_url text, -- Storage URL pour justificatif
  strike_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_tenant on public.attendance(tenant_id);
create index if not exists idx_attendance_employee on public.attendance(employee_id);
create index if not exists idx_attendance_shift on public.attendance(shift_instance_id);
create index if not exists idx_attendance_status on public.attendance(status);

-- 8) RLS pour toutes les tables
alter table public.employee_profiles enable row level security;
alter table public.model_profiles enable row level security;
alter table public.shift_templates enable row level security;
alter table public.shift_instances enable row level security;
alter table public.boxes enable row level security;
alter table public.schedule_submissions enable row level security;
alter table public.attendance enable row level security;

-- Employee profiles: visibles par les membres du tenant
drop policy if exists employee_profiles_select on public.employee_profiles;
create policy employee_profiles_select on public.employee_profiles
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = employee_profiles.tenant_id 
    and ut.user_id = public.current_user_id()
  )
);

-- Employee profiles: modification par owner/admin/manager
drop policy if exists employee_profiles_update on public.employee_profiles;
create policy employee_profiles_update on public.employee_profiles
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = employee_profiles.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

-- Employee profiles: création par owner/admin
drop policy if exists employee_profiles_insert on public.employee_profiles;
create policy employee_profiles_insert on public.employee_profiles
for insert with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = employee_profiles.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Model profiles: mêmes règles que employee_profiles
drop policy if exists model_profiles_select on public.model_profiles;
create policy model_profiles_select on public.model_profiles
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = model_profiles.tenant_id 
    and ut.user_id = public.current_user_id()
  )
);

drop policy if exists model_profiles_update on public.model_profiles;
create policy model_profiles_update on public.model_profiles
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = model_profiles.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

drop policy if exists model_profiles_insert on public.model_profiles;
create policy model_profiles_insert on public.model_profiles
for insert with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = model_profiles.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Shift templates: mêmes règles
drop policy if exists shift_templates_select on public.shift_templates;
create policy shift_templates_select on public.shift_templates
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = shift_templates.tenant_id 
    and ut.user_id = public.current_user_id()
  )
);

drop policy if exists shift_templates_update on public.shift_templates;
create policy shift_templates_update on public.shift_templates
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = shift_templates.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

drop policy if exists shift_templates_insert on public.shift_templates;
create policy shift_templates_insert on public.shift_templates
for insert with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = shift_templates.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Shift instances: mêmes règles
drop policy if exists shift_instances_select on public.shift_instances;
create policy shift_instances_select on public.shift_instances
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = shift_instances.tenant_id 
    and ut.user_id = public.current_user_id()
  )
);

drop policy if exists shift_instances_update on public.shift_instances;
create policy shift_instances_update on public.shift_instances
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = shift_instances.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

drop policy if exists shift_instances_insert on public.shift_instances;
create policy shift_instances_insert on public.shift_instances
for insert with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = shift_instances.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin')
  )
);

-- Boxes: visibles par les membres du tenant
drop policy if exists boxes_select on public.boxes;
create policy boxes_select on public.boxes
for select using (
  exists (
    select 1 from public.user_tenants ut
    where ut.tenant_id = boxes.tenant_id 
    and ut.user_id = public.current_user_id()
  )
);

-- Boxes: modification par owner/admin/manager
drop policy if exists boxes_update on public.boxes;
create policy boxes_update on public.boxes
for update using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = boxes.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

-- Schedule submissions: visibles par l'employé et les managers
drop policy if exists schedule_submissions_select on public.schedule_submissions;
create policy schedule_submissions_select on public.schedule_submissions
for select using (
  employee_id in (
    select id from public.employee_profiles 
    where user_id = public.current_user_id()
  ) or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = schedule_submissions.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

-- Schedule submissions: modification par l'employé et les managers
drop policy if exists schedule_submissions_update on public.schedule_submissions;
create policy schedule_submissions_update on public.schedule_submissions
for update using (
  employee_id in (
    select id from public.employee_profiles 
    where user_id = public.current_user_id()
  ) or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = schedule_submissions.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

-- Attendance: mêmes règles que schedule_submissions
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
for select using (
  employee_id in (
    select id from public.employee_profiles 
    where user_id = public.current_user_id()
  ) or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = attendance.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance
for update using (
  employee_id in (
    select id from public.employee_profiles 
    where user_id = public.current_user_id()
  ) or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.tenant_id = attendance.tenant_id
      and ur.user_id = public.current_user_id()
      and r.key in ('owner','admin','manager')
  )
);

-- 9) Triggers pour updated_at
drop trigger if exists trg_employee_profiles_updated on public.employee_profiles;
create trigger trg_employee_profiles_updated
before update on public.employee_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_model_profiles_updated on public.model_profiles;
create trigger trg_model_profiles_updated
before update on public.model_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_shift_templates_updated on public.shift_templates;
create trigger trg_shift_templates_updated
before update on public.shift_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_shift_instances_updated on public.shift_instances;
create trigger trg_shift_instances_updated
before update on public.shift_instances
for each row execute function public.set_updated_at();

drop trigger if exists trg_boxes_updated on public.boxes;
create trigger trg_boxes_updated
before update on public.boxes
for each row execute function public.set_updated_at();

drop trigger if exists trg_schedule_submissions_updated on public.schedule_submissions;
create trigger trg_schedule_submissions_updated
before update on public.schedule_submissions
for each row execute function public.set_updated_at();

drop trigger if exists trg_attendance_updated on public.attendance;
create trigger trg_attendance_updated
before update on public.attendance
for each row execute function public.set_updated_at();