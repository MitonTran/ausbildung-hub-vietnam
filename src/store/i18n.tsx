import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'vi' | 'en';

const dict: Record<Lang, Record<string, string>> = {
  vi: {
    'nav.home': 'Trang chủ',
    'nav.news': 'Thông tin',
    'nav.centers': 'Trung tâm tiếng Đức',
    'nav.companies': 'Công ty & Đơn tuyển',
    'nav.community': 'Cộng đồng',
    'nav.tools': 'Công cụ',
    'nav.pricing': 'Gói dịch vụ',
    'auth.login': 'Đăng nhập',
    'auth.register': 'Đăng ký',
  },
  en: {
    'nav.home': 'Home',
    'nav.news': 'News',
    'nav.centers': 'Language Centers',
    'nav.companies': 'Companies & Jobs',
    'nav.community': 'Community',
    'nav.tools': 'Tools',
    'nav.pricing': 'Pricing',
    'auth.login': 'Log in',
    'auth.register': 'Sign up',
  },
};

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }
const I18nCtx = createContext<Ctx>({ lang: 'vi', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'vi');
  const set = (l: Lang) => { setLang(l); localStorage.setItem('lang', l); };
  const t = (k: string) => dict[lang][k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang: set, t }}>{children}</I18nCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(I18nCtx);
