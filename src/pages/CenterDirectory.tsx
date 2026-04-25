import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin, Filter, GraduationCap } from 'lucide-react';
import { centers } from '../data/mockData';
import { VerifiedBadge, FeaturedBadge, SponsoredBadge } from '../components/Badge';
import type { GermanLevel } from '../types';

const cities = ['Tất cả', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'];
const levels: (GermanLevel | 'Tất cả')[] = ['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'];

export default function CenterDirectory() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [level, setLevel] = useState<GermanLevel | 'Tất cả'>('Tất cả');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() =>
    centers.filter(c => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (city !== 'Tất cả' && c.city !== city) return false;
      if (level !== 'Tất cả' && !c.germanLevels.includes(level as GermanLevel)) return false;
      if (verifiedOnly && c.verification !== 'verified') return false;
      return true;
    }),
    [q, city, level, verifiedOnly]
  );

  return (
    <div className="section py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> TRUNG TÂM TIẾNG ĐỨC</div>
          <h1 className="font-display text-4xl font-extrabold">{filtered.length} trung tâm tại Việt Nam</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">Đánh giá thật từ học viên, xác minh bởi Admin.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 mb-6">
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-white/5 rounded-xl px-3">
          <Search className="h-4 w-4 text-neutral-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm trung tâm..." className="bg-transparent outline-none w-full py-2 text-sm" />
        </div>
        <select value={city} onChange={e => setCity(e.target.value)} className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
          {cities.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={level} onChange={e => setLevel(e.target.value as GermanLevel | 'Tất cả')} className="bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
          {levels.map(l => <option key={l}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm px-3"><input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} /> Chỉ đã xác minh</label>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(c => (
          <Link key={c.id} to={`/centers/${c.id}`} className="card hover:-translate-y-1 transition flex flex-col">
            <div className="flex items-start gap-4">
              <img src={c.logo} className="h-16 w-16 rounded-xl bg-neutral-100 object-contain" alt="" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {c.city}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400" /> {c.rating.toFixed(1)} <span className="text-neutral-500 font-normal">({c.reviewCount})</span>
                </div>
              </div>
              <FeaturedBadge featured={c.featured} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.germanLevels.map(l => <span key={l} className="chip bg-neutral-100 dark:bg-white/10 text-[11px]">{l}</span>)}
            </div>
            <div className="mt-auto pt-4 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <VerifiedBadge status={c.verification} />
                <SponsoredBadge sponsored={c.sponsored} />
              </div>
              <span className="text-xs text-brand-red font-semibold">Xem chi tiết →</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center py-16 text-neutral-500 flex items-center flex-col gap-2"><Filter className="h-8 w-8" /> Không có trung tâm phù hợp.</div>}
    </div>
  );
}
