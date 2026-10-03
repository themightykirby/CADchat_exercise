create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  cube_id text not null,
  comment text not null,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_cube_id_key unique (cube_id),
  constraint reviews_comment_not_blank check (length(btrim(comment)) > 0)
);

alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated;

grant select, insert, update, delete on table public.reviews to service_role;

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create function public.replace_review(p_cube_id text, p_comment text)
returns public.reviews
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.reviews;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_cube_id, 0));
  delete from public.reviews where cube_id = p_cube_id;
  insert into public.reviews (cube_id, comment)
  values (p_cube_id, p_comment)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.replace_review(text, text) from public, anon, authenticated;
grant execute on function public.replace_review(text, text) to service_role;
