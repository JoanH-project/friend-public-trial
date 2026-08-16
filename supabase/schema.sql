-- Friend Public Trial: paste this entire file into Supabase SQL Editor and run it.
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
  title text not null, avatar_url text, punishment text not null, heat_count bigint not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.crimes (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete cascade,
  title text not null, description text not null, severity smallint not null check (severity between 1 and 5), sort_order smallint not null default 0
);
create table if not exists public.vote_options (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete cascade,
  label text not null, vote_count bigint not null default 0, sort_order smallint not null default 0
);
create index if not exists crimes_case_order on public.crimes(case_id, sort_order);
create index if not exists vote_options_case_order on public.vote_options(case_id, sort_order);

-- Anonymous visitors may read and increment counters, but cannot arbitrarily overwrite data.
alter table public.cases enable row level security;
alter table public.crimes enable row level security;
alter table public.vote_options enable row level security;
create policy "public read cases" on public.cases for select using (true);
create policy "public create cases" on public.cases for insert with check (true);
create policy "public update cases" on public.cases for update using (true) with check (true);
create policy "public read crimes" on public.crimes for select using (true);
create policy "public read options" on public.vote_options for select using (true);
create policy "public submit crimes" on public.crimes for insert with check (true);
grant usage on schema public to anon, authenticated;
grant select on public.cases, public.crimes, public.vote_options to anon, authenticated;

create or replace function public.increment_heat(target_case_id uuid) returns bigint language plpgsql security definer set search_path = public as $$
declare result bigint; begin update cases set heat_count = heat_count + 1 where id = target_case_id returning heat_count into result; if result is null then raise exception 'Case not found'; end if; return result; end; $$;
create or replace function public.increment_vote(target_option_id uuid) returns bigint language plpgsql security definer set search_path = public as $$
declare result bigint; begin update vote_options set vote_count = vote_count + 1 where id = target_option_id returning vote_count into result; if result is null then raise exception 'Vote option not found'; end if; return result; end; $$;
grant execute on function public.increment_heat(uuid) to anon, authenticated;
grant execute on function public.increment_vote(uuid) to anon, authenticated;

-- Realtime: this adds row updates to the publication listened to by the app.
alter publication supabase_realtime add table public.cases;
alter publication supabase_realtime add table public.vote_options;
alter publication supabase_realtime add table public.crimes;

insert into public.cases (slug, name, title, punishment, heat_count)
values ('demo', '小王', '一级拖延重犯', '请大家喝奶茶', 9)
on conflict (slug) do nothing;
insert into public.crimes (case_id, title, description, severity, sort_order)
select id, v.title, v.description, v.severity, v.sort_order from public.cases cross join (values
  ('「马上到了」', '发送该消息时仍然躺在床上', 5, 1), ('「吃什么都可以」', '连续否决六家餐厅', 5, 2), ('已读但不回', '三天后只发来一张表情包', 4, 3)
) as v(title, description, severity, sort_order) where slug = 'demo' and not exists (select 1 from public.crimes c where c.case_id = public.cases.id);
insert into public.vote_options (case_id, label, vote_count, sort_order)
select id, v.label, v.vote_count, v.sort_order from public.cases cross join (values
  ('有罪',128,1), ('极其有罪',356,2), ('罪大恶极',891,3), ('请奶茶赎罪',204,4)
) as v(label, vote_count, sort_order) where slug = 'demo' and not exists (select 1 from public.vote_options o where o.case_id = public.cases.id);
