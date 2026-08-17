-- Friend Public Trial · CloudBase PostgreSQL
-- Run once in CloudBase: SQL 型数据库 → SQL 编辑器.
-- This intentionally permits lightweight public contributions. Do not use it
-- for personal, sensitive or real accusations.

create extension if not exists pgcrypto;

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name varchar(24) not null check (char_length(trim(name)) > 0),
  title varchar(36) not null check (char_length(trim(title)) > 0),
  avatar_url text,
  punishment varchar(48) not null default '请大家喝奶茶',
  heat_count integer not null default 0 check (heat_count >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_case_slug() returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := 'case-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;
  return new;
end;
$$;
drop trigger if exists cases_set_slug on public.cases;
create trigger cases_set_slug before insert on public.cases for each row execute function public.set_case_slug();

create table if not exists public.crimes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  title varchar(28) not null,
  description varchar(120) not null,
  severity smallint not null default 4 check (severity between 1 and 5),
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.vote_options (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  label varchar(32) not null,
  vote_count integer not null default 0 check (vote_count >= 0),
  sort_order integer not null default 1
);

create or replace function public.add_default_votes() returns trigger language plpgsql as $$
begin
  insert into public.vote_options (case_id, label, sort_order) values
    (new.id, '有罪', 1), (new.id, '极其有罪', 2), (new.id, '罪大恶极', 3), (new.id, '请奶茶赎罪', 4);
  return new;
end;
$$;
drop trigger if exists cases_add_default_votes on public.cases;
create trigger cases_add_default_votes after insert on public.cases for each row execute function public.add_default_votes();

-- Atomic counters avoid lost updates when multiple friends click together.
create or replace function public.increment_heat(p_case_id uuid) returns integer language plpgsql security definer set search_path = public as $$
declare next_count integer;
begin
  update cases set heat_count = heat_count + 1 where id = p_case_id returning heat_count into next_count;
  if next_count is null then raise exception 'case not found'; end if;
  return next_count;
end;
$$;

create or replace function public.increment_vote(p_option_id uuid) returns integer language plpgsql security definer set search_path = public as $$
declare next_count integer;
begin
  update vote_options set vote_count = vote_count + 1 where id = p_option_id returning vote_count into next_count;
  if next_count is null then raise exception 'vote option not found'; end if;
  return next_count;
end;
$$;

alter table public.cases enable row level security;
alter table public.crimes enable row level security;
alter table public.vote_options enable row level security;

grant select, insert, update on public.cases to anon, authenticated;
grant select, insert on public.crimes to anon, authenticated;
grant select on public.vote_options to anon, authenticated;
grant execute on function public.increment_heat(uuid) to anon, authenticated;
grant execute on function public.increment_vote(uuid) to anon, authenticated;

create policy cases_read_public on public.cases for select to anon, authenticated using (true);
create policy cases_create_public on public.cases for insert to anon, authenticated with check (true);
create policy cases_edit_public on public.cases for update to anon, authenticated using (true) with check (true);
create policy crimes_read_public on public.crimes for select to anon, authenticated using (true);
create policy crimes_create_public on public.crimes for insert to anon, authenticated with check (true);
create policy votes_read_public on public.vote_options for select to anon, authenticated using (true);

insert into public.cases (slug, name, title, punishment, heat_count)
select 'demo', '小王', '一级拖延重犯', '请大家喝奶茶', 10
where not exists (select 1 from public.cases where slug = 'demo');

insert into public.crimes (case_id, title, description, severity, sort_order)
select case_id, title, description, severity, sort_order from (
  select (select id from public.cases where slug = 'demo') as case_id, '「马上到了」' as title, '发送该消息时仍然躺在床上' as description, 5 as severity, 1 as sort_order union all
  select (select id from public.cases where slug = 'demo'), '「吃什么都可以」', '连续否决六家餐厅', 5, 2 union all
  select (select id from public.cases where slug = 'demo'), '「已读但不回」', '三天后只发来一张表情包', 4, 3
) seed where not exists (select 1 from public.crimes where case_id = seed.case_id);
