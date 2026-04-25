import { Link } from 'react-router-dom';
import {
  Sparkles, Newspaper, GraduationCap, Briefcase, Users, ArrowRight,
  ShieldCheck, BadgeCheck, Star, HeartHandshake, Search, MapPin,
} from 'lucide-react';
import { articles, centers, heroStats, jobOrders, companies } from '../data/mockData';
import { VerifiedBadge, SponsoredBadge } from '../components/Badge';

const modules = [
  { icon: Newspaper, num: '01', title: 'THÔNG TIN & TIN TỨC', desc: 'Cập nhật mới nhất về thị trường du học nghề Đức, ngành nghề, điều kiện, lịch tuyển sinh...', to: '/news' },
  { icon: GraduationCap, num: '02', title: 'TRUNG TÂM TIẾNG ĐỨC', desc: 'Review các trung tâm uy tín tại Việt Nam, lịch khai giảng, giáo viên, học phí và đánh giá từ học viên.', to: '/centers' },
  { icon: Briefcase, num: '03', title: 'CÔNG TY & ĐƠN TUYỂN', desc: 'Khám phá các công ty tuyển dụng tại Đức và đơn tuyển đang/ sắp có với mức trợ cấp hấp dẫn, phỏng vấn sớm.', to: '/companies' },
  { icon: Users, num: '04', title: 'CỘNG ĐỒNG KẾT NỐI', desc: 'Chia sẻ kinh nghiệm, đặt câu hỏi, giao lưu cùng những người đi trước và chuyên gia.', to: '/community' },
];

const reasons = [
  { icon: ShieldCheck, text: 'Thông tin cập nhật & chính xác' },
  { icon: BadgeCheck, text: 'Đơn tuyển được xác minh' },
  { icon: Star, text: 'Trung tâm uy tín, đánh giá thực tế' },
  { icon: HeartHandshake, text: 'Cộng đồng hỗ trợ 24/7' },
];

const statItems = [
  { icon: Users, value: heroStats.members.toLocaleString() + '+', title: 'Thành viên', sub: 'Đang đồng hành', color: 'from-brand-red to-brand-redDark' },
  { icon: GraduationCap, value: heroStats.centers + '+', title: 'Trung tâm uy tín', sub: 'Đã xác minh', color: 'from-amber-400 to-brand-yellow' },
  { icon: Briefcase, value: heroStats.jobs.toLocaleString() + '+', title: 'Đơn tuyển hấp dẫn', sub: 'Cập nhật mỗi ngày', color: 'from-amber-500 to-orange-500' },
  { icon: ShieldCheck, value: heroStats.positiveReviews + '%', title: 'Đánh giá tích cực', sub: 'Từ học viên & ứng viên', color: 'from-brand-red to-rose-500' },
];

