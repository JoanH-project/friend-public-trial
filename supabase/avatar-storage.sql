-- Run once: creates a public avatar bucket and permits friend-group image uploads.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;
create policy "public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "public upload avatars" on storage.objects for insert with check (bucket_id = 'avatars');
