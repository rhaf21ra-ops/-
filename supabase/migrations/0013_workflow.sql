-- 0013: the working business flow. Everything that changes money, limits, stock or status runs here (SECURITY DEFINER),
-- never from the browser. Apply after 0012.
--   * sign-up creates the merchant + store / the company record
--   * an employee links to a company; the company sets eligibility and limit
--   * company decision -> admin decision -> contract + installment schedule
--   * recording payments, order status changes (with stock restore on cancel), settlements
--   * extra columns the storefront needs (specs, sold_count, notification type/link, contract number)

-- ═════════ 1. Columns & seed data ═════════
alter table products add column if not exists specs jsonb not null default '[]'::jsonb;
alter table products add column if not exists sold_count int not null default 0;
alter table notifications add column if not exists type text not null default 'system';
alter table notifications add column if not exists link text;
alter table contracts add column if not exists contract_number text unique;
alter table contracts add column if not exists start_date date;
create sequence if not exists contract_number_seq start 20001;

insert into categories(name, slug) values
  ('الإلكترونيات','electronics'),('الهواتف','phones'),('الأجهزة المنزلية','appliances'),('الأثاث','furniture'),
  ('الملابس','clothes'),('الأحذية','shoes'),('العطور','perfumes'),('الجمال','beauty'),('الأغذية','food'),
  ('مستلزمات الأطفال','kids'),('الرياضة','sports'),('السيارات','cars'),('أخرى','other')
on conflict (name) do nothing;

-- sold_count follows the order items (set by the checkout function, never by the merchant)
create or replace function bump_sold_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update products set sold_count = sold_count + new.quantity where id = new.product_id;
  return new;
end $$;
drop trigger if exists trg_bump_sold on order_items;
create trigger trg_bump_sold after insert on order_items for each row execute function bump_sold_count();

-- Merchants must not edit sold_count / specs-independent counters directly
create or replace function guard_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.featured := false; new.is_bestseller := false; new.rating := 0; new.sold_count := 0;
  else
    new.featured := old.featured; new.is_bestseller := old.is_bestseller; new.rating := old.rating;
    if current_user = 'authenticated' then new.sold_count := old.sold_count; end if;
  end if;
  return new;
end $$;

-- ═════════ 2. Sign-up creates the merchant / company records ═════════
alter table companies add column if not exists commercial_name text;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare requested text := coalesce(new.raw_user_meta_data->>'role','customer');
        nm text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), 'حساب جديد');
        biz text := nullif(trim(new.raw_user_meta_data->>'business_name'),'');
        mid uuid;
begin
  if requested not in ('customer','employee','merchant','company') then requested := 'customer'; end if;
  insert into user_profiles(id, full_name, phone, email)
    values (new.id, nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.email);
  insert into user_roles(user_id, role_id) select new.id, id from roles where name = requested;
  if requested = 'merchant' then
    insert into merchants(owner_id, business_name, store_name, owner_name)
      values (new.id, coalesce(biz, 'متجر ' || nm), coalesce(biz, 'متجر ' || nm), nm) returning id into mid;
    insert into stores(merchant_id, name, city) values (mid, coalesce(biz, 'متجر ' || nm), new.raw_user_meta_data->>'city');
  elsif requested = 'company' then
    insert into companies(owner_id, name, contact_name, phone, city)
      values (new.id, coalesce(biz, 'شركة ' || nm), nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.raw_user_meta_data->>'city');
  end if;
  return new;
end $$;

-- Public list of active companies (an employee picks theirs). No owner, no register number.
create or replace view companies_public as select id, name, city from companies where status = 'active';
grant select on companies_public to anon, authenticated;

