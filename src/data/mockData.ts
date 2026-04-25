import type {
  Article, Center, Company, JobOrder, CommunityPost,
  SubscriptionPlan, VerificationRequest, ReportFlag, CenterReview
} from '../types';

export const articles: Article[] = [
  {
    id: 'a1', slug: 'visa-2024-changes',
    title: 'Những thay đổi mới về visa du học nghề Đức năm 2024',
    excerpt: 'Cập nhật quy định mới nhất từ Đại sứ quán Đức: yêu cầu tiếng, hồ sơ tài chính và thời gian xử lý visa Ausbildung.',
    body: 'Từ tháng 3/2024, Đại sứ quán Đức công bố nhiều thay đổi quan trọng liên quan đến visa du học nghề…',
    cover: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=900&q=70',
    author: 'Admin', publishedAt: '2024-05-20', tags: ['Visa', 'Ausbildung', 'Cập nhật'], featured: true,
  },
  {
    id: 'a2', slug: 'top-ngành-nghề',
    title: 'Top 10 ngành nghề Ausbildung dễ xin việc nhất tại Đức',
    excerpt: 'Điều dưỡng, cơ khí, nhà hàng — khảo sát thị trường lao động Đức 2024 và lương khởi điểm.',
    body: 'Báo cáo Bundesagentur für Arbeit ghi nhận 10 ngành nghề có nhu cầu tuyển dụng cao nhất…',
    cover: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&q=70',
    author: 'Ngọc Anh', publishedAt: '2024-05-14', tags: ['Ngành nghề', 'Việc làm'],
  },
  {
    id: 'a3', slug: 'tieng-duc-b1-bao-lau',
    title: 'Học tiếng Đức đến B1 mất bao lâu? Lộ trình thực tế',
    excerpt: 'Phân tích lộ trình từ A1 đến B1, số giờ học cần thiết và phương pháp học hiệu quả.',
    body: 'Một học viên trung bình cần 600-800 giờ học để đạt B1…',
    cover: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=70',
    author: 'Minh Tuấn', publishedAt: '2024-05-08', tags: ['Tiếng Đức', 'Lộ trình'],
  },
  {
    id: 'a4', slug: 'so-sanh-dual-school',
    title: 'So sánh Ausbildung Dual vs trường nghề: Bạn nên chọn đâu?',
    excerpt: 'Ưu nhược điểm của hai hình thức đào tạo nghề phổ biến nhất tại Đức.',
    body: 'Ausbildung Dual kết hợp học lý thuyết và thực hành tại doanh nghiệp…',
    cover: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=900&q=70',
    author: 'Lan Hương', publishedAt: '2024-04-30', tags: ['Lộ trình', 'So sánh'],
  },
  {
    id: 'a5', slug: 'chi-phi-sinh-hoat-berlin',
    title: 'Chi phí sinh hoạt tại Berlin cho du học sinh nghề',
    excerpt: 'Tiền thuê nhà, ăn uống, đi lại, bảo hiểm — tổng hợp chi phí thực tế 2024.',
    body: 'Tiền thuê nhà WG dao động 350-550 EUR/tháng tuỳ khu vực…',
    cover: 'https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=900&q=70',
    author: 'Thu Trang', publishedAt: '2024-04-22', tags: ['Chi phí', 'Cuộc sống'], sponsored: true,
  },
  {
    id: 'a6', slug: 'phong-van-ausbildung',
    title: 'Bí quyết vượt qua phỏng vấn online Ausbildung',
    excerpt: '10 câu hỏi thường gặp và cách trả lời thuyết phục bằng tiếng Đức B1.',
    body: 'Nhà tuyển dụng Đức thường hỏi về động lực, kinh nghiệm và kế hoạch dài hạn…',
    cover: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=70',
    author: 'Đức Anh', publishedAt: '2024-04-15', tags: ['Phỏng vấn', 'Tiếng Đức'],
  },
];

