-- 0010: checkout. The ONLY way to create an order (0004 removed the direct INSERT policy).
-- Prices, discounts, stock, merchant, markup and installment amounts are all decided here; the client sends
-- only product ids, quantities, delivery data and (for installments) months, guarantee and branch.
-- Apply after 0009.

create or replace function place_order(
  p_items jsonb,                      -- [{"product_id": "...", "quantity": 2}, ...]
  p_payment text,                     -- 'cash_on_delivery' | 'installment'
  p_recipient text, p_phone text,
  p_governorate text, p_city text, p_address text, p_notes text default null,
  p_months int default null,
  p_guarantee_type_id int default null,
  p_guarantee_details jsonb default '{}'::jsonb,
  p_guarantor_name text default null, p_guarantor_phone text default null, p_guarantor_id_number text default null,
  p_branch_id uuid default null
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
begin
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
                     subtotal, discount, shipping, total)
    values (uid, p_payment, case p_payment when 'installment' then 'under_review' else 'new' end,
            trim(p_recipient), trim(p_phone), trim(p_governorate), trim(p_city), trim(p_address), p_notes, 0, 0, 0, 0)
    returning id into oid;                       -- trg_require_active_account runs here

  for r in
    select l.p as product_id, l.q as qty, p.name, p.cash_price, p.discount_percent, p.stock, p.active,
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
    unit := round(r.cash_price * (1 - r.discount_percent / 100.0));
    update products set stock = stock - r.qty where id = r.product_id;
    insert into order_items(order_id, product_id, merchant_id, quantity, unit_price, installment_months)
      values (oid, r.product_id, r.merchant_id, r.qty, unit,
              case p_payment when 'installment' then p_months end);   -- commission row via trigger
    v_sub := v_sub + unit * r.qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub where id = oid;
  insert into order_status_history(order_id, status, changed_by, note)
    values (oid, case p_payment when 'installment' then 'under_review' else 'new' end, uid, 'order placed');

  if p_payment = 'installment' then
    select * into emp from employees where user_id = uid;
    -- financing_before_insert (0005) validates guarantee/branch/audience and fixes the price and markup.
    insert into financing_applications(employee_id, applicant_user_id, company_id, order_id, cash_price, months,
        guarantee_type_id, guarantor_name, guarantor_phone, guarantor_id_number, branch_id)
      values (emp.id, uid, emp.company_id, oid, v_sub, p_months,
        p_guarantee_type_id, nullif(trim(p_guarantor_name),''), nullif(trim(p_guarantor_phone),''),
        nullif(trim(p_guarantor_id_number),''), p_branch_id);
    insert into financing_guarantee_details(application_id, details)
      select a.id, coalesce(p_guarantee_details, '{}'::jsonb) from financing_applications a where a.order_id = oid;
  end if;

  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'order_placed', 'order', oid::text,
            jsonb_build_object('payment', p_payment, 'total', v_sub, 'months', p_months));
  return oid;
end $$;

revoke execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid) from public, anon;
grant execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid) to authenticated;