-- ═════════ 3. Employee <-> company ═════════
create or replace function join_company(p_company uuid, p_job text default null, p_number text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); eid uuid; nm text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not has_role('employee') then raise exception 'only employee accounts can join a company'; end if;
  if not exists (select 1 from companies where id = p_company and status = 'active') then raise exception 'company is not active'; end if;
  select full_name into nm from user_profiles where id = uid;
  insert into employees(user_id, company_id, job_title, employee_number, full_name, status)
    values (uid, p_company, nullif(trim(p_job),''), nullif(trim(p_number),''), nm, 'active')
    on conflict (user_id) do update set company_id = excluded.company_id,
      job_title = coalesce(excluded.job_title, employees.job_title),
      employee_number = coalesce(excluded.employee_number, employees.employee_number),
      eligibility = case when employees.company_id is distinct from excluded.company_id then 'pending' else employees.eligibility end
    returning id into eid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'employee_joined_company', 'employee', eid::text, jsonb_build_object('company', p_company));
  return eid;
end $$;

create or replace function company_set_employee(p_emp uuid, p_eligibility text, p_limit numeric, p_salary numeric default null, p_status text default null)
returns void language plpgsql security definer set search_path = public as $$
declare e employees;
begin
  select * into e from employees where id = p_emp;
  if not found then raise exception 'employee not found'; end if;
  if not (is_admin() or exists (select 1 from companies c where c.id = e.company_id and c.owner_id = auth.uid() and c.status = 'active')) then
    raise exception 'not allowed';
  end if;
  if p_eligibility not in ('pending','eligible','ineligible') then raise exception 'invalid eligibility'; end if;
  if p_limit is null or p_limit < e.used_limit then raise exception 'limit cannot be below the amount already used'; end if;
  if p_status is not null and p_status not in ('active','on_leave','suspended','terminated') then raise exception 'invalid status'; end if;
  update employees set eligibility = p_eligibility, installment_limit = p_limit,
    salary = coalesce(p_salary, salary), status = coalesce(p_status, status) where id = p_emp;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'employee_limits_set', 'employee', p_emp::text,
            jsonb_build_object('eligibility', p_eligibility, 'limit', p_limit, 'status', p_status));
end $$;

-- ═════════ 4. Helpers ═════════
create or replace function _notify(p_user uuid, p_title text, p_body text, p_type text default 'system', p_link text default null) returns void
language sql security definer set search_path = public as $$
  insert into notifications(user_id, title, body, type, link) values (p_user, p_title, p_body, p_type, p_link);
$$;
revoke execute on function _notify(uuid,text,text,text,text) from public, anon, authenticated;

-- Put the stock back (once) when an order is cancelled or refused.
create or replace function _cancel_order(p_order uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  select status into cur from orders where id = p_order for update;
  if cur is null or cur in ('cancelled','delivered','refunded') then return; end if;
  update products p set stock = p.stock + i.quantity from order_items i where i.order_id = p_order and i.product_id = p.id;
  update orders set status = 'cancelled' where id = p_order;
  insert into order_status_history(order_id, status, changed_by, note) values (p_order, 'cancelled', auth.uid(), p_note);
end $$;
revoke execute on function _cancel_order(uuid,text) from public, anon, authenticated;

-- ═════════ 5. Company decision ═════════
create or replace function company_decide_application(p_app uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a financing_applications;
begin
  select * into a from financing_applications where id = p_app for update;
  if not found then raise exception 'application not found'; end if;
  if not (is_admin() or exists (select 1 from companies c where c.id = a.company_id and c.owner_id = auth.uid())) then
    raise exception 'not allowed';
  end if;
  if a.review_stage <> 'company' or a.status not in ('new','under_review') then raise exception 'application is not waiting for the company'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then raise exception 'a reason is required to reject'; end if;
  if p_approve then
    update financing_applications set company_approved = true, review_stage = 'admin', status = 'under_review',
      company_note = p_note, company_decided_by = auth.uid(), company_decided_at = now() where id = p_app;
  else
    update financing_applications set company_approved = false, status = 'rejected', rejection_reason = p_note,
      company_note = p_note, company_decided_by = auth.uid(), company_decided_at = now() where id = p_app;
    if a.order_id is not null then perform _cancel_order(a.order_id, 'company rejected the application'); end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), case when p_approve then 'company_approved_application' else 'company_rejected_application' end,
            'financing_application', p_app::text, jsonb_build_object('note', p_note));
  perform _notify(a.applicant_user_id, case when p_approve then 'وافقت شركتك على طلب التقسيط' else 'رفضت شركتك طلب التقسيط' end,
                  coalesce(p_note,''), 'installment');
