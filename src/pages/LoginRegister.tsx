import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import type { Role } from '../types';
import { GraduationCap, Building2, Briefcase, Shield, User as UserIcon } from 'lucide-react';

const roles: { key: Role; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'student', label: 'Học viên', desc: 'Tìm trung tâm, đơn tuyển, làm quiz đủ điều kiện', icon: GraduationCap },
  { key: 'center', label: 'Trung tâm tiếng Đức', desc: 'Quảng bá trung tâm, thu hút học viên mới', icon: Building2 },
  { key: 'employer', label: 'Nhà tuyển dụng', desc: 'Đăng đơn tuyển, quản lý ứng viên', icon: Briefcase },
  { key: 'admin', label: 'Admin', desc: 'Duyệt trung tâm, moderate nội dung', icon: Shield },
];

export default function LoginRegister({ mode }: { mode: 'login' | 'register' }) {
  const [email, setEmail] = useState('demo@ausbildunghub.vn');
  const [password, setPassword] = useState('••••••••');
  const [role, setRole] = useState<Role>('student');
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, role);
    const dest =
      role === 'admin' ? '/admin' :
      role === 'center' ? '/dashboard/center' :
      role === 'employer' ? '/dashboard/employer' : '/dashboard/student';
    nav(dest);
  };

  return (
    <div className="section py-10">
      <div className="grid lg:grid-cols-2 gap-10 items-start max-w-6xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-2 chip bg-brand-red/10 text-brand-red mb-5"><UserIcon className="h-3.5 w-3.5" /> {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</div>
          <h1 className="font-display text-4xl font-extrabold">{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản miễn phí'}</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">{mode === 'login' ? 'Đăng nhập để xem cơ hội dành riêng cho bạn.' : 'Chỉ mất 1 phút. Không yêu cầu thẻ tín dụng.'}</p>

          {mode === 'register' && (
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {roles.map(r => (
                <button key={r.key} type="button" onClick={() => setRole(r.key)}
                  className={`card text-left transition ${role === r.key ? 'ring-2 ring-brand-red' : 'hover:-translate-y-0.5'}`}>
                  <div className={`h-10 w-10 rounded-xl grid place-items-center ${role === r.key ? 'bg-brand-red text-white' : 'bg-brand-red/10 text-brand-red'} mb-3`}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-xs text-neutral-500 mt-1">{r.desc}</div>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="card mt-6 space-y-3">
            {mode === 'register' && (
              <input required className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2.5 text-sm" placeholder="Họ và tên" />
            )}
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2.5 text-sm" placeholder="Email" />
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2.5 text-sm" placeholder="Mật khẩu" />
            {mode === 'login' && (
              <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2.5 text-sm">
                {roles.map(r => <option key={r.key} value={r.key}>Đăng nhập với vai trò: {r.label}</option>)}
              </select>
            )}
            <button className="btn btn-primary w-full">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
            <div className="text-center text-sm text-neutral-500">
              {mode === 'login'
                ? <>Chưa có tài khoản? <Link to="/register" className="text-brand-red font-semibold">Đăng ký</Link></>
                : <>Đã có tài khoản? <Link to="/login" className="text-brand-red font-semibold">Đăng nhập</Link></>}
            </div>
          </form>
        </div>

        <div className="hidden lg:block">
          <div className="rounded-3xl overflow-hidden shadow-glass relative">
            <img src="https://images.unsplash.com/photo-1560732488-7b5f4d50cf6b?w=900&q=70" alt="Germany" className="w-full h-[560px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
            <div className="absolute bottom-0 p-8 text-white">
              <div className="font-display text-2xl font-extrabold">Hành trình Ausbildung bắt đầu từ đây</div>
              <p className="mt-2 text-sm opacity-90">Hơn 12.500 học viên đã tin tưởng và được kết nối với các cơ hội tại Đức.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
