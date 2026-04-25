import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Euro, Calendar, GraduationCap, Briefcase, Home as HomeIcon, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';
import { companies, jobOrders } from '../data/mockData';
import { VerifiedBadge, SponsoredBadge } from '../components/Badge';

export default function JobOrderDetail() {
  const { id } = useParams();
  const job = jobOrders.find(j => j.id === id);
  const company = job ? companies.find(c => c.id === job.companyId) : undefined;
  const [applied, setApplied] = useState(false);

  if (!job || !company) return <div className="section py-20 text-center">Không tìm thấy đơn tuyển.</div>;

  return (
    <div className="section py-10">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-red mb-6"><ArrowLeft className="h-4 w-4" /> Danh sách đơn tuyển</Link>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div>
          <div className="card">
            <div className="flex flex-wrap items-start gap-4">
              <img src={company.logo} className="h-20 w-20 rounded-xl bg-neutral-100 object-contain" alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-extrabold">{job.occupation}</h1>
                  <VerifiedBadge status={job.verification} />
                  <SponsoredBadge sponsored={job.sponsored} />
                </div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-1">{company.name} • <MapPin className="inline h-4 w-4" /> {job.city}, {job.state}</div>
                <div className="text-xs text-neutral-500 mt-1">Cập nhật lần cuối: {job.lastUpdated}</div>
              </div>
            </div>
          </div>

          <div className="card mt-5">
            <div className="font-semibold mb-3">Yêu cầu & thông tin chính</div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <Info icon={<Briefcase className="h-4 w-4" />} label="Loại hình đào tạo" value={job.trainingType === 'dual' ? 'Ausbildung Dual (song song)' : 'Schulische Ausbildung (trường nghề)'} />
              <Info icon={<GraduationCap className="h-4 w-4" />} label="Tiếng Đức yêu cầu" value={job.germanLevelRequired} />
              <Info icon={<GraduationCap className="h-4 w-4" />} label="Học vấn yêu cầu" value={job.educationRequired} />
              <Info icon={<Calendar className="h-4 w-4" />} label="Ngày bắt đầu" value={job.startDate} />
              <Info icon={<Calendar className="h-4 w-4" />} label="Ngày phỏng vấn" value={job.interviewDate} />
              <Info icon={<Clock className="h-4 w-4" />} label="Hạn nộp" value={job.deadline} />
              <Info icon={<Euro className="h-4 w-4" />} label="Trợ cấp hàng tháng" value={`${job.monthlyAllowanceEUR.toLocaleString()} € / tháng`} />
              <Info icon={<HomeIcon className="h-4 w-4" />} label="Hỗ trợ nhà ở" value={job.accommodationSupport ? 'Có' : 'Không'} />
            </div>
          </div>

          <div className="card mt-5">
            <div className="font-semibold mb-3">Phúc lợi</div>
            <ul className="space-y-2 text-sm">
              {job.perks.map(p => <li key={p} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {p}</li>)}
            </ul>
          </div>

          <div className="card mt-5">
            <div className="font-semibold mb-2">Về nhà tuyển dụng</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{company.about}</p>
          </div>
        </div>

        {/* Apply */}
        <div className="card h-max sticky top-20">
          <div className="text-2xl font-display font-extrabold text-brand-red flex items-center gap-1"><Euro className="h-5 w-5" /> {job.monthlyAllowanceEUR.toLocaleString()} / tháng</div>
          <div className="text-xs text-neutral-500 mt-1">Tiêu chuẩn Ausbildung {job.trainingType === 'dual' ? 'Dual' : 'Schulisch'}</div>

          {applied ? (
            <div className="mt-5 chip bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 w-full justify-center py-3 rounded-xl">Đã gửi đơn. Nhà tuyển dụng sẽ liên hệ bạn.</div>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={e => { e.preventDefault(); setApplied(true); }}>
              <input required className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Họ và tên" />
              <input required type="email" className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Email" />
              <input required type="tel" className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Số điện thoại" />
              <select className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
                <option>Trình độ tiếng Đức: A1</option><option>A2</option><option>B1</option><option>B2</option>
              </select>
              <textarea rows={3} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Thư giới thiệu ngắn" />
              <button className="btn btn-primary w-full">Nộp đơn ngay</button>
            </form>
          )}
          <div className="text-xs text-neutral-500 mt-3">Hạn nộp: {job.deadline}</div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-8 w-8 rounded-lg bg-brand-red/10 text-brand-red grid place-items-center mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}
