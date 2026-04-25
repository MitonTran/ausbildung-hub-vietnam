-- ===================================================================
-- Ausbildung Hub Vietnam — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Includes:
--   1. Enum types
--   2. Tables (all 14 entities)
--   3. Indexes
--   4. Row Level Security policies (see policies.sql for details)
-- ===================================================================

-- 1. ENUMS
do $$ begin
  create type user_role as enum ('student', 'center', 'employer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('verified', 'pending', 'unverified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type german_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type training_type as enum ('Dual', 'Schulisch');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_status as enum ('approved', 'pending', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type article_category as enum
    ('Chính sách', 'Thị trường', 'Kinh nghiệm', 'Học bổng', 'Tài trợ');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_category as enum
    ('Hỏi đáp', 'Kinh nghiệm', 'Hồ sơ', 'Việc làm', 'Thông báo');
exception when duplicate_object then null; end $$;

-- 2. TABLES

-- profiles — extends auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text unique not null,
  phone text,
  avatar_url text,
  role user_role not null default 'student',
  city text,
  german_level german_level,
  target_occupation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- centers
create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text unique not null,
  logo_url text,
  city text not null,
  address text,
  website text,
  phone text,
  description text,
  german_levels german_level[] default '{}',
  tuition_min int default 0,
  tuition_max int default 0,
  verification_status verification_status default 'unverified',
  rating_avg numeric(2,1) default 0,
  review_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- center_reviews
create table if not exists public.center_reviews (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  proof_url text,
  status moderation_status default 'pending',
  created_at timestamptz default now()
);

-- class_intakes
create table if not exists public.class_intakes (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  level german_level not null,
  start_date date not null,
  schedule text,
  seats_left int default 0,
  tuition int default 0,
  created_at timestamptz default now()
);

-- teachers
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  full_name text not null,
  level german_level,
  years_exp int default 0,
  avatar_url text,
  bio text
);

-- companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text unique not null,
  logo_url text,
  industry text,
  city text,
  state text,
  country text default 'Đức',
  website text,
  description text,
  verification_status verification_status default 'unverified',
  rating_avg numeric(2,1) default 0,
  job_count int default 0,
  satisfaction_rate int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- job_orders
create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  slug text unique not null,
  occupation text not null,
  training_type training_type default 'Dual',
  city text not null,
  state text not null,
  german_level_required german_level not null,
  education_required text,
  monthly_allowance_min int default 0,
  monthly_allowance_max int default 0,
  start_date date,
  interview_date date,
  deadline date,
  description text,
  requirements text[] default '{}',
  benefits text[] default '{}',
  status text default 'open' check (status in ('open','closed','draft')),
  verification_status verification_status default 'unverified',
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  status text default 'pending' check (status in ('pending','reviewing','interviewing','offered','rejected','withdrawn')),
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- articles
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  category article_category default 'Thị trường',
  cover_image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  is_sponsored boolean default false,
  read_time int default 5,
  views int default 0,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  tags text[] default '{}'
);

-- community_posts
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  category post_category default 'Hỏi đáp',
  like_count int default 0,
  comment_count int default 0,
  status moderation_status default 'pending',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null,
  status moderation_status default 'pending',
  created_at timestamptz default now()
);

-- reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post','review','job','user','comment')),
  target_id uuid not null,
  reason text not null,
  status text default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- verification_requests
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('center','company','job_order')),
  entity_id uuid not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz
);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_name text not null,
  status text default 'active' check (status in ('active','cancelled','expired','trial')),
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  amount int not null,
  currency text default 'VND',
  status text default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  provider text,
  created_at timestamptz default now()
);

-- 3. INDEXES
create index if not exists idx_centers_city on public.centers(city);
create index if not exists idx_centers_verification on public.centers(verification_status);
create index if not exists idx_companies_industry on public.companies(industry);
create index if not exists idx_companies_state on public.companies(state);
create index if not exists idx_jobs_state on public.job_orders(state);
create index if not exists idx_jobs_occupation on public.job_orders(occupation);
create index if not exists idx_jobs_status on public.job_orders(status);
create index if not exists idx_jobs_featured on public.job_orders(is_featured);
create index if not exists idx_articles_category on public.articles(category);
create index if not exists idx_articles_published on public.articles(published_at desc);
create index if not exists idx_posts_category on public.community_posts(category);
create index if not exists idx_posts_status on public.community_posts(status);

-- 4. RLS — see ./policies.sql for the full set
alter table public.profiles               enable row level security;
alter table public.centers                 enable row level security;
alter table public.center_reviews          enable row level security;
alter table public.class_intakes           enable row level security;
alter table public.teachers                enable row level security;
alter table public.companies               enable row level security;
alter table public.job_orders              enable row level security;
alter table public.applications            enable row level security;
alter table public.articles                enable row level security;
alter table public.community_posts         enable row level security;
alter table public.comments                enable row level security;
alter table public.reports                 enable row level security;
alter table public.verification_requests   enable row level security;
alter table public.subscriptions           enable row level security;
alter table public.payments                enable row level security;

-- helper: detect admin role from the user's profile
create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;