export default function Home() {
  const featuredCenter = centers.find(c => c.featured) ?? centers[0];
  const featuredJob = jobOrders.find(j => j.featured) ?? jobOrders[0];
  const featuredArticle = articles.find(a => a.featured) ?? articles[0];

  return (
    <div>
      {/* HERO */}
      <section className="hero-bg relative overflow-hidden">
        <div className="section pt-10 lg:pt-16 pb-16">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Left content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 chip bg-white/80 dark:bg-white/10 shadow-soft mb-6">
                <div className="h-6 w-6 rounded-full bg-brand-red text-white grid place-items-center"><Sparkles className="h-3.5 w-3.5" /></div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">Nền tảng số 1 về du học nghề Đức</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
                <span className="block">DU HỌC <span className="text-brand-red">NGHỀ</span> <span className="bg-gradient-to-r from-amber-400 to-brand-yellow bg-clip-text text-transparent">ĐỨC</span></span>
              </h1>

              <p className="mt-6 text-lg text-neutral-800 dark:text-neutral-200 font-medium">
                Thông tin minh bạch • Lộ trình rõ ràng • Kết nối cơ hội<br/>
                <span className="text-neutral-600 dark:text-neutral-400 text-base">Đồng hành cùng bạn trên con đường nghề nghiệp tại Đức</span>
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/dashboard/student" className="btn btn-primary px-7 py-3 text-base">
                  Kiểm tra điều kiện ngay <ArrowRight className="h-5 w-5" />
                </Link>
                <Link to="/jobs" className="btn btn-ghost px-7 py-3 text-base">Khám phá cơ hội</Link>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['https://i.pravatar.cc/40?img=11', 'https://i.pravatar.cc/40?img=25', 'https://i.pravatar.cc/40?img=47'].map(src => (
                    <img key={src} src={src} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-300"><b>12.500+</b> thành viên đang đồng hành</div>
              </div>
            </div>

            {/* Right card */}
            <div className="lg:col-span-5">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1528825871115-3581a5387919?w=900&q=70"
                  alt="Berlin"
                  className="rounded-3xl w-full h-72 object-cover shadow-glass"/>
                <div className="absolute top-8 right-4 w-64 glass rounded-2xl p-5 shadow-glass">
                  <div className="text-center text-sm font-semibold mb-3 text-neutral-800 dark:text-neutral-100">Vì sao chọn chúng tôi?</div>
                  <ul className="space-y-2.5">
                    {reasons.map(r => (
                      <li key={r.text} className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-100">
                        <div className="h-7 w-7 rounded-full bg-brand-red/15 grid place-items-center">
                          <r.icon className="h-4 w-4 text-brand-red" />
                        </div>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-10 glass rounded-2xl p-2 shadow-glass grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/60 dark:bg-white/5 rounded-xl">
              <Search className="h-5 w-5 text-neutral-400" />
              <input className="bg-transparent outline-none w-full text-sm" placeholder="Tìm kiếm ngành nghề, trung tâm, công ty..." />
            </div>
            <SelectPill label="Ngành nghề" icon="💼" />
            <SelectPill label="Trình độ tiếng Đức" icon="A1" />
            <SelectPill label="Địa điểm tại Đức" icon={<MapPin className="h-4 w-4" />} />
            <Link to="/jobs" className="btn btn-primary md:px-6">
              <Search className="h-4 w-4" /> Tìm kiếm
            </Link>
          </div>
        </div>
      </section>

      {/* 4 module cards */}
      <section className="section -mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {modules.map((m, i) => (
          <Link to={m.to} key={m.title} className="card hover:-translate-y-1 transition relative overflow-hidden group">
            <div className="absolute right-4 top-3 text-4xl font-display font-extrabold text-neutral-200 dark:text-white/5">{m.num}</div>
            <div className={`h-12 w-12 rounded-2xl grid place-items-center mb-4 text-white ${i === 0 ? 'bg-brand-red' : i === 1 ? 'bg-gradient-to-br from-amber-400 to-brand-yellow' : i === 2 ? 'bg-amber-500' : 'bg-rose-500'}`}>
              <m.icon className="h-6 w-6" />
            </div>
            <div className="font-display font-extrabold text-[15px] mb-2">{m.title}</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{m.desc}</p>
            <div className="mt-4 h-9 w-9 rounded-full border border-black/10 dark:border-white/10 grid place-items-center group-hover:bg-brand-red group-hover:text-white group-hover:border-brand-red transition">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </section>

      {/* Stats */}
      <section className="section mt-6">
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
          {statItems.map((s) => (
            <div key={s.title} className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${s.color} grid place-items-center text-white shadow-soft`}>
                <s.icon className="h-7 w-7" />
              </div>
              <div>
                <div className="text-2xl font-display font-extrabold">{s.value}</div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-neutral-500">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Highlight cards */}
      <section className="section mt-10 grid md:grid-cols-3 gap-4">
        {/* Featured article */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-extrabold flex items-center gap-2 text-sm"><Newspaper className="h-4 w-4 text-brand-red" /> TIN TỨC NỔI BẬT</div>
            <Link to="/news" className="text-xs text-neutral-500 hover:text-brand-red">Xem tất cả →</Link>
          </div>
          <div className="flex gap-3">
            <img src={featuredArticle.cover} alt="" className="h-20 w-28 rounded-xl object-cover" />
            <div>
              <span className="chip bg-brand-red text-white text-[10px] mb-1">MỚI</span>
              <div className="font-semibold text-sm leading-snug line-clamp-2">{featuredArticle.title}</div>
              <div className="text-xs text-neutral-500 mt-1">{featuredArticle.author} • {featuredArticle.publishedAt}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-5 bg-brand-red' : 'w-2 bg-neutral-300'}`} />)}
          </div>
        </div>
        {/* Featured center */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-extrabold flex items-center gap-2 text-sm"><GraduationCap className="h-4 w-4 text-brand-red" /> TRUNG TÂM NỔI BẬT</div>
            <Link to="/centers" className="text-xs text-neutral-500 hover:text-brand-red">Xem tất cả →</Link>
          </div>
          <div className="flex gap-3">
            <img src={featuredCenter.logo} className="h-16 w-24 object-contain rounded-xl bg-neutral-100" alt="" />
            <div className="flex-1">
              <div className="font-semibold text-sm flex items-center gap-1">{featuredCenter.name} <BadgeCheck className="h-4 w-4 text-emerald-500" /></div>
              <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {featuredCenter.rating} ({featuredCenter.reviewCount} đánh giá)</div>
              <div className="text-xs text-neutral-500 mt-1">Khai giảng: 15/05/2024</div>
            </div>
          </div>
          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-5 bg-brand-red' : 'w-2 bg-neutral-300'}`} />)}
          </div>
        </div>
        {/* Featured job */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-extrabold flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-brand-red" /> ĐƠN TUYỂN MỚI NHẤT</div>
            <Link to="/jobs" className="text-xs text-neutral-500 hover:text-brand-red">Xem tất cả →</Link>
          </div>
          <div className="flex gap-3">
            <img src={companies.find(c => c.id === featuredJob.companyId)?.logo} className="h-16 w-24 object-contain rounded-xl bg-neutral-100" alt="" />
            <div>
              <div className="font-semibold text-sm flex items-center gap-1">{featuredJob.occupation.split('(')[0]} <span className="chip bg-brand-red text-white text-[9px]">DUAL</span></div>
              <div className="text-xs text-neutral-500 mt-0.5">Trợ cấp: {featuredJob.monthlyAllowanceEUR.toLocaleString()} €/tháng</div>
              <div className="text-xs text-neutral-500 mt-1">Phỏng vấn: {featuredJob.interviewDate}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-5 bg-brand-red' : 'w-2 bg-neutral-300'}`} />)}
          </div>
        </div>
      </section>

      {/* Featured Jobs Grid */}
      <section className="section mt-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs font-bold text-brand-red tracking-widest mb-2">ĐƠN TUYỂN ĐƯỢC XÁC MINH</div>
            <h2 className="font-display text-3xl font-extrabold">Cơ hội Ausbildung mới</h2>
          </div>
          <Link to="/jobs" className="hidden sm:inline-flex btn btn-ghost">Xem tất cả</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobOrders.slice(0, 6).map(j => {
            const co = companies.find(c => c.id === j.companyId)!;
            return (
              <Link key={j.id} to={`/jobs/${j.id}`} className="card hover:shadow-glass hover:-translate-y-1 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={co.logo} className="h-12 w-12 rounded-xl bg-neutral-100 object-contain" alt="" />
                    <div>
                      <div className="font-semibold text-[15px]">{j.occupation}</div>
                      <div className="text-xs text-neutral-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.city}, {j.state}</div>
                    </div>
                  </div>
                  <SponsoredBadge sponsored={j.sponsored} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="chip bg-neutral-100 dark:bg-white/10">{j.trainingType === 'dual' ? 'Dual' : 'School-based'}</span>
                  <span className="chip bg-neutral-100 dark:bg-white/10">Tiếng Đức {j.germanLevelRequired}</span>
                  <VerifiedBadge status={j.verification} />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] text-neutral-500">Trợ cấp hàng tháng</div>
                    <div className="text-lg font-display font-extrabold text-brand-red">{j.monthlyAllowanceEUR.toLocaleString()} €</div>
                  </div>
                  <div className="text-[11px] text-neutral-500">Hạn: {j.deadline}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SelectPill({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button className="flex items-center gap-2 px-3 py-2 bg-white/60 dark:bg-white/5 rounded-xl text-sm hover:bg-white/80">
      <span className="h-6 w-6 grid place-items-center rounded-md bg-brand-red/10 text-brand-red text-xs font-bold">{icon}</span>
      <span className="text-neutral-600 dark:text-neutral-300 truncate">{label}</span>
      <svg className="h-4 w-4 ml-auto opacity-50" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12l-4-4h8l-4 4z"/></svg>
    </button>
  );
}
