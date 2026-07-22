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
    'slots', v_slots
  );
end;
$$;

revoke all on function public.get_submission_by_name(text) from public, anon, authenticated;
grant execute on function public.get_submission_by_name(text) to service_role;
