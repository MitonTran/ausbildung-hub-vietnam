-- ===================================================================
-- Seed data — minimal sample so the UI renders against a real DB.
-- The Next.js app falls back to /src/lib/mock-data.ts when Supabase env
-- vars are absent, so this seed is OPTIONAL but recommended for staging.
-- ===================================================================

insert into public.articles (title, slug, excerpt, category, cover_image_url, is_sponsored, read_time, tags, published_at)
values
  ('Nhu cầu nhân lực ngành điều dưỡng tại Đức tiếp tục tăng mạnh',
    'nhu-cau-nhan-luc-dieu-duong-duc-tang-manh',
    'Báo cáo mới nhất từ Bộ Lao động Đức cho thấy thiếu hụt 200.000 vị trí điều dưỡng đến 2030.',
    'Thị trường', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200', false, 6,
    ARRAY['điều dưỡng','thị trường','2026'], now()),
  ('Visa Ausbildung 2026: Những thay đổi quan trọng',
    'visa-ausbildung-2026-thay-doi',
    'Quy trình xin visa Ausbildung được rút gọn, hồ sơ tài chính giảm tải.',
    'Chính sách', 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200', false, 8,
    ARRAY['visa','chính sách'], now())
on conflict (slug) do nothing;

insert into public.centers (name, slug, logo_url, city, address, website, description, german_levels, tuition_min, tuition_max, verification_status, rating_avg, review_count)
values
  ('DeutschAkademie Hà Nội', 'deutschakademie-ha-noi',
    'https://logo.clearbit.com/deutschakademie.de', 'Hà Nội', '12 Tràng Tiền, Hoàn Kiếm',
    'https://deutschakademie.vn',
    'Trung tâm Đức ngữ hàng đầu với 15+ năm kinh nghiệm.',
    ARRAY['A1','A2','B1','B2']::german_level[], 5000000, 12000000, 'verified', 4.9, 128),
  ('VIETGERMANY HCM', 'vietgermany-hcm',
    'https://ui-avatars.com/api/?name=VG&background=3b82f6&color=fff', 'Hồ Chí Minh',
    '88 Nguyễn Du, Q1', 'https://vietgermany.vn',
    'Đối tác chính thức của Goethe-Institut.',
    ARRAY['A1','A2','B1','B2']::german_level[], 4500000, 11500000, 'verified', 4.8, 96)
on conflict (slug) do nothing;

insert into public.companies (name, slug, logo_url, industry, city, state, country, description, verification_status, rating_avg, job_count, satisfaction_rate)
values
  ('Siemens AG', 'siemens', 'https://logo.clearbit.com/siemens.com',
    'Cơ điện tử / Tự động hóa', 'Munich', 'Bayern', 'Đức',
    'Tập đoàn công nghệ và công nghiệp toàn cầu.',
    'verified', 4.9, 28, 95),
  ('Robert Bosch GmbH', 'bosch', 'https://logo.clearbit.com/bosch.com',
    'Cơ khí / Ô tô', 'Stuttgart', 'Baden-Württemberg', 'Đức',
    'Nhà sản xuất thiết bị công nghiệp lớn nhất thế giới.',
    'verified', 4.8, 22, 93)
on conflict (slug) do nothing;

insert into public.job_orders (company_id, title, slug, occupation, training_type, city, state, german_level_required, education_required, monthly_allowance_min, monthly_allowance_max, start_date, deadline, description, status, verification_status, is_featured)
select c.id, 'Kỹ thuật viên cơ điện tử (Mechatroniker)', 'ky-thuat-vien-co-dien-tu-siemens',
  'Cơ điện tử', 'Dual', 'Munich', 'Bayern', 'B1',
  'Tốt nghiệp THPT', 1150, 1350, '2026-09-01', '2026-05-30',
  'Chương trình Ausbildung 3.5 năm với Siemens Technik Akademie.',
  'open', 'verified', true
from public.companies c where c.slug = 'siemens'
on conflict (slug) do nothing;