export const centers: Center[] = [
  {
    id: 'c1', name: 'Hallo Deutschschule Hà Nội',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Hallo&backgroundColor=E53935&textColor=ffffff',
    city: 'Hà Nội', branches: ['Hai Bà Trưng', 'Cầu Giấy'],
    germanLevels: ['A1', 'A2', 'B1', 'B2'],
    tuition: [{ level: 'A1', monthlyVND: 3500000 }, { level: 'B1', monthlyVND: 4500000 }],
    classSchedule: 'Thứ 2–6, 2 ca sáng/tối',
    teachers: [
      { id: 't1', name: 'Cô Linh Đức', levels: ['A1', 'A2', 'B1'], yearsExp: 8, bio: 'Tốt nghiệp Goethe Institut' },
      { id: 't2', name: 'Thầy Markus', levels: ['B1', 'B2'], yearsExp: 6, bio: 'Giáo viên bản ngữ từ Leipzig' },
    ],
    services: ['Ôn thi Goethe', 'Tư vấn du học', 'Luyện phỏng vấn', 'Hỗ trợ hồ sơ'],
    verification: 'verified', rating: 4.8, reviewCount: 128,
    featured: true,
    phone: '+84 24 3928 1234', email: 'info@hallo-deutsch.vn', website: 'https://hallo-deutsch.vn',
    about: 'Trung tâm tiếng Đức hàng đầu miền Bắc, chuyên đào tạo từ A1 đến B2, kết nối trực tiếp với các chương trình Ausbildung tại Đức.',
  },
  {
    id: 'c2', name: 'Goethe Vietnam Center',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=Goethe&backgroundColor=FFC107&textColor=000',
    city: 'TP. Hồ Chí Minh', branches: ['Quận 1', 'Quận 3'],
    germanLevels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    tuition: [{ level: 'A1', monthlyVND: 4200000 }, { level: 'C1', monthlyVND: 6000000 }],
    classSchedule: 'Linh hoạt — cả tuần',
    teachers: [{ id: 't3', name: 'Cô Minh Phương', levels: ['A1', 'B1'], yearsExp: 12 }],
    services: ['Chứng chỉ quốc tế', 'Tư vấn visa', 'Học online'],
    verification: 'verified', rating: 4.7, reviewCount: 215,
    phone: '+84 28 3822 5678', email: 'contact@goethe-vn.org',
    about: 'Đối tác chính thức của Goethe Institut, tổ chức thi quốc tế A1–C1.',
  },
  {
    id: 'c3', name: 'Đà Nẵng Deutsch Academy',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=DNDA&backgroundColor=111&textColor=ffffff',
    city: 'Đà Nẵng', branches: ['Hải Châu'],
    germanLevels: ['A1', 'A2', 'B1'],
    tuition: [{ level: 'A1', monthlyVND: 2800000 }],
    classSchedule: 'Tối các ngày trong tuần',
    teachers: [{ id: 't4', name: 'Thầy Hoàng Nam', levels: ['A1', 'A2'], yearsExp: 5 }],
    services: ['Học nhóm nhỏ', 'Ôn Ausbildung'],
    verification: 'pending', rating: 4.4, reviewCount: 42,
    phone: '+84 236 3556 789', email: 'hello@ddacademy.vn',
    about: 'Trung tâm nhỏ tại Đà Nẵng, lớp tối đa 12 học viên.',
  },
  {
    id: 'c4', name: 'Berlin Bridge Hải Phòng',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=BB&backgroundColor=0b5394&textColor=ffffff',
    city: 'Hải Phòng', branches: ['Lê Chân'],
    germanLevels: ['A1', 'A2', 'B1', 'B2'],
    tuition: [{ level: 'A1', monthlyVND: 3000000 }, { level: 'B2', monthlyVND: 4800000 }],
    classSchedule: 'T2-T6 tối',
    teachers: [{ id: 't5', name: 'Cô Hà Thu', levels: ['A1', 'B1'], yearsExp: 7 }],
    services: ['Tư vấn Ausbildung điều dưỡng', 'Giới thiệu công ty'],
    verification: 'verified', rating: 4.6, reviewCount: 89, sponsored: true,
    phone: '+84 225 3710 456', email: 'info@berlinbridge.vn',
    about: 'Chuyên ngành điều dưỡng, đối tác với 12 bệnh viện ở Đức.',
  },
  {
    id: 'c5', name: 'München Sprachschule',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=MS&backgroundColor=7a1f1f&textColor=ffffff',
    city: 'Hà Nội', branches: ['Đống Đa'],
    germanLevels: ['A1', 'A2', 'B1', 'B2'],
    tuition: [{ level: 'A1', monthlyVND: 3200000 }],
    classSchedule: 'T7, CN cả ngày',
    teachers: [{ id: 't6', name: 'Thầy Đức Minh', levels: ['A1', 'A2', 'B1'], yearsExp: 9 }],
    services: ['Học cuối tuần', 'Combo Ausbildung'],
    verification: 'verified', rating: 4.5, reviewCount: 67,
    phone: '+84 24 3511 222', email: 'info@munich-vn.edu.vn',
    about: 'Phù hợp cho người đi làm, học cuối tuần.',
  },
  {
    id: 'c6', name: 'Wien-Sài Gòn Institut',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=WSG&backgroundColor=4a148c&textColor=ffffff',
    city: 'TP. Hồ Chí Minh', branches: ['Phú Nhuận', 'Quận 7'],
    germanLevels: ['A1', 'A2', 'B1'],
    tuition: [{ level: 'A1', monthlyVND: 3800000 }],
    classSchedule: 'Linh hoạt',
    teachers: [{ id: 't7', name: 'Cô Thu Anh', levels: ['A1', 'A2'], yearsExp: 6 }],
    services: ['Học kết hợp online-offline'],
    verification: 'pending', rating: 4.2, reviewCount: 28,
    phone: '+84 28 3844 999', email: 'contact@wsginstitut.vn',
    about: 'Trung tâm mới thành lập 2023, chú trọng chất lượng giảng dạy.',
  },
];

