alter table public.participants
add column if not exists participation_status text not null default 'available';

alter table public.participants
drop constraint if exists participants_participation_status_check;

alter table public.participants
add constraint participants_participation_status_check
check (participation_status in ('available', 'unavailable'));

update public.participants
set participation_status = 'available'
where participation_status is null;

drop function if exists public.submit_availability(text, text, jsonb);

create or replace function public.submit_availability(
  p_token_hash text,
  p_display_name text,
  p_slots jsonb,
  p_participation_status text default 'available'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_participation_status text := coalesce(p_participation_status, 'available');
begin
  if p_token_hash is null or char_length(p_token_hash) < 32 then
    raise exception 'invalid participant token hash';
  end if;

  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 30 then
    raise exception 'invalid display name';
  end if;

  if jsonb_typeof(p_slots) <> 'array' then
    raise exception 'invalid slots payload';
  end if;

  if v_participation_status not in ('available', 'unavailable') then
    raise exception 'invalid participation status';
  end if;

  if v_participation_status = 'unavailable' and jsonb_array_length(p_slots) > 0 then
    raise exception 'unavailable submission cannot include slots';
  end if;

  select id
  into v_participant_id
  from public.participants
  where participant_token_hash = p_token_hash;

  if found then
    update public.participants
    set
      display_name = btrim(p_display_name),
      participation_status = v_participation_status,
      updated_at = now()
    where id = v_participant_id;
  else
    select id
    into v_participant_id
    from public.participants
    where display_name = btrim(p_display_name)
    order by updated_at desc
    limit 1;

    if found then
      update public.participants
      set
        participant_token_hash = p_token_hash,
        display_name = btrim(p_display_name),
        participation_status = v_participation_status,
        updated_at = now()
      where id = v_participant_id;
    else
      insert into public.participants (display_name, participant_token_hash, participation_status)
      values (btrim(p_display_name), p_token_hash, v_participation_status)
      returning id into v_participant_id;
    end if;
  end if;

  delete from public.availability
  where participant_id = v_participant_id;

  insert into public.availability (participant_id, date, meal)
  select
    v_participant_id,
    slot_date::date,
    slot_meal::meal_type
  from jsonb_to_recordset(p_slots) as item(slot_date text, slot_meal text)
  where slot_date between '2026-07-27' and '2026-08-30'
    and extract(isodow from slot_date::date) in (5, 6, 7)
    and slot_meal in ('lunch', 'dinner')
  on conflict (participant_id, date, meal) do nothing;

  if (
    select count(*)
    from jsonb_to_recordset(p_slots) as item(slot_date text, slot_meal text)
  ) <> (
    select count(*)
    from jsonb_to_recordset(p_slots) as item(slot_date text, slot_meal text)
    where slot_date between '2026-07-27' and '2026-08-30'
      and extract(isodow from slot_date::date) in (5, 6, 7)
      and slot_meal in ('lunch', 'dinner')
  ) then
    raise exception 'invalid slot value';
  end if;

  return v_participant_id;
end;
$$;

create or replace function public.get_my_submission(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants%rowtype;
  v_slots jsonb;
begin
  select *
  into v_participant
  from public.participants
  where participant_token_hash = p_token_hash;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('date', to_char(a.date, 'YYYY-MM-DD'), 'meal', a.meal)
      order by a.date, a.meal
    ),
    '[]'::jsonb
  )
  into v_slots
  from public.availability a
  where a.participant_id = v_participant.id;

  return jsonb_build_object(
    'displayName', v_participant.display_name,
    'participationStatus', v_participant.participation_status,
    'slots', v_slots
  );
end;
$$;

create or replace function public.get_submission_by_name(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants%rowtype;
  v_slots jsonb;
begin
  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 30 then
    raise exception 'invalid display name';
  end if;

  select *
  into v_participant
  from public.participants
  where display_name = btrim(p_display_name)
  order by updated_at desc
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('date', to_char(a.date, 'YYYY-MM-DD'), 'meal', a.meal)
      order by a.date, a.meal
    ),
    '[]'::jsonb
  )
  into v_slots
  from public.availability a
  where a.participant_id = v_participant.id;

  return jsonb_build_object(
    'displayName', v_participant.display_name,
    'participationStatus', v_participant.participation_status,
    'slots', v_slots
  );
end;
$$;

drop view if exists public.owner_availability_matrix;

create view public.owner_availability_matrix as
select
  p.display_name as "名字",
  to_char(p.updated_at at time zone 'Asia/Shanghai', 'FMMM.FMDD HH24:MI') as "提交时间",
  case p.participation_status
    when 'unavailable' then '本次无法参与'
    else '可参与'
  end as "状态",
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

revoke all on function public.submit_availability(text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.get_my_submission(text) from public, anon, authenticated;
revoke all on function public.get_submission_by_name(text) from public, anon, authenticated;
grant execute on function public.submit_availability(text, text, jsonb, text) to service_role;
grant execute on function public.get_my_submission(text) to service_role;
grant execute on function public.get_submission_by_name(text) to service_role;
