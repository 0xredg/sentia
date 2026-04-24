alter table public.users
  add column if not exists builder_access_status text not null default 'none',
  add column if not exists builder_access_granted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_builder_access_status_check'
  ) then
    alter table public.users
      add constraint users_builder_access_status_check
        check (builder_access_status in ('none', 'granted'));
  end if;
end $$;
