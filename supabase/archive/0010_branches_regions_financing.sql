-- 0010: branch list from branches-regions.csv + financing fields for installment requests.
-- Additive only: nothing is dropped, nothing is renamed, existing rows are untouched.
-- Apply after 0009 on the lineage chosen in supabase/MIGRATION_PLAN.md (not the 2026100123xxxx set).

-- 1) Branches: stable id, region, name, is_active. The id is the value stored with each order.
create table if not exists qistuha_branches (
  id          text primary key,
  region      text not null check (region in ('عدن', 'تعز', 'صنعاء')),
  name        text not null check (length(trim(name)) > 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (region, name)
);

create index if not exists qistuha_branches_region_idx on qistuha_branches (region) where is_active;

alter table qistuha_branches enable row level security;

-- Anyone (including logged-out visitors) may read active branches; only the service role writes them.
drop policy if exists "public_read_active_branches" on qistuha_branches;
create policy "public_read_active_branches" on qistuha_branches
  for select to anon, authenticated using (is_active);

-- 2) Financing fields on applications. Guarantee details are visible only through RLS
--    to the applicant and to the authorised reviewer (policies are defined in migration 0005).
alter table if exists financing_applications
  add column if not exists region            text,
  add column if not exists branch_id         text,
  add column if not exists guarantee_code    text check (guarantee_code in ('account', 'gold', 'commercial', 'company')),
  add column if not exists guarantee_details jsonb not null default '{}'::jsonb,
  add column if not exists guarantor_name    text,
  add column if not exists guarantor_phone   text,
  add column if not exists guarantor_id      text,
  add column if not exists company_decision  text check (company_decision in ('pending', 'approved', 'rejected'));

-- A company guarantee is only meaningful for an application linked to a company.
alter table if exists financing_applications
  drop constraint if exists financing_company_guarantee_needs_company;
alter table if exists financing_applications
  add constraint financing_company_guarantee_needs_company
  check (guarantee_code is distinct from 'company' or company_id is not null);
