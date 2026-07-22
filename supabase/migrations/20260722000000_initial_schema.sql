create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type meal_type as enum ('lunch', 'dinner');
  end if;
end $$;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  participant_token_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  date date not null check (date between date '2026-07-27' and date '2026-08-30'),
  meal meal_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, date, meal)
);

alter table public.participants enable row level security;
alter table public.availability enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists participants_set_updated_at on public.participants;
create trigger participants_set_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

drop trigger if exists availability_set_updated_at on public.availability;
create trigger availability_set_updated_at
before update on public.availability
for each row execute function public.set_updated_at();

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
    and slot_meal in ('lunch', 'dinner')
  on conflict (participant_id, date, meal) do nothing;

  if (
    select count(*)
    from jsonb_to_recordset(p_slots) as item(slot_date text, slot_meal text)
  ) <> (
    select count(*)
    from jsonb_to_recordset(p_slots) as item(slot_date text, slot_meal text)
    where slot_date between '2026-07-27' and '2026-08-30'
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
    'slots', v_slots
  );
end;
$$;

create or replace function public.get_public_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with dates as (
    select generate_series(date '2026-07-27', date '2026-08-30', interval '1 day')::date as date
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
      count(a.id)::int as available_count,
      coalesce(
        jsonb_agg(p.display_name order by p.display_name) filter (where p.id is not null),
        '[]'::jsonb
      ) as participant_names
    from all_slots s
    left join public.availability a
      on a.date = s.date and a.meal = s.meal
    left join public.participants p
      on p.id = a.participant_id
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
        'availableCount', slot_stats.available_count,
        'participantNames', slot_stats.participant_names
      )
      order by slot_stats.date, slot_stats.meal
    ), '[]'::jsonb)
  )
  from slot_stats;
$$;

revoke all on public.participants from anon, authenticated;
revoke all on public.availability from anon, authenticated;
revoke all on function public.submit_availability(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_my_submission(text) from public, anon, authenticated;
revoke all on function public.get_public_stats() from public, anon, authenticated;
grant execute on function public.submit_availability(text, text, jsonb) to service_role;
grant execute on function public.get_my_submission(text) to service_role;
grant execute on function public.get_public_stats() to service_role;
