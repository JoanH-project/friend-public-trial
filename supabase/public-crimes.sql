-- Run this once on an existing Friend Public Trial project to enable public crime submissions.
create policy "public submit crimes" on public.crimes for insert with check (true);
alter publication supabase_realtime add table public.crimes;
