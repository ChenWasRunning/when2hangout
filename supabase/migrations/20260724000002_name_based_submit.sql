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

  select id
  into v_participant_id
  from public.participants
  where participant_token_hash = p_token_hash;

  if found then
    update public.participants
    set
      display_name = btrim(p_display_name),
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
        updated_at = now()
      where id = v_participant_id;
    else
      insert into public.participants (display_name, participant_token_hash)
      values (btrim(p_display_name), p_token_hash)
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

revoke all on function public.submit_availability(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_availability(text, text, jsonb) to service_role;
