create or replace view public.owner_availability_matrix as
select
  p.display_name as "名字",
  to_char(p.updated_at at time zone 'Asia/Shanghai', 'FMMM.FMDD HH24:MI') as "提交时间",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-07-31' and a.meal = 'lunch') then 1 else 0 end as "7.31 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-07-31' and a.meal = 'dinner') then 1 else 0 end as "7.31 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-01' and a.meal = 'lunch') then 1 else 0 end as "8.1 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-01' and a.meal = 'dinner') then 1 else 0 end as "8.1 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-02' and a.meal = 'lunch') then 1 else 0 end as "8.2 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-02' and a.meal = 'dinner') then 1 else 0 end as "8.2 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-07' and a.meal = 'lunch') then 1 else 0 end as "8.7 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-07' and a.meal = 'dinner') then 1 else 0 end as "8.7 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-08' and a.meal = 'lunch') then 1 else 0 end as "8.8 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-08' and a.meal = 'dinner') then 1 else 0 end as "8.8 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-09' and a.meal = 'lunch') then 1 else 0 end as "8.9 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-09' and a.meal = 'dinner') then 1 else 0 end as "8.9 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-14' and a.meal = 'lunch') then 1 else 0 end as "8.14 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-14' and a.meal = 'dinner') then 1 else 0 end as "8.14 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-15' and a.meal = 'lunch') then 1 else 0 end as "8.15 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-15' and a.meal = 'dinner') then 1 else 0 end as "8.15 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-16' and a.meal = 'lunch') then 1 else 0 end as "8.16 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-16' and a.meal = 'dinner') then 1 else 0 end as "8.16 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-21' and a.meal = 'lunch') then 1 else 0 end as "8.21 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-21' and a.meal = 'dinner') then 1 else 0 end as "8.21 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-22' and a.meal = 'lunch') then 1 else 0 end as "8.22 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-22' and a.meal = 'dinner') then 1 else 0 end as "8.22 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-23' and a.meal = 'lunch') then 1 else 0 end as "8.23 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-23' and a.meal = 'dinner') then 1 else 0 end as "8.23 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-28' and a.meal = 'lunch') then 1 else 0 end as "8.28 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-28' and a.meal = 'dinner') then 1 else 0 end as "8.28 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-29' and a.meal = 'lunch') then 1 else 0 end as "8.29 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-29' and a.meal = 'dinner') then 1 else 0 end as "8.29 晚",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-30' and a.meal = 'lunch') then 1 else 0 end as "8.30 午",
  case when exists (select 1 from public.availability a where a.participant_id = p.id and a.date = date '2026-08-30' and a.meal = 'dinner') then 1 else 0 end as "8.30 晚"
from public.participants p
order by p.updated_at asc, p.display_name;

revoke all on public.owner_availability_matrix from public, anon, authenticated;
grant select on public.owner_availability_matrix to service_role;
