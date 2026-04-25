import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Search, Star, MapPin, Briefcase, Building2 } from 'lucide-react';
import { companies, jobOrders } from '../data/mockData';
import { VerifiedBadge } from '../components/Badge';

export default function CompanyDirectory() {
  const [q, setQ] = useState('');
  const filtered = companies.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.sector.toLowerCase().includes(q.toLowerCase())
  );

  const jobsByCompany = (id: string) => jobOrders.filter(j => j.companyId === id).length;

  return (
    <div className="section py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4" /> CÔNG TY & NHÀ TUYỂN DỤNG</div>
          <h1 className="font-display text-4xl font-extrabold">Đối tác tuyển dụng tại Đức</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">Tất cả công ty đều được xác minh pháp lý bởi Admin.</p>
        </div>
        <Link to="/jobs" className="btn btn-primary">Xem tất cả đơn tuyển</Link>
      </div>

      <div className="card flex items-center gap-2 bg-neutral-100 dark:bg-white/5 mb-6">
        <Search className="h-4 w-4 text-neutral-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên hoặc ngành nghề..." className="bg-transparent outline-none w-full text-sm" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(c => (
          <div key={c.id} className="card flex flex-col">
            <div className="flex items-start gap-3">
              <img src={c.logo} className="h-14 w-14 rounded-xl bg-neutral-100 object-contain" alt="" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {c.city}, {c.state}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-semibold"><Star className="h-3.5 w-3.5 fill-amber-400" /> {c.rating.toFixed(1)} <span className="text-neutral-500 font-normal">({c.reviewCount})</span></div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="chip bg-neutral-100 dark:bg-white/10 flex items-center gap-1"><Building2 className="h-3 w-3" /> {c.sector}</span>
              <span className="chip bg-neutral-100 dark:bg-white/10">{c.size} nhân viên</span>
              <VerifiedBadge status={c.verification} />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3 line-clamp-2">{c.about}</p>
            <div className="mt-auto pt-4 flex items-center justify-between">
              <div className="text-xs text-neutral-500">{jobsByCompany(c.id)} đơn tuyển đang mở</div>
              <Link to={`/jobs?company=${c.id}`} className="text-xs text-brand-red font-semibold">Xem đơn tuyển →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
