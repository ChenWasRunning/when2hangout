delete from public.availability
where extract(isodow from date) not in (5, 6, 7);

alter table public.availability
drop constraint if exists availability_visible_weekday_check;

alter table public.availability
add constraint availability_visible_weekday_check
check (extract(isodow from date) in (5, 6, 7));

create or replace function public.submit_availability(
  p_token_hash text,
  p_display_name text,
  p_slots jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
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

  insert into public.participants (display_name, participant_token_hash)
  values (btrim(p_display_name), p_token_hash)
  on conflict (participant_token_hash)
  do update set
    display_name = excluded.display_name,
    updated_at = now()
  returning id into v_participant_id;

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

create or replace function public.get_public_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with dates as (
    select date
    from generate_series(date '2026-07-27', date '2026-08-30', interval '1 day') as item(date)
    where extract(isodow from date) in (5, 6, 7)
  ),
  meals as (
    select unnest(enum_range(null::meal_type)) as meal
  ),
  all_slots as (
    select dates.date, meals.meal
    from dates cross join meals
  ),
  slot_stats as (
    select
      s.date,
      s.meal,
      count(a.id)::int as available_count
    from all_slots s
    left join public.availability a
      on a.date = s.date and a.meal = s.meal
    group by s.date, s.meal
  ),
  total as (
    select count(*)::int as total_submissions
    from public.participants
  )
  select jsonb_build_object(
    'totalSubmissions', (select total_submissions from total),
    'slots', coalesce(jsonb_agg(
      jsonb_build_object(
        'date', to_char(slot_stats.date, 'YYYY-MM-DD'),
        'meal', slot_stats.meal,
        'availableCount', slot_stats.available_count
      )
      order by slot_stats.date, slot_stats.meal
    ), '[]'::jsonb)
  )
  from slot_stats;
$$;

revoke all on function public.submit_availability(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_public_stats() from public, anon, authenticated;
grant execute on function public.submit_availability(text, text, jsonb) to service_role;
grant execute on function public.get_public_stats() to service_role;
