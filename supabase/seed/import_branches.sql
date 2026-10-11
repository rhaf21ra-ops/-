-- Imports Al-Kuraimi branches from supabase/seed/kuraimi_branches.csv (run from the repo root):
--   psql "$DATABASE_URL" -f supabase/seed/import_branches.sql
-- Re-running updates existing branches instead of duplicating them (key: bank + region + name).
-- Only `name` and `region` are required. latitude/longitude may be empty, but a branch without them
-- never appears in "nearest branch" results (it still appears in the region list).
begin;
create temp table stg (code text, name text, region text, city text, governorate text, address text, phone text,
                       latitude numeric, longitude numeric, working_hours text) on commit drop;
\copy stg from 'supabase/seed/kuraimi_branches.csv' with (format csv, header true)
delete from stg where nullif(trim(name), '') is null or nullif(trim(region), '') is null;
insert into branches(bank, code, name, region, city, governorate, address, phone, latitude, longitude, working_hours)
  select 'الكريمي', nullif(code,''), trim(name), trim(region), nullif(city,''), nullif(governorate,''), nullif(address,''),
         nullif(phone,''), latitude, longitude, nullif(working_hours,'') from stg
  on conflict (bank, (coalesce(region, '')), name) do update set
    code = excluded.code, city = excluded.city, governorate = excluded.governorate, address = excluded.address,
    phone = excluded.phone, latitude = excluded.latitude, longitude = excluded.longitude,
    working_hours = excluded.working_hours, active = true;
select region, count(*) as branches from branches where bank = 'الكريمي' group by region order by region;
commit;
