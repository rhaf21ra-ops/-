-- 0018: multi-currency (YER, SAR, USD) for products, orders and installments + real invoices (QR, public verification).
-- Apply after 0017. Safe to run on a database that already has 0001..0017.

-- ═════════ 1. Currencies and exchange rates ═════════
-- yer_per_unit = how many Yemeni rials equal ONE unit of the currency. YER is always 1.
-- The owner sets SAR and USD from the admin settings. The seeded numbers are placeholders: CHANGE THEM before launch.
create table if not exists exchange_rates (
  code text primary key check (code in ('YER','SAR','USD')),
  yer_per_unit numeric(14,4) not null check (yer_per_unit > 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check (code <> 'YER' or yer_per_unit = 1)
);
insert into exchange_rates(code, yer_per_unit) values ('YER', 1), ('SAR', 140), ('USD', 530) on conflict (code) do nothing;
alter table exchange_rates enable row level security;
drop policy if exists rates_read on exchange_rates;
create policy rates_read on exchange_rates for select using (true);   -- public: shown in the shop

create or replace function set_exchange_rate(p_code text, p_rate numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_code not in ('SAR','USD') then raise exception 'only SAR and USD rates can be changed'; end if;
  if p_rate is null or p_rate <= 0 or p_rate > 1000000 then raise exception 'invalid rate'; end if;
  update exchange_rates set yer_per_unit = p_rate, updated_by = auth.uid(), updated_at = now() where code = p_code;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'exchange_rate_set', 'exchange_rate', p_code, jsonb_build_object('yer_per_unit', p_rate));
end $$;
revoke execute on function set_exchange_rate(text,numeric) from public, anon;
grant execute on function set_exchange_rate(text,numeric) to authenticated;

create or replace function _round_money(p_amount numeric, p_cur text) returns numeric
language sql immutable as $$ select case p_cur when 'YER' then round(p_amount, 0) else round(p_amount, 2) end $$;

create or replace function _fx_convert(p_amount numeric, p_from text, p_to text) returns numeric
language plpgsql stable set search_path = public as $$
declare rf numeric; rt numeric;
begin
  if p_from = p_to then return p_amount; end if;
  select yer_per_unit into rf from exchange_rates where code = p_from;
  select yer_per_unit into rt from exchange_rates where code = p_to;
  if rf is null or rt is null then raise exception 'unknown currency'; end if;
  return p_amount * rf / rt;
end $$;

-- ═════════ 2. Currency columns ═════════
alter table products add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table orders add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table order_items add column if not exists orig_currency text check (orig_currency in ('YER','SAR','USD'));
alter table order_items add column if not exists orig_unit_price numeric(14,2);
alter table order_items add column if not exists fx_rate numeric(18,8);
alter table financing_applications add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table commissions add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table settlements add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));

-- Commission is rounded in the order's own currency.
drop function if exists compute_commission(numeric, int);
create or replace function compute_commission(gross numeric, pct int, cur text default 'YER') returns numeric
language sql immutable as $$ select _round_money(gross * pct / 100.0, cur) $$;

create or replace function order_item_commission() returns trigger
language plpgsql security definer set search_path = public as $$
declare pct int; g numeric; c numeric; cur text;
begin
  if new.merchant_id is null then return new; end if;
  select commission_percent into pct from merchants where id = new.merchant_id;
  select currency into cur from orders where id = new.order_id;
  g := new.quantity * new.unit_price;
  c := compute_commission(g, pct, cur);
  insert into commissions(order_item_id, merchant_id, percent, gross, commission, net, currency)
  values (new.id, new.merchant_id, pct, g, c, g - c, cur);
  return new;
end $$;

-- ═════════ 3. Invoices ═════════
alter table invoices
  add column if not exists kind text not null default 'sale' check (kind in ('sale','installment_sale')),
  add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD')),
  add column if not exists buyer_id uuid references auth.users(id),
  add column if not exists buyer_name text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_address text,
  add column if not exists merchant_name text,
  add column if not exists payment_method text,
  add column if not exists months int,
  add column if not exists markup_percent numeric(5,2),
  add column if not exists deferred_total numeric(14,2),
  add column if not exists monthly numeric(14,2),
  add column if not exists contract_id uuid references contracts(id),
  add column if not exists verify_code text unique default upper(encode(gen_random_bytes(8), 'hex')),
  add column if not exists status text not null default 'issued' check (status in ('issued','void'));
update invoices set verify_code = upper(encode(gen_random_bytes(8), 'hex')) where verify_code is null;
create index if not exists idx_invoices_buyer on invoices(buyer_id, issued_at desc);

