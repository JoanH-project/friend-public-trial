-- Run once on an existing project to enable the public case forum.
create policy "public create cases" on public.cases for insert with check (true);
create policy "public update cases" on public.cases for update using (true) with check (true);
