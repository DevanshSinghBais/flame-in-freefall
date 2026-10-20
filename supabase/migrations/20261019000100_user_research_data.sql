-- FLAME IN FREEFALL personal research data.
-- All saved publication metadata is fetched from NASA NTRS by the server route.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nasa_id text not null check (nasa_id ~ '^[0-9]{1,20}$' and nasa_id !~ '^0+$'),
  canonical_url text not null,
  title text not null check (char_length(title) between 1 and 1200),
  abstract text check (abstract is null or char_length(abstract) <= 30000),
  authors text[] not null default array[]::text[],
  publication_date text,
  doi text,
  document_type text,
  center text,
  subject_categories text[] not null default array[]::text[],
  source_retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_papers_ntrs_url_matches_id
    check (canonical_url = 'https://ntrs.nasa.gov/citations/' || nasa_id),
  constraint saved_papers_user_nasa_id_unique unique (user_id, nasa_id),
  constraint saved_papers_user_id_id_unique unique (user_id, id)
);

create table public.research_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_collections_user_id_id_unique unique (user_id, id)
);

create unique index research_collections_user_name_unique
  on public.research_collections (user_id, lower(name));

create table public.collection_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null,
  saved_paper_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (collection_id, saved_paper_id),
  constraint collection_items_collection_owner_fk
    foreign key (user_id, collection_id)
    references public.research_collections (user_id, id) on delete cascade,
  constraint collection_items_paper_owner_fk
    foreign key (user_id, saved_paper_id)
    references public.saved_papers (user_id, id) on delete cascade
);

create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  saved_paper_id uuid not null,
  content text not null check (char_length(btrim(content)) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_notes_user_saved_paper_unique unique (user_id, saved_paper_id),
  constraint personal_notes_paper_owner_fk
    foreign key (user_id, saved_paper_id)
    references public.saved_papers (user_id, id) on delete cascade
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  query text not null check (char_length(btrim(query)) between 1 and 300),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_papers_user_updated_idx on public.saved_papers (user_id, updated_at desc);
create index research_collections_user_created_idx on public.research_collections (user_id, created_at desc);
create index collection_items_user_id_idx on public.collection_items (user_id);
create index collection_items_collection_created_idx on public.collection_items (collection_id, created_at desc);
create index collection_items_saved_paper_idx on public.collection_items (saved_paper_id);
create index personal_notes_user_id_idx on public.personal_notes (user_id);
create index saved_searches_user_created_idx on public.saved_searches (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger saved_papers_set_updated_at
  before update on public.saved_papers
  for each row execute function public.set_updated_at();
create trigger research_collections_set_updated_at
  before update on public.research_collections
  for each row execute function public.set_updated_at();
create trigger personal_notes_set_updated_at
  before update on public.personal_notes
  for each row execute function public.set_updated_at();
create trigger saved_searches_set_updated_at
  before update on public.saved_searches
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name)
select u.id, nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'display_name'), '')
from auth.users as u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.saved_papers enable row level security;
alter table public.research_collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.personal_notes enable row level security;
alter table public.saved_searches enable row level security;

revoke all on table public.profiles, public.saved_papers, public.research_collections,
  public.collection_items, public.personal_notes, public.saved_searches from public, anon, authenticated;

-- Public-table exposure is opt-in for this project. Grant schema access
-- explicitly to the authenticated Data API role; table grants and RLS below
-- continue to restrict access to each user's own records.
grant usage on schema public to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, delete on table public.saved_papers to authenticated;
grant select, insert, update, delete on table public.research_collections to authenticated;
grant select, insert, delete on table public.collection_items to authenticated;
grant select, insert, update, delete on table public.personal_notes to authenticated;
grant select, insert, update, delete on table public.saved_searches to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy saved_papers_select_own on public.saved_papers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_papers_insert_own on public.saved_papers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_papers_delete_own on public.saved_papers
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy research_collections_select_own on public.research_collections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy research_collections_insert_own on public.research_collections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy research_collections_update_own on public.research_collections
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy research_collections_delete_own on public.research_collections
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy collection_items_select_own on public.collection_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy collection_items_insert_own on public.collection_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy collection_items_delete_own on public.collection_items
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy personal_notes_select_own on public.personal_notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy personal_notes_insert_own on public.personal_notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy personal_notes_update_own on public.personal_notes
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy personal_notes_delete_own on public.personal_notes
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy saved_searches_select_own on public.saved_searches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_searches_insert_own on public.saved_searches
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_searches_update_own on public.saved_searches
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy saved_searches_delete_own on public.saved_searches
  for delete to authenticated using ((select auth.uid()) = user_id);