end $$;

-- ═════════ 6. Admin / financing staff decision -> contract + schedule ═════════
create or replace function decide_application(p_app uuid, p_approve boolean, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare a financing_applications; e employees; cid uuid; n int; monthly numeric; amt numeric; idv text;
begin
  if not (is_admin() or has_permission('financing.review')) then raise exception 'not allowed'; end if;
  select * into a from financing_applications where id = p_app for update;
  if not found then raise exception 'application not found'; end if;
  if a.review_stage <> 'admin' or a.status in ('approved','rejected','completed') then raise exception 'application is not waiting for the platform'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then raise exception 'a reason is required to reject'; end if;

  if not p_approve then
    update financing_applications set status = 'rejected', rejection_reason = p_note, admin_note = p_note,
      admin_decided_by = auth.uid(), admin_decided_at = now() where id = p_app;
    if a.order_id is not null then perform _cancel_order(a.order_id, 'application rejected'); end if;
    insert into audit_logs(actor_id, action, entity, entity_id, details)
      values (auth.uid(), 'application_rejected', 'financing_application', p_app::text, jsonb_build_object('note', p_note));
    perform _notify(a.applicant_user_id, 'تم رفض طلب التقسيط', coalesce(p_note,''), 'installment');
    return null;
  end if;

  select identity_status into idv from user_profiles where id = a.applicant_user_id;
  if idv is distinct from 'verified' then raise exception 'the applicant identity is not verified yet'; end if;
  if a.employee_id is not null then
    select * into e from employees where id = a.employee_id for update;
    if e.eligibility <> 'eligible' then raise exception 'the employee is not eligible'; end if;
    if e.used_limit + a.deferred_price > e.installment_limit then raise exception 'installment limit exceeded'; end if;
    update employees set used_limit = used_limit + a.deferred_price where id = e.id;
  end if;

  insert into contracts(application_id, status, contract_number, start_date)
    values (p_app, 'active', 'CON-' || nextval('contract_number_seq'), current_date) returning id into cid;
  monthly := a.monthly_installment;
  for n in 1..a.months loop
    amt := case when n = a.months then a.deferred_price - monthly * (a.months - 1) else monthly end;
    insert into installments(contract_id, number, due_date, amount, status)
      values (cid, n, current_date + 30 * n, amt, case when n = 1 then 'due' else 'upcoming' end);
  end loop;
  update financing_applications set status = 'approved', admin_note = p_note,
    admin_decided_by = auth.uid(), admin_decided_at = now() where id = p_app;
  if a.order_id is not null then
    update orders set status = 'approved' where id = a.order_id and status in ('new','under_review','awaiting_payment');
    insert into order_status_history(order_id, status, changed_by, note) values (a.order_id, 'approved', auth.uid(), 'financing approved');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'application_approved', 'financing_application', p_app::text, jsonb_build_object('contract', cid));
  perform _notify(a.applicant_user_id, 'تمت الموافقة على طلب التقسيط', 'تم إنشاء عقدك وجدول الأقساط', 'installment');
  return cid;
end $$;