export const centerReviews: CenterReview[] = [
  { id: 'r1', centerId: 'c1', author: 'Nguyễn Văn A', rating: 5, comment: 'Giáo viên tận tâm, giáo trình chuẩn Goethe, học xong thi B1 đạt luôn.', approved: true, createdAt: '2024-04-10' },
  { id: 'r2', centerId: 'c1', author: 'Trần Thị B', rating: 4, comment: 'Lớp hơi đông nhưng chất lượng tốt, được hỗ trợ visa rất kỹ.', approved: true, createdAt: '2024-03-22' },
  { id: 'r3', centerId: 'c1', author: 'Lê Minh C', rating: 5, comment: 'Xuất sắc, đã giúp mình có học bổng Ausbildung điều dưỡng.', approved: true, createdAt: '2024-02-15', proofUrl: 'https://example.com/proof.jpg' },
];

export const companies: Company[] = [
  {
    id: 'co1', name: 'K&S Gruppe',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=KS&backgroundColor=E53935&textColor=ffffff',
    city: 'Berlin', state: 'Berlin', sector: 'Chăm sóc sức khỏe', size: '1000+',
    verification: 'verified', rating: 4.6, reviewCount: 54,
    about: 'Tập đoàn điều dưỡng và chăm sóc người cao tuổi lớn nhất nước Đức.',
    website: 'https://ks-gruppe.de',
  },
  {
    id: 'co2', name: 'Bosch Ausbildung',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=BSH&backgroundColor=0b5394&textColor=ffffff',
    city: 'Stuttgart', state: 'Baden-Württemberg', sector: 'Cơ khí & Điện tử', size: '5000+',
    verification: 'verified', rating: 4.8, reviewCount: 112,
    about: 'Chương trình Ausbildung cơ khí và điện tử cho sinh viên quốc tế.',
  },
  {
    id: 'co3', name: 'Deutsche Hotels Group',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=DHG&backgroundColor=FFC107&textColor=000',
    city: 'Munich', state: 'Bayern', sector: 'Khách sạn & Nhà hàng', size: '500-1000',
    verification: 'verified', rating: 4.3, reviewCount: 38,
    about: 'Chuỗi khách sạn 4-5 sao tại miền Nam nước Đức, tuyển Ausbildung Hotelfach.',
  },
  {
    id: 'co4', name: 'Mercedes Vertrieb',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=MV&backgroundColor=111&textColor=ffffff',
    city: 'Stuttgart', state: 'Baden-Württemberg', sector: 'Ô tô', size: '10000+',
    verification: 'verified', rating: 4.9, reviewCount: 203,
    about: 'Đại lý chính hãng Mercedes, tuyển Ausbildung KFZ-Mechatroniker.',
  },
];

