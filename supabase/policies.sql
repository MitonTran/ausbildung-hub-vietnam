-- ===================================================================
-- Row Level Security policies
-- Apply AFTER schema.sql.
-- ===================================================================

-- profiles
drop policy if exists "profile_self_read" on public.profiles;
create policy "profile_self_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profile_self_update" on public.profiles;
create policy "profile_self_update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profile_self_insert" on public.profiles;
create policy "profile_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- centers
drop policy if exists "centers_public_read" on public.centers;
create policy "centers_public_read" on public.centers
  for select using (verification_status = 'verified' or owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "centers_owner_write" on public.centers;
create policy "centers_owner_write" on public.centers
  for all using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- center_reviews — anyone can read approved; author can write own
drop policy if exists "reviews_public_read" on public.center_reviews;
create policy "reviews_public_read" on public.center_reviews
  for select using (status = 'approved' or author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "reviews_author_write" on public.center_reviews;
create policy "reviews_author_write" on public.center_reviews
  for insert with check (auth.uid() = author_id);

drop policy if exists "reviews_admin_moderate" on public.center_reviews;
create policy "reviews_admin_moderate" on public.center_reviews
  for update using (public.is_admin(auth.uid()));

-- class_intakes
drop policy if exists "intakes_public_read" on public.class_intakes;
create policy "intakes_public_read" on public.class_intakes for select using (true);

drop policy if exists "intakes_owner_write" on public.class_intakes;
create policy "intakes_owner_write" on public.class_intakes
  for all using (
    exists (select 1 from public.centers c where c.id = center_id and (c.owner_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- teachers
drop policy if exists "teachers_public_read" on public.teachers;
create policy "teachers_public_read" on public.teachers for select using (true);

drop policy if exists "teachers_owner_write" on public.teachers;
create policy "teachers_owner_write" on public.teachers
  for all using (
    exists (select 1 from public.centers c where c.id = center_id and (c.owner_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- companies
drop policy if exists "companies_public_read" on public.companies;
create policy "companies_public_read" on public.companies
  for select using (verification_status = 'verified' or owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "companies_owner_write" on public.companies;
create policy "companies_owner_write" on public.companies
  for all using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- job_orders
drop policy if exists "jobs_public_read" on public.job_orders;
create policy "jobs_public_read" on public.job_orders
  for select using (status = 'open' or public.is_admin(auth.uid()) or
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

drop policy if exists "jobs_owner_write" on public.job_orders;
create policy "jobs_owner_write" on public.job_orders
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- applications
drop policy if exists "apps_self_read" on public.applications;
create policy "apps_self_read" on public.applications
  for select using (
    student_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (select 1 from public.job_orders j join public.companies c on c.id = j.company_id where j.id = job_order_id and c.owner_id = auth.uid())
  );

drop policy if exists "apps_self_insert" on public.applications;
create policy "apps_self_insert" on public.applications
  for insert with check (auth.uid() = student_id);

drop policy if exists "apps_self_update" on public.applications;
create policy "apps_self_update" on public.applications
  for update using (
    student_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (select 1 from public.job_orders j join public.companies c on c.id = j.company_id where j.id = job_order_id and c.owner_id = auth.uid())
  );

-- articles — published readable by all, admins write
drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read" on public.articles
  for select using (published_at <= now() or public.is_admin(auth.uid()));

drop policy if exists "articles_admin_write" on public.articles;
create policy "articles_admin_write" on public.articles
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- community_posts
drop policy if exists "posts_public_read" on public.community_posts;
create policy "posts_public_read" on public.community_posts
  for select using (status = 'approved' or author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "posts_author_insert" on public.community_posts;
create policy "posts_author_insert" on public.community_posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "posts_author_update" on public.community_posts;
create policy "posts_author_update" on public.community_posts
  for update using (auth.uid() = author_id or public.is_admin(auth.uid()));

-- comments
drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read" on public.comments
  for select using (status = 'approved' or author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "comments_author_insert" on public.comments;
create policy "comments_author_insert" on public.comments
  for insert with check (auth.uid() = author_id);

drop policy if exists "comments_admin_moderate" on public.comments;
create policy "comments_admin_moderate" on public.comments
  for update using (public.is_admin(auth.uid()) or auth.uid() = author_id);

-- reports
drop policy if exists "reports_self_insert" on public.reports;
create policy "reports_self_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_admin_read" on public.reports;
create policy "reports_admin_read" on public.reports
  for select using (public.is_admin(auth.uid()) or reporter_id = auth.uid());

drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports
  for update using (public.is_admin(auth.uid()));

-- verification_requests
drop policy if exists "verifications_self_read" on public.verification_requests;
create policy "verifications_self_read" on public.verification_requests
  for select using (requester_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "verifications_self_insert" on public.verification_requests;
create policy "verifications_self_insert" on public.verification_requests
  for insert with check (auth.uid() = requester_id);

drop policy if exists "verifications_admin_update" on public.verification_requests;
create policy "verifications_admin_update" on public.verification_requests
  for update using (public.is_admin(auth.uid()));

-- subscriptions
drop policy if exists "subs_self" on public.subscriptions;
create policy "subs_self" on public.subscriptions
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- payments
drop policy if exists "payments_self" on public.payments;
create policy "payments_self" on public.payments
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
