import { Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { MapPin, Clock, Euro, Briefcase, Search, Filter, Home as HomeIcon } from 'lucide-react';
import { companies, jobOrders } from '../data/mockData';
import { VerifiedBadge, FeaturedBadge, SponsoredBadge } from '../components/Badge';
import type { GermanLevel, TrainingType } from '../types';

export default function JobOrderList() {
  const [sp] = useSearchParams();
  const companyFilter = sp.get('company');
  const [q, setQ] = useState('');
  const [trainingType, setTrainingType] = useState<TrainingType | 'Tất cả'>('Tất cả');
  const [level, setLevel] = useState<GermanLevel | 'Tất cả'>('Tất cả');
  const [state, setState] = useState('Tất cả');
  const states = ['Tất cả', ...Array.from(new Set(jobOrders.map(j => j.state)))];

  const filtered = useMemo(() => jobOrders.filter(j => {
    if (companyFilter && j.companyId !== companyFilter) return false;
    if (q && !j.occupation.toLowerCase().includes(q.toLowerCase())) return false;
    if (trainingType !== 'Tất cả' && j.trainingType !== trainingType) return false;
    if (level !== 'Tất cả' && j.germanLevelRequired !== level) return false;
    if (state !== 'Tất cả' && j.state !== state) return false;
    return true;
  }), [q, trainingType, level, state, companyFilter]);

  return (
    <div className="section py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4" /> ĐƠN TUYỂN</div>
          <h1 className="font-display text-4xl font-extrabold">{filtered.length} cơ hội Ausbildung tại Đức</h1>
        </div>
      </div>

      <div className="card grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-3 mb-6">
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-white/5 rounded-xl px-3">
          <Search className="h-4 w-4 text-neutral-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm ngành nghề..." className="bg-transparent outline-none w-full py-2 text-sm" />
        </div>
        <select value={trainingType} onChange={e => setTrainingType(e.target.value as TrainingType | 'Tất cả')} className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
          <option>Tất cả</option><option value="dual">Dual</option><option value="school">School-based</option>
        </select>
        <select value={level} onChange={e => setLevel(e.target.value as GermanLevel | 'Tất cả')} className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
          {['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'].map(l => <option key={l}>{l}</option>)}
        </select>
        <select value={state} onChange={e => setState(e.target.value)} className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
          {states.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.map(j => {
          const co = companies.find(c => c.id === j.companyId)!;
          return (
            <Link key={j.id} to={`/jobs/${j.id}`} className="card hover:shadow-glass hover:-translate-y-1 transition grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
              <img src={co.logo} className="h-16 w-16 rounded-xl bg-neutral-100 object-contain" alt="" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-lg">{j.occupation}</div>
                  <FeaturedBadge featured={j.featured} />
                  <SponsoredBadge sponsored={j.sponsored} />
                </div>
                <div className="text-sm text-neutral-500 mt-1 flex flex-wrap items-center gap-3">
                  <span>{co.name}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.city}, {j.state}</span>
                  <VerifiedBadge status={j.verification} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="chip bg-neutral-100 dark:bg-white/10">{j.trainingType === 'dual' ? 'Dual' : 'School'}</span>
                  <span className="chip bg-neutral-100 dark:bg-white/10">Tiếng Đức {j.germanLevelRequired}</span>
                  <span className="chip bg-neutral-100 dark:bg-white/10">GD: {j.educationRequired}</span>
                  {j.accommodationSupport && <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><HomeIcon className="h-3 w-3" /> Hỗ trợ nhà ở</span>}
                </div>
              </div>
              <div className="text-right min-w-[160px]">
                <div className="text-xl font-display font-extrabold text-brand-red flex items-center justify-end gap-1"><Euro className="h-4 w-4" />{j.monthlyAllowanceEUR.toLocaleString()}/tháng</div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> Phỏng vấn {j.interviewDate}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Hạn nộp: {j.deadline}</div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-16 text-neutral-500 flex flex-col items-center gap-2"><Filter className="h-8 w-8" /> Không có đơn tuyển phù hợp.</div>}
      </div>
    </div>
  );
}
