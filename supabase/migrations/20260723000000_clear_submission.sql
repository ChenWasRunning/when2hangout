create or replace function public.clear_submission(
  p_token_hash text,
  p_display_name text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count int;
begin
  if p_token_hash is null or char_length(p_token_hash) < 32 then
    raise exception 'invalid participant token hash';
  end if;

  if p_display_name is null or char_length(btrim(p_display_name)) < 1 or char_length(btrim(p_display_name)) > 30 then
    raise exception 'invalid display name';
  end if;

  delete from public.participants
  where participant_token_hash = p_token_hash
    and display_name = btrim(p_display_name);

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count > 0;
end;
$$;

revoke all on function public.clear_submission(text, text) from public, anon, authenticated;
grant execute on function public.clear_submission(text, text) to service_role;