export const jobOrders: JobOrder[] = [
  {
    id: 'j1', companyId: 'co1', occupation: 'Điều dưỡng viên (Pflegefachfrau/-mann)',
    city: 'Berlin', state: 'Berlin', trainingType: 'dual',
    germanLevelRequired: 'B1', educationRequired: 'Tốt nghiệp THPT',
    startDate: '2024-09-01', interviewDate: '2024-05-25',
    monthlyAllowanceEUR: 1300, accommodationSupport: true,
    deadline: '2024-07-15', verification: 'verified',
    lastUpdated: '2024-05-20', featured: true,
    perks: ['Hỗ trợ nhà ở 3 tháng đầu', 'Bảo hiểm y tế', 'Vé máy bay 1 chiều'],
  },
  {
    id: 'j2', companyId: 'co2', occupation: 'Kỹ thuật viên cơ khí (Industriemechaniker)',
    city: 'Stuttgart', state: 'Baden-Württemberg', trainingType: 'dual',
    germanLevelRequired: 'B1', educationRequired: 'THPT + đam mê kỹ thuật',
    startDate: '2024-10-01', interviewDate: '2024-06-10',
    monthlyAllowanceEUR: 1150, accommodationSupport: false,
    deadline: '2024-08-01', verification: 'verified',
    lastUpdated: '2024-05-18', featured: true,
    perks: ['Cam kết việc làm sau tốt nghiệp', 'Thưởng hoàn thành'],
  },
  {
    id: 'j3', companyId: 'co3', occupation: 'Nhân viên nhà hàng (Restaurantfachfrau/-mann)',
    city: 'Munich', state: 'Bayern', trainingType: 'dual',
    germanLevelRequired: 'A2', educationRequired: 'Tốt nghiệp THCS',
    startDate: '2024-09-15', interviewDate: '2024-06-02',
    monthlyAllowanceEUR: 900, accommodationSupport: true,
    deadline: '2024-07-20', verification: 'verified',
    lastUpdated: '2024-05-19', perks: ['Tiền tip', 'Bữa ăn miễn phí'],
  },
  {
    id: 'j4', companyId: 'co4', occupation: 'Kỹ thuật viên ô tô (KFZ-Mechatroniker)',
    city: 'Stuttgart', state: 'Baden-Württemberg', trainingType: 'dual',
    germanLevelRequired: 'B1', educationRequired: 'THPT',
    startDate: '2024-09-01', interviewDate: '2024-05-30',
    monthlyAllowanceEUR: 1200, accommodationSupport: true,
    deadline: '2024-07-10', verification: 'verified',
    lastUpdated: '2024-05-21', sponsored: true,
    perks: ['Mercedes discount', 'Đào tạo quốc tế'],
  },
  {
    id: 'j5', companyId: 'co1', occupation: 'Trợ lý chăm sóc (Pflegeassistent)',
    city: 'Frankfurt', state: 'Hessen', trainingType: 'school',
    germanLevelRequired: 'A2', educationRequired: 'THCS trở lên',
    startDate: '2024-11-01', interviewDate: '2024-07-01',
    monthlyAllowanceEUR: 800, accommodationSupport: true,
    deadline: '2024-08-30', verification: 'pending',
    lastUpdated: '2024-05-15', perks: ['Chuyển tiếp Pflegefachfrau sau 1 năm'],
  },
];

export const communityPosts: CommunityPost[] = [
  {
    id: 'p1', author: 'Hải Yến', authorRole: 'student',
    title: 'Mình vừa đỗ Ausbildung điều dưỡng ở Berlin — Chia sẻ kinh nghiệm',
    body: 'Sau 14 tháng học tiếng Đức và chuẩn bị hồ sơ, mình đã được nhận tại K&S Gruppe. Chia sẻ với mọi người hành trình của mình…',
    tags: ['Kinh nghiệm', 'Điều dưỡng'], createdAt: '2024-05-18', likes: 142,
    comments: [
      { id: 'cm1', postId: 'p1', author: 'Nam Anh', body: 'Chúc mừng bạn! Mình cũng đang học B1 ạ.', createdAt: '2024-05-18' },
      { id: 'cm2', postId: 'p1', author: 'Thu Trang', body: 'Cho mình hỏi tiền chứng minh tài chính bao nhiêu vậy?', createdAt: '2024-05-19' },
    ],
  },
  {
    id: 'p2', author: 'Admin', authorRole: 'admin',
    title: '[Thông báo] Tháng 6 có đợt phỏng vấn lớn từ Bosch — Đăng ký tham gia',
    body: 'Bosch sẽ tổ chức đợt phỏng vấn online vào tuần đầu tháng 6 cho các bạn có B1…',
    tags: ['Sự kiện'], createdAt: '2024-05-16', likes: 89,
    comments: [],
  },
  {
    id: 'p3', author: 'Văn Đức', authorRole: 'student',
    title: 'Review trung tâm Hallo Deutschschule sau 8 tháng học',
    body: 'Mình học ở đây từ A1 đến B1, tổng kết trải nghiệm…',
    tags: ['Review', 'Trung tâm'], createdAt: '2024-05-12', likes: 56,
    comments: [
      { id: 'cm3', postId: 'p3', author: 'Linh Đan', body: 'Mình cũng đang cân nhắc trung tâm này, cảm ơn bạn.', createdAt: '2024-05-13' },
    ],
  },
  {
    id: 'p4', author: 'Cô Linh', authorRole: 'center',
    title: 'Lộ trình học A1 → B1 trong 9 tháng cho người đi làm',
    body: 'Giáo viên Hallo chia sẻ lộ trình chi tiết để học đều đặn 90 phút/ngày…',
    tags: ['Lộ trình', 'Tiếng Đức'], createdAt: '2024-05-10', likes: 201,
    comments: [],
  },
  {
    id: 'p5', author: 'HR Bosch', authorRole: 'employer',
    title: '[Tuyển dụng] 20 suất Ausbildung cơ khí — hạn 30/06',
    body: 'Bosch Stuttgart mở 20 suất Industriemechaniker. Yêu cầu B1, có đam mê kỹ thuật…',
    tags: ['Tuyển dụng', 'Cơ khí'], createdAt: '2024-05-05', likes: 73,
    comments: [],
  },
];

