import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, LogOut, UserCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../store/i18n';
import { useTheme } from '../store/theme';
import { useAuth } from '../store/auth';

const navItems = [
  { to: '/', key: 'nav.home' },
  { to: '/news', key: 'nav.news' },
  { to: '/centers', key: 'nav.centers' },
  { to: '/companies', key: 'nav.companies' },
  { to: '/community', key: 'nav.community' },
  { to: '/pricing', key: 'nav.pricing' },
];

export default function Header() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dashPath = user
    ? user.role === 'admin' ? '/admin'
      : user.role === 'center' ? '/dashboard/center'
      : user.role === 'employer' ? '/dashboard/employer'
      : '/dashboard/student'
    : '/login';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 dark:bg-neutral-950/75 border-b border-black/5 dark:border-white/5">
      <div className="section flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-red to-brand-redDark grid place-items-center text-white font-bold">A</div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-sm tracking-tight">AUSBILDUNG HUB</div>
            <div className="text-[10px] text-brand-red font-bold tracking-widest">VIETNAM</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(it => (
            <NavLink key={it.to} to={it.to} end={it.to === '/'}
              className={({ isActive }) => clsx(
                'px-3 py-2 rounded-full text-sm font-medium transition',
                isActive ? 'text-brand-red' : 'text-neutral-700 dark:text-neutral-300 hover:text-brand-red'
              )}>
              {t(it.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/centers')} aria-label="search" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <Search className="h-5 w-5" />
          </button>
          <button onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
            {lang === 'vi' ? 'VI' : 'EN'}
          </button>
          <button onClick={toggle} aria-label="theme" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <>
              <Link to={dashPath} className="hidden md:inline-flex btn btn-ghost !py-1.5 !px-3 !text-xs">
                <UserCircle2 className="h-4 w-4" /> {user.fullName}
              </Link>
              <button onClick={logout} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" aria-label="logout">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex btn btn-ghost">{t('auth.login')}</Link>
              <Link to="/register" className="btn btn-primary">{t('auth.register')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