drop policy if exists buyer_invoices on invoices;
create policy buyer_invoices on invoices for select using (buyer_id = auth.uid());

-- Builds one invoice per merchant for an order (idempotent). Internal: called by checkout and by the approval step.
create or replace function _issue_invoices(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  o orders; a financing_applications; c contracts; prof record; mn record;
  groups jsonb; g jsonb; n int := 0; i int := 0; cnt int;
  sub numeric; share_def numeric; run_def numeric := 0; run_mon numeric := 0; share_mon numeric;
  items jsonb;
begin
  select * into o from orders where id = p_order;
  if not found then raise exception 'order not found'; end if;
  select * into a from financing_applications where order_id = p_order;
  if o.payment_method = 'installment' then
    if a.id is null then return 0; end if;
    select * into c from contracts where application_id = a.id;
    if c.id is null then return 0; end if;           -- no invoice before the contract exists
  end if;
  select full_name, phone into prof from user_profiles where id = o.user_id;

  select coalesce(jsonb_agg(x order by x->>'merchant'), '[]'::jsonb) into groups from (
    select jsonb_build_object('merchant', coalesce(oi.merchant_id::text, ''),
             'sub', sum(oi.quantity * oi.unit_price),
             'items', jsonb_agg(jsonb_build_object(
                 'product_id', oi.product_id, 'name', p.name, 'qty', oi.quantity, 'unit_price', oi.unit_price,
                 'line_total', oi.quantity * oi.unit_price, 'orig_currency', oi.orig_currency,
                 'orig_unit_price', oi.orig_unit_price) order by p.name)) as x
      from order_items oi join products p on p.id = oi.product_id
     where oi.order_id = p_order group by oi.merchant_id) q;
  cnt := jsonb_array_length(groups);

  for g in select * from jsonb_array_elements(groups) loop
    i := i + 1;
    sub := (g->>'sub')::numeric;
    items := g->'items';
    select m.id, coalesce(m.store_name, m.business_name) as nm into mn from merchants m where m.id = nullif(g->>'merchant','')::uuid;
    if o.payment_method = 'installment' then
      -- every merchant invoice carries its proportional share of the deferred price; the last one absorbs rounding
      if i = cnt then share_def := a.deferred_price - run_def; share_mon := a.monthly_installment - run_mon;
      else
        share_def := _round_money(a.deferred_price * sub / nullif(o.subtotal,0), o.currency);
        share_mon := _round_money(a.monthly_installment * sub / nullif(o.subtotal,0), o.currency);
      end if;
      run_def := run_def + share_def; run_mon := run_mon + share_mon;
    end if;
    insert into invoices(order_id, merchant_id, items_json, subtotal, discount, shipping, total, kind, currency,
        buyer_id, buyer_name, buyer_phone, buyer_address, merchant_name, payment_method, months, markup_percent,
        deferred_total, monthly, contract_id)
      values (p_order, mn.id, items, sub, 0, 0, sub,
        case o.payment_method when 'installment' then 'installment_sale' else 'sale' end, o.currency,
        o.user_id, coalesce(nullif(o.recipient_name,''), prof.full_name), coalesce(nullif(o.phone,''), prof.phone),
        o.governorate || ' - ' || o.city || ' - ' || o.address, mn.nm, o.payment_method,
        case when o.payment_method = 'installment' then a.months end,
        case when o.payment_method = 'installment' then a.markup_percent_applied end,
        case when o.payment_method = 'installment' then share_def end,
        case when o.payment_method = 'installment' then share_mon end,
        c.id)
      on conflict (order_id, merchant_id) do nothing;
    if found then n := n + 1; end if;
  end loop;
  if n > 0 then
    perform _notify(o.user_id, 'صدرت فاتورتك', 'يمكنك عرضها وتنزيلها PDF من صفحة فواتيري', 'system', '/invoices');
  end if;
  return n;
end $$;
revoke execute on function _issue_invoices(uuid) from public, anon, authenticated;

-- Staff can still (re)issue the invoices of an order by hand; it never duplicates.
create or replace function issue_invoice(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_permission('orders.update')) then raise exception 'not allowed'; end if;
  return _issue_invoices(p_order);
end $$;

-- Public check behind the QR code. Shows what proves the invoice is genuine and nothing personal.
create or replace function verify_invoice(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i invoices; nm text;
begin
  if p_code is null or length(p_code) not between 8 and 40 then return jsonb_build_object('valid', false); end if;
  select * into i from invoices where verify_code = upper(trim(p_code));
  if not found then return jsonb_build_object('valid', false); end if;
  nm := coalesce(i.buyer_name, '');
  return jsonb_build_object(
    'valid', i.status = 'issued', 'status', i.status, 'invoice_number', i.invoice_number, 'issued_at', i.issued_at,
    'kind', i.kind, 'currency', i.currency, 'total', i.total, 'deferred_total', i.deferred_total, 'months', i.months,
    'merchant_name', i.merchant_name,
    'buyer_masked', case when length(nm) > 0 then left(nm, 1) || repeat('*', greatest(length(nm) - 1, 2)) else null end);
end $$;
revoke execute on function verify_invoice(text) from public;
grant execute on function verify_invoice(text) to anon, authenticated;

-- ═════════ Re-created functions (currency aware) ═════════
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
  new.currency := coalesce(new.currency, 'YER');
  new.deferred_price := _round_money(new.cash_price * (1 + m / 100), new.currency);
  new.monthly_installment := _round_money(new.deferred_price / new.months, new.currency);
  return new;
end $$;

create or replace function place_order(
  p_items jsonb,                      -- [{"product_id": "...", "quantity": 2}, ...]
  p_payment text,                     -- 'cash_on_delivery' | 'installment'
  p_recipient text, p_phone text,
  p_governorate text, p_city text, p_address text, p_notes text default null,
  p_months int default null,
  p_guarantee_type_id int default null,
  p_guarantee_details jsonb default '{}'::jsonb,
  p_guarantor_name text default null, p_guarantor_phone text default null, p_guarantor_id_number text default null,
  p_branch_id uuid default null,
  p_currency text default 'YER'          -- 'YER' | 'SAR' | 'USD': the currency the buyer pays / installs in
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  emp employees;
  v_sub numeric(14,2) := 0;
  v_lines jsonb;
  v_n int;
  r record;
  unit numeric(14,2);
  cur text := upper(coalesce(nullif(trim(p_currency),''), 'YER'));
  base numeric;
begin
  if cur not in ('YER','SAR','USD') then raise exception 'unsupported currency'; end if;
  if uid is null then raise exception 'not authenticated'; end if;
  if p_payment not in ('cash_on_delivery','installment') then raise exception 'invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'cart must contain 1 to 50 lines';
  end if;
  if length(trim(coalesce(p_recipient,''))) < 2 or length(trim(coalesce(p_phone,''))) < 7
     or length(trim(coalesce(p_governorate,''))) < 2 or length(trim(coalesce(p_city,''))) < 2
     or length(trim(coalesce(p_address,''))) < 3 then
    raise exception 'delivery data is incomplete';
  end if;
  if p_payment = 'installment' and p_months is null then raise exception 'installment months are required'; end if;

  -- Lines: validate shape, merge duplicates, lock product rows in a stable order (no deadlocks).
  select jsonb_agg(jsonb_build_object('p', pid, 'q', qty)) into v_lines from (
    select (x->>'product_id')::uuid as pid, sum((x->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) x group by 1) g;
  select count(*) into v_n from jsonb_to_recordset(v_lines) as l(p uuid, q int);
  if exists (select 1 from jsonb_to_recordset(v_lines) as l(p uuid, q int) where q < 1 or q > 100) then
    raise exception 'invalid quantity';
  end if;
  perform 1 from products where id in (select p from jsonb_to_recordset(v_lines) as l(p uuid, q int))
    order by id for update;

  insert into orders(user_id, payment_method, status, recipient_name, phone, governorate, city, address, notes,
                     subtotal, discount, shipping, total, currency)
    values (uid, p_payment, case p_payment when 'installment' then 'under_review' else 'new' end,
            trim(p_recipient), trim(p_phone), trim(p_governorate), trim(p_city), trim(p_address), p_notes, 0, 0, 0, 0, cur)
    returning id into oid;                       -- trg_require_active_account runs here

  for r in
    select l.p as product_id, l.q as qty, p.name, p.cash_price, p.discount_percent, p.stock, p.active, p.currency as pcur,
           s.merchant_id, m.status as mstatus
      from jsonb_to_recordset(v_lines) as l(p uuid, q int)
      left join products p on p.id = l.p
      left join stores s on s.id = p.store_id
      left join merchants m on m.id = s.merchant_id
     order by l.p
  loop
    if r.name is null or not r.active then raise exception 'product not available: %', r.product_id; end if;
    if r.mstatus is distinct from 'active' then raise exception 'merchant is not active for product: %', r.name; end if;
    if r.stock < r.qty then raise exception 'insufficient stock: %', r.name; end if;
    base := _round_money(r.cash_price * (1 - r.discount_percent / 100.0), r.pcur);   -- price in the product's own currency
    unit := _round_money(_fx_convert(base, r.pcur, cur), cur);                      -- price in the buyer's currency
    update products set stock = stock - r.qty where id = r.product_id;
    insert into order_items(order_id, product_id, merchant_id, quantity, unit_price, installment_months,
                            orig_currency, orig_unit_price, fx_rate)
      values (oid, r.product_id, r.merchant_id, r.qty, unit,
              case p_payment when 'installment' then p_months end,
              r.pcur, base, _fx_convert(1, r.pcur, cur));   -- commission row via trigger
    v_sub := v_sub + unit * r.qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub where id = oid;
  insert into order_status_history(order_id, status, changed_by, note)
    values (oid, case p_payment when 'installment' then 'under_review' else 'new' end, uid, 'order placed');

  if p_payment = 'installment' then
    select * into emp from employees where user_id = uid;
    -- financing_before_insert (0005) validates guarantee/branch/audience and fixes the price and markup.
    insert into financing_applications(employee_id, applicant_user_id, company_id, order_id, cash_price, months,
        guarantee_type_id, guarantor_name, guarantor_phone, guarantor_id_number, branch_id, currency)
      values (emp.id, uid, emp.company_id, oid, v_sub, p_months,
        p_guarantee_type_id, nullif(trim(p_guarantor_name),''), nullif(trim(p_guarantor_phone),''),
        nullif(trim(p_guarantor_id_number),''), p_branch_id, cur);
    insert into financing_guarantee_details(application_id, details)
      select a.id, coalesce(p_guarantee_details, '{}'::jsonb) from financing_applications a where a.order_id = oid;
  end if;

  if p_payment <> 'installment' then perform _issue_invoices(oid); end if;   -- installment invoices are issued on approval

  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'order_placed', 'order', oid::text,
            jsonb_build_object('payment', p_payment, 'total', v_sub, 'months', p_months, 'currency', cur));
  return oid;
end $$;

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
    if e.used_limit + _fx_convert(a.deferred_price, a.currency, 'YER') > e.installment_limit then raise exception 'installment limit exceeded'; end if;
    update employees set used_limit = used_limit + _fx_convert(a.deferred_price, a.currency, 'YER') where id = e.id;
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
  if a.order_id is not null then perform _issue_invoices(a.order_id); end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'application_approved', 'financing_application', p_app::text, jsonb_build_object('contract', cid));
  perform _notify(a.applicant_user_id, 'تمت الموافقة على طلب التقسيط', 'تم إنشاء عقدك وجدول الأقساط وفاتورتك', 'installment');
  return cid;
end $$;

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
    update employees set used_limit = greatest(0, used_limit - _fx_convert(p_amount, a.currency, 'YER')) where id = a.employee_id;
  end if;
  select count(*) into left_n from installments where contract_id = k.id and status <> 'paid';
  if left_n = 0 then
    update contracts set status = 'completed' where id = k.id;
    update financing_applications set status = 'completed' where id = a.id;
    perform _notify(a.applicant_user_id, 'اكتمل سداد العقد', 'شكراً لالتزامك', 'payment');
  else
    update installments set status = 'due' where id = (select id from installments where contract_id = k.id and status = 'upcoming' order by number limit 1)
      and not exists (select 1 from installments where contract_id = k.id and status in ('due','late','overdue'));
    perform _notify(a.applicant_user_id, 'تم تسجيل دفعة', 'القسط رقم ' || i.number || ' بمبلغ ' || p_amount || ' ' || a.currency, 'payment');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'payment_recorded', 'installment', i.id::text, jsonb_build_object('amount', p_amount, 'method', p_method));
  return pid;
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
    insert into settlements(merchant_id, gross, commission, net, status, created_by, currency)
      values (c.merchant_id, c.gross, c.commission, c.net, p_status, auth.uid(), c.currency) returning id into sid;
    update commissions set settlement_id = sid where id = c.id;
  else
    update settlements set status = p_status, paid_at = case when p_status = 'paid' then now() end where id = c.settlement_id;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'settlement_status', 'commission', p_commission::text, jsonb_build_object('status', p_status));
end $$;

-- ═════════ Grants for the re-created checkout ═════════
drop function if exists place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid);
revoke execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid,text) from public, anon;
grant execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid,text) to authenticated;
revoke execute on function decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  set_commission_settlement(uuid,text) from public, anon;
grant execute on function decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  set_commission_settlement(uuid,text) to authenticated;
