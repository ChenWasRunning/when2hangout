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

revoke all on function public.get_public_stats() from public, anon, authenticated;
grant execute on function public.get_public_stats() to service_role;
