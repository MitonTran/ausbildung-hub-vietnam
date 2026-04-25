import { BarChart3, Eye, Users, Star, BadgeCheck, Upload, ShieldCheck, Clock3 } from 'lucide-react';
import { centers, centerReviews } from '../data/mockData';
import { useAuth } from '../store/auth';
import { useState } from 'react';

export default function CenterDashboard() {
  const { user } = useAuth();
  const center = centers[0]; // demo: first center
  const reviews = centerReviews.filter(r => r.centerId === center.id);
  const [verifSubmitted, setVerifSubmitted] = useState(false);

  return (
    <div className="section py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2">CENTER DASHBOARD</div>
          <h1 className="font-display text-3xl font-extrabold">Xin chào, {user?.fullName}</h1>
          <div className="text-sm text-neutral-500 mt-1">Quản lý: <b>{center.name}</b></div>
        </div>
        <div className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" /> Đã xác minh</div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat icon={Eye} label="Lượt xem profile / tháng" value="3,492" />
        <Stat icon={Users} label="Liên hệ tư vấn" value="87" />
        <Stat icon={Star} label="Đánh giá trung bình" value={center.rating.toFixed(1)} />
        <Stat icon={BarChart3} label="Rank trong thành phố" value="#2" />
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Review cần kiểm duyệt ({reviews.filter(r => !r.approved).length})</div>
              <span className="chip bg-amber-50 text-amber-700">Chỉ hiển thị sau khi admin duyệt</span>
            </div>
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="border border-neutral-200 dark:border-white/10 rounded-xl p-3">
                  <div className="text-sm font-semibold">{r.author} <span className="text-xs text-neutral-500 font-normal">• {r.createdAt}</span></div>
                  <div className="text-sm">{r.comment}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="chip bg-neutral-100 dark:bg-white/10">⭐ {r.rating}/5</span>
                    {r.approved ? <span className="chip bg-emerald-50 text-emerald-700">Đã duyệt</span> : <span className="chip bg-amber-50 text-amber-700">Chờ duyệt</span>}
                    <button className="ml-auto text-xs text-brand-red">Trả lời →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card mt-5">
            <div className="font-semibold mb-3">Thông tin trung tâm</div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-neutral-500">Tên</div><div className="font-semibold">{center.name}</div></div>
              <div><div className="text-xs text-neutral-500">Thành phố</div><div className="font-semibold">{center.city}</div></div>
              <div><div className="text-xs text-neutral-500">Chi nhánh</div><div className="font-semibold">{center.branches.join(', ')}</div></div>
              <div><div className="text-xs text-neutral-500">Trình độ</div><div className="font-semibold">{center.germanLevels.join(', ')}</div></div>
            </div>
            <button className="btn btn-ghost mt-4">Chỉnh sửa profile</button>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Xác minh trung tâm</div>
            {verifSubmitted ? (
              <div className="chip bg-emerald-50 text-emerald-700">Đã gửi. Admin sẽ duyệt trong 2-3 ngày.</div>
            ) : (
              <>
                <div className="text-sm text-neutral-500">Tải lên giấy phép đào tạo hoặc chứng nhận Goethe để nhận huy hiệu Verified.</div>
                <label className="mt-3 border-2 border-dashed border-neutral-300 dark:border-white/10 rounded-xl p-5 grid place-items-center text-sm text-neutral-500 cursor-pointer">
                  <Upload className="h-6 w-6 mb-2" /> Kéo thả hoặc chọn file PDF/JPG
                  <input type="file" className="hidden" />
                </label>
                <button onClick={() => setVerifSubmitted(true)} className="btn btn-primary mt-4 w-full">Gửi yêu cầu xác minh</button>
              </>
            )}
          </div>

          <div className="card mt-4">
            <div className="font-semibold mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-red" /> Gói Pro</div>
            <div className="text-sm text-neutral-500">Nâng cấp để đăng đơn tuyển sinh không giới hạn, featured banner, dashboard analytics chi tiết.</div>
            <a href="/pricing" className="btn btn-primary mt-4 w-full">Nâng cấp Center Pro</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="h-10 w-10 rounded-xl bg-brand-red/10 text-brand-red grid place-items-center mb-2"><Icon className="h-5 w-5" /></div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-display text-xl font-extrabold">{value}</div>
    </div>
  );
}
