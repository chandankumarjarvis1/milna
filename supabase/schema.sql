-- Milna MVP schema. Run once in Supabase SQL editor.
-- Auth: Supabase email magic link. Access gate: invite codes.

create extension if not exists "pgcrypto";

-- ---------- invite codes ----------
create table if not exists invite_codes (
  code text primary key,
  max_uses int not null default 1,
  used_count int not null default 0,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
alter table invite_codes enable row level security;
-- no policies on purpose: only the redeem_invite() function touches this table

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  age int check (age between 18 and 99),
  headline text not null check (char_length(headline) between 2 and 80),
  bio text check (char_length(bio) <= 200),
  interests text[] not null default '{}' check (array_length(interests, 1) is null or array_length(interests, 1) <= 5),
  open_to text[] not null default '{}',
  city text not null default 'Patna',
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'banned')),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- gender is private: separate table, owner-only
create table if not exists profile_private (
  id uuid primary key references profiles(id) on delete cascade,
  gender text check (gender in ('female', 'male', 'other', 'prefer_not'))
);
alter table profile_private enable row level security;

-- ---------- core tables ----------
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists connections_pair_uniq
  on connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
alter table connections enable row level security;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conn_idx on messages (connection_id, created_at);
alter table messages enable row level security;

create table if not exists cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default 'Patna',
  area text,
  address text,
  opens text,
  closes text,
  tags text[] not null default '{}',   -- e.g. conversation, business, first-meeting, quiet
  active boolean not null default true
);
alter table cafes enable row level security;

create table if not exists meets (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  proposer_id uuid not null references profiles(id) on delete cascade,
  cafe_id uuid not null references cafes(id),
  meet_at timestamptz not null,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);
-- one active meet per connection
create unique index if not exists meets_one_active
  on meets (connection_id) where status in ('proposed', 'confirmed');
alter table meets enable row level security;

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table blocks enable row level security;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);
alter table reports enable row level security;

-- ---------- helper functions ----------
create or replace function is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function is_party(conn uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from connections c
    where c.id = conn and auth.uid() in (c.requester_id, c.addressee_id)
  );
$$;

create or replace function is_accepted_party(conn uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_approved() and exists (
    select 1 from connections c
    join profiles other on other.id = case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end
    where c.id = conn and c.status = 'accepted'
      and auth.uid() in (c.requester_id, c.addressee_id)
      and other.status = 'approved'
      and not is_blocked_between(c.requester_id, c.addressee_id)
  );
$$;

-- Plan a Meet unlocks only after both people have sent at least one message
create or replace function can_plan_meet(conn uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_accepted_party(conn)
    and (select count(distinct sender_id) from messages where connection_id = conn) = 2;
$$;

-- Invite redemption: the only way a profile becomes approved
create or replace function redeem_invite(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from profiles where id = auth.uid() and status = 'pending') then
    return false;
  end if;

  update invite_codes
     set used_count = used_count + 1
   where code = upper(trim(p_code))
     and active
     and used_count < max_uses;

  if not found then return false; end if;
  update profiles set status = 'approved' where id = auth.uid();
  return true;
end;
$$;

-- Aggregated, anonymous cafe stats (no names, no genders)
create or replace function cafe_stats()
returns table (cafe_id uuid, meets_this_week bigint)
language sql stable security definer set search_path = public as $$
  select m.cafe_id, count(*)
  from meets m
  where is_approved()
    and m.status = 'confirmed'
    and m.meet_at >= now()
    and m.meet_at < now() + interval '7 days'
  group by m.cafe_id;
$$;

-- People you blocked. Needed because blocking hides their profile from you too.
create or replace function my_blocks()
returns table (blocked_id uuid, name text, photo_url text)
language sql stable security definer set search_path = public as $$
  select b.blocked_id, p.name, p.photo_url
  from blocks b
  join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid() and is_approved()
  order by b.created_at desc;
$$;

-- ---------- column-level privileges (users cannot touch status) ----------
revoke all on profiles from authenticated;
grant select on profiles to authenticated;
grant insert (id, name, age, headline, bio, interests, open_to, city, photo_url) on profiles to authenticated;
grant update (name, age, headline, bio, interests, open_to, city, photo_url, last_active_at) on profiles to authenticated;

grant select, insert, update on profile_private to authenticated;

revoke all on connections from authenticated;
grant select on connections to authenticated;
grant insert (requester_id, addressee_id) on connections to authenticated;
grant update (status) on connections to authenticated;

grant select, insert on messages to authenticated;
grant select on cafes to authenticated;

revoke all on meets from authenticated;
grant select on meets to authenticated;
grant insert (connection_id, proposer_id, cafe_id, meet_at) on meets to authenticated;
grant update (status) on meets to authenticated;

grant select, insert, delete on blocks to authenticated;
grant insert on reports to authenticated;

-- ---------- RLS policies ----------
-- profiles
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or (is_approved() and status = 'approved' and not is_blocked_between(auth.uid(), id))
  );
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- profile_private
create policy private_all on profile_private for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- connections
create policy conn_select on connections for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy conn_insert on connections for insert to authenticated
  with check (
    requester_id = auth.uid()
    and is_approved()
    and not is_blocked_between(requester_id, addressee_id)
    and exists (select 1 from profiles p where p.id = addressee_id and p.status = 'approved')
  );
create policy conn_update on connections for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending' and is_approved())
  with check (addressee_id = auth.uid() and status in ('accepted', 'declined'));

-- messages
create policy msg_select on messages for select to authenticated
  using (is_accepted_party(connection_id));
create policy msg_insert on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_accepted_party(connection_id));

-- cafes
create policy cafes_select on cafes for select to authenticated
  using (is_approved() and active);

-- meets
create policy meets_select on meets for select to authenticated
  using (is_party(connection_id));
create policy meets_insert on meets for insert to authenticated
  with check (
    proposer_id = auth.uid()
    and can_plan_meet(connection_id)
    and meet_at > now()
    and exists (select 1 from cafes where id = cafe_id and active)
  );
create policy meets_update on meets for update to authenticated
  using (is_accepted_party(connection_id) and status in ('proposed', 'confirmed'))
  with check (
    is_accepted_party(connection_id)
    and (
      (status = 'cancelled' and proposer_id = auth.uid())
      or (status in ('confirmed', 'declined') and proposer_id <> auth.uid())
    )
  );

-- blocks
create policy blocks_select on blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert on blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete on blocks for delete to authenticated using (blocker_id = auth.uid());

-- reports (write-only for users; you read them in the dashboard)
create policy reports_insert on reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ---------- realtime for chat ----------
alter publication supabase_realtime add table messages, meets;

-- ---------- storage: profile photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- seed (REPLACE with real partner cafes and your own codes) ----------
insert into invite_codes (code, max_uses, note) values ('MILNA-DEMO', 20, 'sample code, change me')
on conflict do nothing;

insert into cafes (name, area, address, opens, closes, tags) values
  ('Sample Cafe A (replace)', 'Boring Road', 'Add real address', '9:00 AM', '11:00 PM', '{conversation,first-meeting}'),
  ('Sample Cafe B (replace)', 'Kankarbagh', 'Add real address', '10:00 AM', '10:30 PM', '{quiet,first-meeting}'),
  ('Sample Cafe C (replace)', 'Patliputra', 'Add real address', '9:30 AM', '10:00 PM', '{business,conversation}');
