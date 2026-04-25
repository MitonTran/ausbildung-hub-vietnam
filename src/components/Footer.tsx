import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

const Facebook = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-2.9h2.4V9.7c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"/></svg>
);
const Youtube = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1 31.2 31.2 0 0 0 .5-5.8 31.2 31.2 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"/></svg>
);
const Instagram = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
);

export default function Footer() {
  return (
    <footer className="mt-24 bg-neutral-950 text-neutral-300">
      <div className="section py-14 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-red to-brand-redDark grid place-items-center text-white font-bold">A</div>
            <div>
              <div className="font-display font-extrabold text-sm tracking-tight">AUSBILDUNG HUB</div>
              <div className="text-[10px] text-brand-red font-bold tracking-widest">VIETNAM</div>
            </div>
          </div>
          <p className="text-sm text-neutral-400">Nền tảng số 1 về du học nghề Đức tại Việt Nam. Thông tin minh bạch, lộ trình rõ ràng, kết nối cơ hội nghề nghiệp thực tế.</p>
          <div className="mt-4 flex gap-3 text-neutral-400">
            <a href="#" aria-label="facebook" className="hover:text-white"><Facebook className="h-5 w-5" /></a>
            <a href="#" aria-label="youtube" className="hover:text-white"><Youtube className="h-5 w-5" /></a>
            <a href="#" aria-label="instagram" className="hover:text-white"><Instagram className="h-5 w-5" /></a>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-white mb-3">Khám phá</div>
          <ul className="text-sm space-y-2">
            <li><Link to="/news" className="hover:text-white">Tin tức & Thị trường</Link></li>
            <li><Link to="/centers" className="hover:text-white">Trung tâm tiếng Đức</Link></li>
            <li><Link to="/companies" className="hover:text-white">Công ty tuyển dụng</Link></li>
            <li><Link to="/jobs" className="hover:text-white">Đơn tuyển mới nhất</Link></li>
            <li><Link to="/community" className="hover:text-white">Cộng đồng</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold text-white mb-3">Dành cho bạn</div>
          <ul className="text-sm space-y-2">
            <li><Link to="/register" className="hover:text-white">Dành cho Học viên</Link></li>
            <li><Link to="/register" className="hover:text-white">Dành cho Trung tâm</Link></li>
            <li><Link to="/register" className="hover:text-white">Dành cho Nhà tuyển dụng</Link></li>
            <li><Link to="/pricing" className="hover:text-white">Bảng giá</Link></li>
            <li><Link to="/dashboard/student" className="hover:text-white">Quiz đủ điều kiện</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold text-white mb-3">Liên hệ</div>
          <ul className="text-sm space-y-2 text-neutral-400">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@ausbildunghub.vn</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +84 24 9999 8888</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Hà Nội · TP.HCM · Đà Nẵng</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5">
        <div className="section flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-2">
          <div>© {new Date().getFullYear()} Ausbildung Hub Vietnam. Mọi quyền được bảo lưu.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-neutral-300">Điều khoản</a>
            <a href="#" className="hover:text-neutral-300">Riêng tư</a>
            <a href="#" className="hover:text-neutral-300">Cookie</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
