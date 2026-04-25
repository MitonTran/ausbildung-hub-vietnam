import { Gift, Wrench, BookOpen, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

const items = [
  { icon: Gift, label: 'Ưu đãi', to: '/pricing' },
  { icon: Wrench, label: 'Công cụ', to: '/dashboard/student' },
  { icon: BookOpen, label: 'Hướng dẫn', to: '/news' },
  { icon: Headphones, label: 'Liên hệ', to: '/community' },
];

export default function FloatingRail() {
  return (
    <div className="hidden xl:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
      {items.map(it => (
        <Link key={it.label} to={it.to}
          className="group glass rounded-2xl w-16 py-3 flex flex-col items-center gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:text-brand-red transition">
          <div className="h-9 w-9 rounded-full bg-brand-red/10 grid place-items-center group-hover:bg-brand-red/20">
            <it.icon className="h-5 w-5 text-brand-red" />
          </div>
          <span>{it.label}</span>
        </Link>
      ))}
    </div>
  );
}
