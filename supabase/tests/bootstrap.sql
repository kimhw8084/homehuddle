-- Minimal Supabase contracts for an isolated vanilla PostgreSQL test cluster.
-- This does not test GoTrue, PostgREST, Realtime or the Storage HTTP service.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text);
create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1];
$$;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to authenticated;
create publication supabase_realtime;

create schema test;
create function test.assert_true(value boolean, description text) returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'ASSERTION FAILED: %', description; end if;
  raise notice 'PASS: %', description;
end;
$$;
create function test.expect_error(statement text, description text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute statement; exception when others then failed := true; end;
  perform test.assert_true(failed, description);
end;
$$;
grant usage on schema test to anon, authenticated;