-- ═════════ 7. Payments ═════════
create or replace function record_payment(p_installment uuid, p_amount numeric, p_method text default 'cash') returns uuid
language plpgsql security definer set search_path = public as $$
declare i installments; k contracts; a financing_applications; pid uuid; left_n int;
begin
  if not (is_admin() or has_permission('payments.record')) then raise exception 'not allowed'; end if;
  select * into i from installments where id = p_installment for update;
  if not found then raise exception 'installment not found'; end if;
  if i.status = 'paid' then raise exception 'installment already paid'; end if;
  if p_amount is distinct from i.amount then raise exception 'amount must equal the installment amount (%)', i.amount; end if;
  select * into k from contracts where id = i.contract_id;
  select * into a from financing_applications where id = k.application_id;

  insert into payments(installment_id, amount, method, recorded_by, contract_id, order_id, payment_number, status)
    values (i.id, p_amount, nullif(trim(p_method),''), auth.uid(), k.id, a.order_id,
            'PAY-' || upper(substr(gen_random_uuid()::text, 1, 8)), 'succeeded') returning id into pid;
  update installments set status = 'paid' where id = i.id;
  if a.employee_id is not null then
    update employees set used_limit = greatest(0, used_limit - p_amount) where id = a.employee_id;
  end if;
  select count(*) into left_n from installments where contract_id = k.id and status <> 'paid';
  if left_n = 0 then
    update contracts set status = 'completed' where id = k.id;
    update financing_applications set status = 'completed' where id = a.id;
    perform _notify(a.applicant_user_id, 'اكتمل سداد العقد', 'شكراً لالتزامك', 'payment');
  else
    update installments set status = 'due' where id = (select id from installments where contract_id = k.id and status = 'upcoming' order by number limit 1)
      and not exists (select 1 from installments where contract_id = k.id and status in ('due','late','overdue'));
    perform _notify(a.applicant_user_id, 'تم تسجيل دفعة', 'القسط رقم ' || i.number || ' بمبلغ ' || p_amount, 'payment');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'payment_recorded', 'installment', i.id::text, jsonb_build_object('amount', p_amount, 'method', p_method));
  return pid;
end $$;

-- Late flags: any signed-in user may trigger the refresh (it only moves dates forward and touches no money).
create or replace function refresh_installment_status() returns void
language sql security definer set search_path = public as $$
  update installments set status = 'overdue' where status = 'due' and due_date < current_date;
  update contracts c set status = 'defaulted' where c.status = 'active' and exists
    (select 1 from installments i where i.contract_id = c.id and i.status = 'overdue' and i.due_date < current_date - 60);
$$;

-- ═════════ 8. Orders ═════════
create or replace function update_order_status(p_order uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o orders; uid uuid := auth.uid(); staff boolean; mine boolean; owner boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  staff := is_admin() or has_permission('orders.update');
  owner := o.user_id = uid;
  mine := exists (select 1 from order_items i join merchants m on m.id = i.merchant_id where i.order_id = p_order and m.owner_id = uid);
  if not (staff or owner or mine) then raise exception 'not allowed'; end if;
  if p_status not in ('under_review','approved','processing','shipped','delivered','cancelled','delivery_failed','returned','refunded') then
    raise exception 'invalid status';
  end if;
  if o.status in ('cancelled','refunded') then raise exception 'order is closed'; end if;
  if o.status = 'delivered' and p_status not in ('returned','refunded') then raise exception 'order is already delivered'; end if;
  if not staff then
    if owner and not mine then
      if not (p_status = 'cancelled' and o.status in ('new','under_review','awaiting_payment')) then raise exception 'you can only cancel an order that is not yet approved'; end if;
    else
      if p_status not in ('processing','shipped') then raise exception 'merchants may set processing or shipped only'; end if;
    end if;
  end if;
  if o.payment_method = 'installment' and p_status in ('processing','shipped','delivered') and o.status not in ('approved','processing','shipped') then
    raise exception 'an installment order must be approved before it is prepared or shipped';
  end if;

  if p_status = 'cancelled' then
    perform _cancel_order(p_order, coalesce(p_note, 'cancelled'));
    update financing_applications set status = 'rejected', rejection_reason = coalesce(p_note, 'order cancelled')
      where order_id = p_order and status not in ('approved','completed','rejected');
  else
    update orders set status = p_status where id = p_order;
    insert into order_status_history(order_id, status, changed_by, note) values (p_order, p_status, uid, p_note);
    if p_status = 'delivered' and o.payment_method = 'cash_on_delivery' then
      update merchants m set sales_total = sales_total + s.g from
        (select merchant_id, sum(quantity * unit_price) g from order_items where order_id = p_order and merchant_id is not null group by 1) s
        where m.id = s.merchant_id;
    end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'order_status_changed', 'order', p_order::text, jsonb_build_object('from', o.status, 'to', p_status));
  perform _notify(o.user_id, 'تحديث على طلبك ' || o.order_number, p_status, 'order', '/customer/orders');
end $$;

