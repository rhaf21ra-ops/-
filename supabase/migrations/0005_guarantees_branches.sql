-- 0005: guarantee types per audience (bank account / gold / commercial / company), customer applications,
-- and Al-Kuraimi branch selection. Apply after 0004_reconcile.sql.

-- ═════════ 1. Guarantee types: audience + dynamic detail fields ═════════
alter table guarantee_types
  add column audience text not null default 'both' check (audience in ('customer','employee','both')),
  add column fields jsonb not null default '[]'::jsonb;   -- [{key,label,type:text|number,required}]

-- Owner-defined list replaces the earlier starter list. Old rows are kept but deactivated (re-enable from /admin).
update guarantee_types set active = false where code in ('personal_guarantor','guarantee_cheque','promissory_note');

update guarantee_types set audience = 'employee', sort_order = 1 where code = 'salary_deduction';
update guarantee_types set audience = 'employee', sort_order = 2 where code = 'company_undertaking';

insert into guarantee_types(code, name_ar, description_ar, requires_guarantor, audience, sort_order, fields) values
 ('bank_account', 'حساب بنكي', 'ضمان بحساب بنكي باسمك', false, 'both', 3,
  '[{"key":"bank_name","label":"اسم البنك","type":"text","required":true},
    {"key":"account_number","label":"رقم الحساب","type":"text","required":true},
    {"key":"account_holder","label":"اسم صاحب الحساب","type":"text","required":true}]'),
 ('gold', 'ذهب', 'ضمان بذهب يُقيَّم ويُوثَّق عند الاستلام', false, 'both', 4,
  '[{"key":"weight_grams","label":"الوزن (جرام)","type":"number","required":true},
    {"key":"karat","label":"العيار","type":"text","required":true},
    {"key":"estimated_value","label":"القيمة التقديرية (ريال)","type":"number","required":true},
    {"key":"description","label":"وصف القطع","type":"text","required":false}]'),
 ('commercial_guarantee', 'ضمانة تجارية', 'ضمان بنشاط أو أصل تجاري', false, 'both', 5,
  '[{"key":"business_name","label":"اسم المنشأة","type":"text","required":true},
    {"key":"commercial_register_no","label":"رقم السجل التجاري","type":"text","required":true},
    {"key":"description","label":"وصف الضمانة","type":"text","required":false}]');

-- Returns an error message, or NULL when the details satisfy the type's required fields.
create or replace function validate_guarantee_details(type_id int, details jsonb) returns text
language plpgsql stable as $$
declare f jsonb; v text;
begin
  for f in select * from jsonb_array_elements((select fields from guarantee_types where id = type_id)) loop
    if (f->>'required')::boolean then
      v := trim(coalesce(details->>(f->>'key'), ''));
      if v = '' then return 'missing field: ' || (f->>'key'); end if;
      if f->>'type' = 'number' and (v !~ '^[0-9]+(\.[0-9]+)?$' or v::numeric <= 0) then
        return 'invalid number: ' || (f->>'key');
      end if;
    end if;
  end loop;
  return null;
end $$;

-- ═════════ 2. Customers (non-employees) can apply too ═════════
alter table financing_applications add column applicant_user_id uuid references auth.users(id);
update financing_applications a set applicant_user_id = e.user_id from employees e where e.id = a.employee_id;
alter table financing_applications alter column employee_id drop not null;
alter table financing_applications add constraint applicant_present check (employee_id is not null or applicant_user_id is not null);
create policy applicant_apps on financing_applications for select using (applicant_user_id = auth.uid());

