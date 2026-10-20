begin;

select plan(14);

-- Disposable database fixtures only. These records are not published content.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.saved_papers (user_id, nasa_id, canonical_url, title)
values
  ('10000000-0000-4000-8000-000000000001', '900000000001', 'https://ntrs.nasa.gov/citations/900000000001', 'RLS fixture A'),
  ('20000000-0000-4000-8000-000000000002', '900000000002', 'https://ntrs.nasa.gov/citations/900000000002', 'RLS fixture B');

insert into public.research_collections (id, user_id, name)
values
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'RLS fixture A'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'RLS fixture B');

insert into public.collection_items (user_id, collection_id, saved_paper_id)
select sp.user_id, rc.id, sp.id
from public.saved_papers as sp
join public.research_collections as rc on rc.user_id = sp.user_id;

insert into public.personal_notes (user_id, saved_paper_id, content)
select user_id, id, 'Private RLS fixture note'
from public.saved_papers;

insert into public.saved_searches (user_id, name, query)
values
  ('10000000-0000-4000-8000-000000000001', 'Fixture A', 'fixture-a'),
  ('20000000-0000-4000-8000-000000000002', 'Fixture B', 'fixture-b');

select ok(
  has_schema_privilege('authenticated', 'public', 'USAGE'),
  'authenticated role has explicit public schema usage for the Data API'
);

set local role anon;
select throws_ok(
  $$select * from public.saved_papers$$,
  '42501', 'permission denied for table saved_papers',
  'anonymous role cannot read saved papers'
);
select throws_ok(
  $$insert into public.research_collections (user_id, name) values ('10000000-0000-4000-8000-000000000001', 'anon write')$$,
  '42501', 'permission denied for table research_collections',
  'anonymous role cannot create collections'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.profiles), 1::bigint, 'user A reads only their profile');
select is((select count(*) from public.saved_papers), 1::bigint, 'user A reads only their saved papers');
select is((select count(*) from public.research_collections), 1::bigint, 'user A reads only their collections');
select is((select count(*) from public.collection_items), 1::bigint, 'user A reads only their collection items');
select is((select count(*) from public.personal_notes), 1::bigint, 'user A reads only their personal notes');
select is((select count(*) from public.saved_searches), 1::bigint, 'user A reads only their saved searches');
select is(
  (with changed as (update public.research_collections set name = 'changed by A' where id = '40000000-0000-4000-8000-000000000004' returning id) select count(*) from changed),
  0::bigint,
  'user A cannot modify user B collection'
);
select is(
  (with removed as (delete from public.personal_notes where user_id = '20000000-0000-4000-8000-000000000002' returning id) select count(*) from removed),
  0::bigint,
  'user A cannot delete user B note'
);
select throws_ok(
  $$insert into public.saved_searches (user_id, name, query) values ('20000000-0000-4000-8000-000000000002', 'cross-user', 'cross-user')$$,
  '42501', 'new row violates row-level security policy for table "saved_searches"',
  'user A cannot create data owned by user B'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.saved_papers), 1::bigint, 'user B reads their own saved paper');
select is((select count(*) from public.personal_notes), 1::bigint, 'user B reads their own note');

select * from finish();
rollback;
