import { useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { plans } from '../data/mockData';
import { Link } from 'react-router-dom';

const audiences = [
  { key: 'student' as const, label: 'Học viên' },
  { key: 'center' as const, label: 'Trung tâm' },
  { key: 'employer' as const, label: 'Nhà tuyển dụng' },
];

export default function Pricing() {
  const [audience, setAudience] = useState<'student' | 'center' | 'employer'>('student');
  const visible = plans.filter(p => p.audience === audience);

  return (
    <div className="section py-12">
      <div className="text-center max-w-2xl mx-auto">
        <div className="text-xs font-bold text-brand-red tracking-widest mb-3 flex items-center justify-center gap-2"><Sparkles className="h-4 w-4" /> GÓI DỊCH VỤ</div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold">Chọn gói phù hợp với bạn</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-3">Minh bạch, không phí ẩn. Huỷ bất cứ lúc nào.</p>
      </div>

      <div className="flex justify-center mt-8">
        <div className="inline-flex rounded-full bg-neutral-100 dark:bg-white/5 p-1">
          {audiences.map(a => (
            <button key={a.key} onClick={() => setAudience(a.key)} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${audience === a.key ? 'bg-white dark:bg-neutral-900 shadow-soft' : 'text-neutral-500'}`}>{a.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map(p => (
          <div key={p.id} className={`card relative ${p.highlight ? 'ring-2 ring-brand-red shadow-glass scale-[1.02]' : ''}`}>
            {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-brand-red text-white">PHỔ BIẾN NHẤT</div>}
            <div className="font-display text-2xl font-extrabold">{p.name}</div>
            <div className="mt-2 text-4xl font-extrabold">
              {p.priceVND === 0 ? 'Miễn phí' : <>
                {p.priceVND.toLocaleString()}<span className="text-sm font-normal text-neutral-500">đ/{p.interval === 'month' ? 'tháng' : 'năm'}</span>
              </>}
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> {f}</li>
              ))}
            </ul>
            <Link to="/register" className={`mt-6 w-full btn ${p.highlight ? 'btn-primary' : 'btn-ghost'}`}>
              {p.priceVND === 0 ? 'Bắt đầu miễn phí' : 'Chọn gói này'}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-16 card bg-gradient-to-r from-brand-red to-brand-redDark text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm opacity-80">ENTERPRISE</div>
            <div className="font-display text-2xl font-extrabold">Bạn là tổ chức lớn? Cần tuỳ chỉnh?</div>
            <p className="text-sm opacity-90 mt-1">Chúng tôi cung cấp gói riêng cho bệnh viện, tập đoàn, tổ chức giáo dục có quy mô lớn.</p>
          </div>
          <a href="mailto:sales@ausbildunghub.vn" className="btn bg-white text-brand-red hover:bg-neutral-100">Liên hệ đội sales</a>
        </div>
      </div>
    </div>
  );
}
