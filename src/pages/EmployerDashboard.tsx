import { useState } from 'react';
import { Briefcase, Eye, Users, TrendingUp, PlusCircle, CheckCircle2 } from 'lucide-react';
import { companies, jobOrders } from '../data/mockData';
import { VerifiedBadge } from '../components/Badge';
import { useAuth } from '../store/auth';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const employer = companies[1];
  const myJobs = jobOrders.filter(j => j.companyId === employer.id);
  const [showForm, setShowForm] = useState(false);

  const required = ['occupation', 'city/state', 'training type', 'tiếng Đức', 'học vấn', 'ngày bắt đầu', 'phỏng vấn', 'trợ cấp', 'nhà ở', 'hạn nộp'];

  return (
    <div className="section py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2">EMPLOYER DASHBOARD</div>
          <h1 className="font-display text-3xl font-extrabold">Xin chào, {user?.fullName}</h1>
          <div className="text-sm text-neutral-500 mt-1">Công ty: <b>{employer.name}</b> · {employer.city}</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn btn-primary"><PlusCircle className="h-4 w-4" /> Đăng đơn tuyển mới</button>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat icon={Briefcase} label="Đơn tuyển đang mở" value={myJobs.length.toString()} />
        <Stat icon={Eye} label="Lượt xem / tháng" value="6,238" />
        <Stat icon={Users} label="Ứng viên mới" value="24" />
        <Stat icon={TrendingUp} label="Tỉ lệ phỏng vấn" value="67%" />
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="font-semibold mb-3 flex items-center gap-2">Đăng đơn tuyển mới <span className="chip bg-amber-50 text-amber-700">Admin sẽ duyệt</span></div>
          <div className="text-xs text-neutral-500 mb-3">Các trường bắt buộc: {required.join(' · ')}</div>
          <form className="grid md:grid-cols-2 gap-3" onSubmit={e => { e.preventDefault(); alert('Đã gửi đơn tuyển. Admin sẽ duyệt trong 24h.'); setShowForm(false); }}>
            <input required placeholder="Nghề nghiệp (occupation)" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <input required placeholder="Thành phố + Bang (Đức)" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <select required className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm"><option value="">Loại hình đào tạo</option><option>Dual</option><option>School-based</option></select>
            <select required className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm"><option value="">Trình độ tiếng Đức</option><option>A2</option><option>B1</option><option>B2</option></select>
            <input required placeholder="Học vấn yêu cầu" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <input required type="date" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <input required type="date" placeholder="Ngày phỏng vấn" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <input required type="number" placeholder="Trợ cấp EUR/tháng" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <label className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm flex items-center gap-2"><input type="checkbox" /> Hỗ trợ nhà ở</label>
            <input required type="date" placeholder="Hạn nộp" className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <textarea placeholder="Mô tả, phúc lợi (mỗi dòng một mục)" rows={3} className="col-span-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" />
            <button className="btn btn-primary col-span-full">Gửi duyệt</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="font-semibold mb-3">Đơn tuyển của bạn</div>
        <div className="space-y-3">
          {myJobs.map(j => (
            <div key={j.id} className="flex flex-wrap items-center gap-3 border border-neutral-200 dark:border-white/10 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{j.occupation}</div>
                <div className="text-xs text-neutral-500">Hạn: {j.deadline} • {j.monthlyAllowanceEUR}€ • {j.germanLevelRequired}</div>
              </div>
              <VerifiedBadge status={j.verification} />
              <button className="text-xs text-brand-red font-semibold">Xem ứng viên →</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-5">
        <div className="font-semibold mb-2">Pipeline ứng viên mẫu</div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {['Mới', 'Đã liên hệ', 'Phỏng vấn', 'Nhận', 'Từ chối'].map((s, i) => (
            <div key={s} className="border border-neutral-200 dark:border-white/10 rounded-xl p-3 text-center">
              <div className="font-semibold">{s}</div>
              <div className="text-2xl font-display font-extrabold mt-1">{[8, 6, 5, 3, 2][i]}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-neutral-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Nâng cấp Employer Pro để nhận CV trực tiếp & dashboard chi tiết.</div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="card">
      <div className="h-10 w-10 rounded-xl bg-brand-red/10 text-brand-red grid place-items-center mb-2"><Icon className="h-5 w-5" /></div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-display text-xl font-extrabold">{value}</div>
    </div>
  );
}
