-- 0009: Al-Kuraimi groups branches by its own "منطقة" (region), which is NOT the governorate
-- (e.g. منطقة عدن also holds Lahj/Abyan/Dhale branches, منطقة صنعاء holds Dhamar/Al-Bayda/Amran/Al-Jawf).
-- Apply after 0008.
alter table branches add column region text;
drop index branches_unique;
create unique index branches_unique on branches (bank, (coalesce(region, '')), name);

drop function nearest_branches(double precision, double precision, int);
create function nearest_branches(lat double precision, lng double precision, lim int default 5)
returns table(id uuid, name text, region text, city text, governorate text, address text, phone text,
              working_hours text, distance_km double precision)
language sql stable as $$
  select * from (
    select b.id, b.name, b.region, b.city, b.governorate, b.address, b.phone, b.working_hours,
           6371 * 2 * asin(sqrt(power(sin(radians(b.latitude::float8 - lat) / 2), 2)
             + cos(radians(lat)) * cos(radians(b.latitude::float8)) * power(sin(radians(b.longitude::float8 - lng) / 2), 2))) as distance_km
    from branches b where b.active and b.latitude is not null and b.longitude is not null) x
  order by distance_km limit least(greatest(lim, 1), 50)
$$;