-- ═════════ 9. Platform staff: entity status & settlements ═════════
create or replace function set_merchant_status(p_merchant uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_permission('merchants.manage')) then raise exception 'not allowed'; end if;
  if p_status not in ('pending','active','suspended') then raise exception 'invalid status'; end if;
  update merchants set status = p_status where id = p_merchant;
  if not found then raise exception 'merchant not found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'merchant_status_changed', 'merchant', p_merchant::text, jsonb_build_object('status', p_status));
  perform _notify((select owner_id from merchants where id = p_merchant), 'تحديث حالة متجرك', p_status, 'system');
end $$;

create or replace function set_company_status(p_company uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_permission('financing.review')) then raise exception 'not allowed'; end if;
  if p_status not in ('pending','active','suspended') then raise exception 'invalid status'; end if;
  update companies set status = p_status where id = p_company;
  if not found then raise exception 'company not found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'company_status_changed', 'company', p_company::text, jsonb_build_object('status', p_status));
  perform _notify((select owner_id from companies where id = p_company), 'تحديث حالة شركتك', p_status, 'system');
end $$;

create or replace function set_commission_settlement(p_commission uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare c commissions; sid uuid;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('processing','in_progress','paid') then raise exception 'invalid status'; end if;
  select * into c from commissions where id = p_commission for update;
  if not found then raise exception 'commission not found'; end if;
  if c.settlement_id is null then
    insert into settlements(merchant_id, gross, commission, net, status, created_by)
      values (c.merchant_id, c.gross, c.commission, c.net, p_status, auth.uid()) returning id into sid;
    update commissions set settlement_id = sid where id = c.id;
  else
    update settlements set status = p_status, paid_at = case when p_status = 'paid' then now() end where id = c.settlement_id;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'settlement_status', 'commission', p_commission::text, jsonb_build_object('status', p_status));
end $$;

-- ═════════ 10. Grants ═════════
revoke execute on function join_company(uuid,text,text), company_set_employee(uuid,text,numeric,numeric,text),
  company_decide_application(uuid,boolean,text), decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  refresh_installment_status(), update_order_status(uuid,text,text), set_merchant_status(uuid,text),
  set_company_status(uuid,text), set_commission_settlement(uuid,text) from public, anon;
grant execute on function join_company(uuid,text,text), company_set_employee(uuid,text,numeric,numeric,text),
  company_decide_application(uuid,boolean,text), decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  refresh_installment_status(), update_order_status(uuid,text,text), set_merchant_status(uuid,text),
  set_company_status(uuid,text), set_commission_settlement(uuid,text) to authenticated;

-- Read access the dashboards need beyond what 0001-0012 grant
create policy applicant_contracts on contracts for select using (exists (
  select 1 from financing_applications a where a.id = application_id and a.applicant_user_id = auth.uid()));
create policy applicant_installments on installments for select using (exists (
  select 1 from contracts k join financing_applications a on a.id = k.application_id
  where k.id = contract_id and a.applicant_user_id = auth.uid()));
create policy applicant_payments on payments for select using (exists (
  select 1 from installments i join contracts k on k.id = i.contract_id join financing_applications a on a.id = k.application_id
  where i.id = installment_id and a.applicant_user_id = auth.uid()));
create policy company_contracts on contracts for select using (exists (
  select 1 from financing_applications a join companies c on c.id = a.company_id where a.id = application_id and c.owner_id = auth.uid()));
create policy company_installments on installments for select using (exists (
  select 1 from contracts k join financing_applications a on a.id = k.application_id join companies c on c.id = a.company_id
  where k.id = contract_id and c.owner_id = auth.uid()));
-- (helper bypasses RLS so orders <-> order_items policies cannot recurse)
create or replace function _merchant_has_order(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from order_items i join merchants m on m.id = i.merchant_id where i.order_id = p_order and m.owner_id = auth.uid());
$$;
create policy merchant_orders on orders for select using (_merchant_has_order(id));
create policy staff_commissions_fin on commissions for select using (has_permission('financing.view'));
create policy own_company_employees_profiles on user_profiles for select using (exists (
  select 1 from employees e join companies c on c.id = e.company_id where e.user_id = user_profiles.id and c.owner_id = auth.uid()));
