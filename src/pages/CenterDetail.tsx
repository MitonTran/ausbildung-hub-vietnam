import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Phone, Mail, Globe, BadgeCheck, Calendar, Users, CheckCircle2, Flag } from 'lucide-react';
import { useState } from 'react';
import { centerReviews, centers } from '../data/mockData';
import { VerifiedBadge, FeaturedBadge } from '../components/Badge';

export default function CenterDetail() {
  const { id } = useParams();
  const center = centers.find(c => c.id === id);
  const [reviews, setReviews] = useState(() => centerReviews.filter(r => r.centerId === id));
  const [formRating, setFormRating] = useState(5);
  const [formName, setFormName] = useState('');
  const [formText, setFormText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!center) return <div className="section py-20 text-center">Không tìm thấy trung tâm.</div>;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formText) return;
    // eslint-disable-next-line react-hooks/purity
    const id = 'nr' + Date.now();
    const createdAt = new Date().toISOString().slice(0, 10);
    setReviews([{ id, centerId: center.id, author: formName, comment: formText, rating: formRating, approved: false, createdAt }, ...reviews]);
    setFormName(''); setFormText(''); setFormRating(5); setSubmitted(true);
  };

  return (
    <div className="section py-10">
      <Link to="/centers" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-red mb-6"><ArrowLeft className="h-4 w-4" /> Danh bạ trung tâm</Link>

      <div className="card">
        <div className="flex flex-wrap items-start gap-6">
          <img src={center.logo} className="h-24 w-24 rounded-2xl bg-neutral-100 object-contain" alt="" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-extrabold">{center.name}</h1>
              <VerifiedBadge status={center.verification} />
              <FeaturedBadge featured={center.featured} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
              <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {center.city} ({center.branches.length} chi nhánh)</div>
              <div className="flex items-center gap-1 text-amber-500 font-semibold"><Star className="h-4 w-4 fill-amber-400" /> {center.rating.toFixed(1)} ({center.reviewCount} đánh giá)</div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mt-4 max-w-3xl">{center.about}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {center.germanLevels.map(l => <span key={l} className="chip bg-brand-red/10 text-brand-red text-xs">{l}</span>)}
              {center.services.map(s => <span key={s} className="chip bg-neutral-100 dark:bg-white/10 text-xs"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {s}</span>)}
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[220px]">
            <a href={`tel:${center.phone}`} className="btn btn-primary"><Phone className="h-4 w-4" /> Gọi ngay</a>
            <a href={`mailto:${center.email}`} className="btn btn-ghost"><Mail className="h-4 w-4" /> {center.email}</a>
            {center.website && <a target="_blank" rel="noreferrer" href={center.website} className="btn btn-ghost"><Globe className="h-4 w-4" /> Website</a>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="card">
          <div className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-red" /> Lịch học</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">{center.classSchedule}</div>
        </div>
        <div className="card">
          <div className="font-semibold mb-3">Học phí (VNĐ/tháng)</div>
          <ul className="text-sm space-y-1">
            {center.tuition.map(t => (
              <li key={t.level} className="flex justify-between"><span>Trình độ {t.level}</span><span className="font-semibold">{t.monthlyVND.toLocaleString()}đ</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-brand-red" /> Chi nhánh</div>
          <ul className="text-sm space-y-1">{center.branches.map(b => <li key={b}>• {b}</li>)}</ul>
        </div>
      </div>

      {/* Teachers */}
      <div className="mt-10">
        <h2 className="font-display text-2xl font-extrabold mb-4">Đội ngũ giáo viên</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {center.teachers.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand-red/10 grid place-items-center font-bold text-brand-red">{t.name.split(' ').slice(-1)[0][0]}</div>
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.yearsExp} năm kinh nghiệm</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.levels.map(l => <span key={l} className="chip bg-neutral-100 dark:bg-white/10 text-xs">{l}</span>)}
              </div>
              {t.bio && <div className="text-sm text-neutral-500 mt-2">{t.bio}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Reviews & Contact form */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-6 mt-10">
        <div>
          <h2 className="font-display text-2xl font-extrabold mb-4">Đánh giá từ học viên ({reviews.length})</h2>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-white/10 grid place-items-center font-semibold">{r.author[0]}</div>
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-1">{r.author} {r.proofUrl && <BadgeCheck className="h-4 w-4 text-emerald-500" />}</div>
                      <div className="text-[11px] text-neutral-500">{r.createdAt} • {r.approved ? 'Đã duyệt' : 'Đang chờ kiểm duyệt'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm">{r.comment}</p>
                <button className="mt-2 text-xs text-neutral-400 hover:text-brand-red flex items-center gap-1"><Flag className="h-3 w-3" /> Báo cáo</button>
              </div>
            ))}
          </div>

          <div className="card mt-6">
            <div className="font-semibold mb-3">Viết đánh giá</div>
            {submitted && <div className="chip bg-emerald-50 text-emerald-700 mb-3">Đánh giá đã gửi và đang chờ admin duyệt.</div>}
            <form onSubmit={handleReview} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">Đánh giá:</span>
                {[1, 2, 3, 4, 5].map(n => (
                  <button type="button" key={n} onClick={() => setFormRating(n)}>
                    <Star className={`h-5 w-5 ${n <= formRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`} />
                  </button>
                ))}
              </div>
              <input required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Tên của bạn" />
              <textarea required value={formText} onChange={e => setFormText(e.target.value)} rows={3} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Trải nghiệm của bạn..." />
              <label className="block text-xs text-neutral-500">Tuỳ chọn: Tải lên ảnh chứng minh học viên <input type="file" className="block mt-1 text-xs" /></label>
              <button className="btn btn-primary">Gửi đánh giá</button>
            </form>
          </div>
        </div>

        <div className="card h-max">
          <div className="font-semibold mb-3">Liên hệ tư vấn</div>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); alert('Cảm ơn, trung tâm sẽ liên hệ lại!'); }}>
            <input required className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Họ và tên" />
            <input required type="tel" className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Số điện thoại" />
            <input type="email" className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Email (tuỳ chọn)" />
            <select className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
              <option>Tôi quan tâm trình độ A1</option>
              <option>A2</option><option>B1</option><option>B2</option>
            </select>
            <textarea rows={3} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Nội dung" />
            <button className="btn btn-primary w-full">Gửi yêu cầu</button>
          </form>
        </div>
      </div>
    </div>
  );
}