-- Sensitive details (account numbers, gold) live in their own table: the employer's company can NOT read them.
create table financing_guarantee_details (
  application_id uuid primary key references financing_applications(id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table financing_guarantee_details enable row level security;
create policy admin_all on financing_guarantee_details for all using (is_admin()) with check (is_admin());
create policy applicant_details on financing_guarantee_details for select using (exists (
  select 1 from financing_applications a where a.id = application_id and a.applicant_user_id = auth.uid()));
create policy staff_details on financing_guarantee_details for select using (has_permission('financing.view'));
-- Written by the application-creation RPC (Phase 9), never directly by clients.

create or replace function trg_check_guarantee_details() returns trigger
language plpgsql as $$
declare err text; a financing_applications;
begin
  if tg_table_name = 'financing_applications' then
    select * into a from financing_applications where id = new.id;
    select validate_guarantee_details(a.guarantee_type_id, coalesce((select details from financing_guarantee_details where application_id = a.id), '{}'::jsonb)) into err;
  else
    select * into a from financing_applications where id = new.application_id;
    select validate_guarantee_details(a.guarantee_type_id, new.details) into err;
  end if;
  if err is not null then raise exception 'guarantee details invalid (%)', err; end if;
  return null;
end $$;
-- Checked at COMMIT so the application row and its details can be inserted in one transaction.
create constraint trigger trg_guarantee_details_app after insert on financing_applications
  deferrable initially deferred for each row execute function trg_check_guarantee_details();
create constraint trigger trg_guarantee_details_row after insert or update on financing_guarantee_details
  deferrable initially deferred for each row execute function trg_check_guarantee_details();

-- ═════════ 3. Al-Kuraimi branches ═════════
alter table branches
  add column bank text not null default 'الكريمي',
  add column code text,
  add column address text,
  add column latitude numeric(9,6) check (latitude between -90 and 90),
  add column longitude numeric(9,6) check (longitude between -180 and 180),
  add column working_hours text;
create unique index branches_unique on branches (bank, name, (coalesce(city, '')));
create policy public_read_branches on branches for select using (active);

-- Nearest active branches by great-circle distance (km). No PostGIS needed.
create or replace function nearest_branches(lat double precision, lng double precision, lim int default 5)
returns table(id uuid, name text, city text, governorate text, address text, phone text, working_hours text, distance_km double precision)
language sql stable as $$
  select * from (
    select b.id, b.name, b.city, b.governorate, b.address, b.phone, b.working_hours,
           6371 * 2 * asin(sqrt(power(sin(radians(b.latitude::float8 - lat) / 2), 2)
             + cos(radians(lat)) * cos(radians(b.latitude::float8)) * power(sin(radians(b.longitude::float8 - lng) / 2), 2))) as distance_km
    from branches b where b.active and b.latitude is not null and b.longitude is not null) x
  order by distance_km limit least(greatest(lim, 1), 50)
$$;

-- ═════════ 4. Server-side truth for new applications ═════════
create or replace function financing_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; m numeric; g guarantee_types; is_emp boolean := new.employee_id is not null;
begin
  if is_emp then
    select user_id into uid from employees where id = new.employee_id;
    new.applicant_user_id := uid;
  else
    uid := new.applicant_user_id;
  end if;
  if uid is null then raise exception 'applicant is required'; end if;

  if new.guarantee_type_id is null then raise exception 'guarantee type is required'; end if;
  select * into g from guarantee_types where id = new.guarantee_type_id and active;
  if not found then raise exception 'invalid guarantee type'; end if;
  if (is_emp and g.audience = 'customer') or (not is_emp and g.audience = 'employee') then
    raise exception 'this guarantee type is not available for this applicant';
  end if;
  if g.requires_guarantor and (coalesce(trim(new.guarantor_name), '') = ''
                               or coalesce(trim(new.guarantor_phone), '') = '') then
    raise exception 'guarantor details are required for this guarantee type';
  end if;

  if new.branch_id is null then raise exception 'branch is required'; end if;
  if not exists (select 1 from branches where id = new.branch_id and active) then raise exception 'invalid branch'; end if;

  if not is_emp then            -- a customer has no employer: skip the company step
    new.review_stage := 'admin';
    new.status := 'awaiting_identity';
  end if;

  m := _markup_for(uid);
  new.markup_percent_applied := m;
  new.deferred_price := round(new.cash_price * (1 + m / 100));
  new.monthly_installment := round(new.deferred_price / new.months);
  return new;
end $$;