export const plans: SubscriptionPlan[] = [
  {
    id: 'plan-free', name: 'Free', priceVND: 0, interval: 'month', audience: 'student',
    features: ['Xem danh bạ trung tâm & công ty', 'Tham gia cộng đồng', 'Làm bài quiz đủ điều kiện', '3 lượt lưu tin/tháng'],
  },
  {
    id: 'plan-student-plus', name: 'Student Plus', priceVND: 99000, interval: 'month', audience: 'student',
    features: ['Ẩn mọi quảng cáo', 'Lưu không giới hạn', 'Nhận thông báo đơn tuyển sớm 24h', 'Huy hiệu Student+'],
    highlight: true,
  },
  {
    id: 'plan-center-pro', name: 'Center Pro', priceVND: 1990000, interval: 'month', audience: 'center',
    features: ['Huy hiệu Verified ưu tiên duyệt', 'Đơn tuyển sinh không giới hạn', 'Banner nổi bật trang chủ', 'Dashboard analytics', 'Quản lý review'],
    highlight: true,
  },
  {
    id: 'plan-employer-pro', name: 'Employer Pro', priceVND: 4990000, interval: 'month', audience: 'employer',
    features: ['Đơn tuyển không giới hạn', 'Nhận CV trực tiếp', 'Featured 3 job order', 'Dashboard ứng viên', 'Hỗ trợ tuyển dụng riêng'],
  },
  {
    id: 'plan-enterprise', name: 'Enterprise', priceVND: 0, interval: 'year', audience: 'employer',
    features: ['Tuỳ chỉnh theo yêu cầu', 'API tích hợp', 'Quản lý nhiều chi nhánh', 'Hỗ trợ triển khai'],
  },
];

export const verificationQueue: VerificationRequest[] = [
  { id: 'v1', subject: 'center', subjectId: 'c3', subjectName: 'Đà Nẵng Deutsch Academy', submittedAt: '2024-05-19', status: 'pending' },
  { id: 'v2', subject: 'center', subjectId: 'c6', subjectName: 'Wien-Sài Gòn Institut', submittedAt: '2024-05-17', status: 'pending' },
  { id: 'v3', subject: 'company', subjectId: 'co-new', subjectName: 'Hamburg Logistik GmbH', submittedAt: '2024-05-20', status: 'pending' },
  { id: 'v4', subject: 'review', subjectId: 'r-new', subjectName: 'Review của Minh Tuấn về Goethe Vietnam', submittedAt: '2024-05-20', status: 'pending' },
];

export const reportFlags: ReportFlag[] = [
  { id: 'f1', targetType: 'post', targetId: 'p3', reason: 'Nội dung spam trung tâm', reporter: 'Quốc Bảo', createdAt: '2024-05-20', status: 'open' },
  { id: 'f2', targetType: 'comment', targetId: 'cm2', reason: 'Thông tin sai lệch', reporter: 'Hà My', createdAt: '2024-05-19', status: 'open' },
];

export const heroStats = {
  members: 12500,
  centers: 230,
  jobs: 1850,
  positiveReviews: 98,
};
