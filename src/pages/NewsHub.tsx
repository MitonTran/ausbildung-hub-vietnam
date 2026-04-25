import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Newspaper, Search, Tag as TagIcon } from 'lucide-react';
import { articles } from '../data/mockData';
import { SponsoredBadge } from '../components/Badge';

export default function NewsHub() {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => Array.from(new Set(articles.flatMap(a => a.tags))), []);
  const filtered = articles.filter(a => {
    const matchesQ = !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.excerpt.toLowerCase().includes(q.toLowerCase());
    const matchesTag = !tag || a.tags.includes(tag);
    return matchesQ && matchesTag;
  });

  const featured = articles.find(a => a.featured) ?? articles[0];
  const rest = filtered.filter(a => a.id !== featured.id);

  return (
    <div className="section py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2 flex items-center gap-2"><Newspaper className="h-4 w-4" /> THÔNG TIN & TIN TỨC</div>
          <h1 className="font-display text-4xl font-extrabold">Thị trường du học nghề Đức</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">Cập nhật nhanh, chính xác, phân biệt rõ nội dung biên tập và tài trợ.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-full px-4 py-2 w-72 max-w-full">
          <Search className="h-4 w-4 text-neutral-400" />
          <input value={q} onChange={e => setQ(e.target.value)} className="bg-transparent outline-none w-full text-sm" placeholder="Tìm bài viết..." />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setTag(null)} className={`chip ${tag === null ? 'bg-brand-red text-white' : 'bg-neutral-100 dark:bg-white/10'}`}>Tất cả</button>
        {allTags.map(tg => (
          <button key={tg} onClick={() => setTag(tg)} className={`chip ${tag === tg ? 'bg-brand-red text-white' : 'bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200'}`}>
            <TagIcon className="h-3 w-3" /> {tg}
          </button>
        ))}
      </div>

      {/* Featured hero article */}
      <Link to={`/news/${featured.slug}`} className="block card overflow-hidden p-0 mb-10 md:grid md:grid-cols-2">
        <img src={featured.cover} alt="" className="h-72 md:h-full w-full object-cover" />
        <div className="p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="chip bg-brand-red text-white">NỔI BẬT</span>
            <SponsoredBadge sponsored={featured.sponsored} />
          </div>
          <h2 className="font-display text-3xl font-extrabold leading-tight">{featured.title}</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-3">{featured.excerpt}</p>
          <div className="mt-4 text-xs text-neutral-500">{featured.author} • {featured.publishedAt} • {featured.tags.join(' / ')}</div>
        </div>
      </Link>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rest.map(a => (
          <Link key={a.id} to={`/news/${a.slug}`} className="card overflow-hidden p-0 hover:-translate-y-1 transition">
            <div className="relative">
              <img src={a.cover} alt="" className="h-44 w-full object-cover" />
              <div className="absolute top-3 left-3"><SponsoredBadge sponsored={a.sponsored} /></div>
            </div>
            <div className="p-5">
              <div className="font-semibold leading-snug">{a.title}</div>
              <div className="text-sm text-neutral-500 mt-2 line-clamp-2">{a.excerpt}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.tags.slice(0, 2).map(t => <span key={t} className="chip bg-neutral-100 dark:bg-white/10 text-xs">{t}</span>)}
              </div>
              <div className="mt-3 text-xs text-neutral-500">{a.author} • {a.publishedAt}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
