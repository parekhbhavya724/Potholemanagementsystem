-- =======================================================
-- PotholeFix Supabase PostgreSQL Schema
-- =======================================================
-- Instructions:
-- 1. Create a free project at https://supabase.com
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Paste this entire script and click "Run"
-- =======================================================

-- 1. Create reports table
create table if not exists public.reports (
    id text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    lat double precision not null,
    lon double precision not null,
    address text not null,
    severity text not null check (severity in ('high', 'medium', 'low')),
    width numeric,
    depth numeric,
    description text,
    email text not null,
    image text,
    status text not null default 'reported' check (status in ('reported', 'assigned', 'in_progress', 'resolved')),
    submitted_date date default current_date,
    assigned_to text default 'Pending',
    progress_percent integer default 0
);

-- 2. Enable Row Level Security (RLS)
alter table public.reports enable row level security;

-- 3. Create open access policies for public civic reports
create policy "Allow read access to reports" on public.reports
    for select using (true);

create policy "Allow insert of reports" on public.reports
    for insert with check (true);

create policy "Allow update of reports" on public.reports
    for update using (true);

-- 4. Enable Realtime Sync
alter publication supabase_realtime add table public.reports;
