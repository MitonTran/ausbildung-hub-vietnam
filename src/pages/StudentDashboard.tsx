import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, TrendingUp, BookOpen, Heart, Zap, Briefcase, RefreshCw } from 'lucide-react';
import { useAuth } from '../store/auth';
import { jobOrders } from '../data/mockData';

type QuizAnswers = { age: number; germanLevel: string; education: string; budgetMillion: number };

function scoreQuiz(a: QuizAnswers) {
  let score = 0;
  // Age (peak 18-24)
  if (a.age >= 18 && a.age <= 24) score += 25;
  else if (a.age <= 30) score += 20;
  else if (a.age <= 35) score += 12;
  else score += 5;

  // German level
  const lvl = { A1: 5, A2: 10, B1: 30, B2: 35, C1: 38, C2: 40 }[a.germanLevel] ?? 0;
  score += lvl;

  // Education
  const edu = { 'Tốt nghiệp THCS': 5, 'Tốt nghiệp THPT': 18, 'Trung cấp/Cao đẳng': 22, 'Đại học trở lên': 25 }[a.education] ?? 0;
  score += edu;

  // Budget
  if (a.budgetMillion >= 250) score += 10;
  else if (a.budgetMillion >= 150) score += 7;
  else if (a.budgetMillion >= 80) score += 4;
  else score += 1;

  return Math.min(100, score);
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<QuizAnswers>({ age: 22, germanLevel: 'B1', education: 'Tốt nghiệp THPT', budgetMillion: 180 });
  const [submitted, setSubmitted] = useState(false);

  const score = scoreQuiz(answers);
  const band =
    score >= 80 ? { label: 'Rất cao — Sẵn sàng Ausbildung', color: 'from-emerald-500 to-emerald-600' } :
    score >= 60 ? { label: 'Tốt — Hoàn thiện thêm tiếng Đức', color: 'from-amber-400 to-amber-500' } :
    score >= 40 ? { label: 'Trung bình — Cần chuẩn bị thêm', color: 'from-orange-400 to-orange-500' } :
                  { label: 'Thấp — Nên học tiếng từ A1', color: 'from-rose-500 to-rose-600' };

  const suggestedJobs = jobOrders.filter(j => {
    const required = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(j.germanLevelRequired);
    const user = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(answers.germanLevel);
    return user >= required;
  }).slice(0, 3);

  return (
    <div className="section py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2">STUDENT DASHBOARD</div>
          <h1 className="font-display text-3xl font-extrabold">Xin chào, {user?.fullName ?? 'Học viên'} 👋</h1>
        </div>
        <div className="chip bg-brand-red/10 text-brand-red">Gói: {user?.plan ?? 'free'}</div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat icon={Heart} label="Đã lưu" value="5 đơn tuyển" />
        <Stat icon={Briefcase} label="Đã ứng tuyển" value="2" />
        <Stat icon={BookOpen} label="Trình độ" value={answers.germanLevel} />
        <Stat icon={TrendingUp} label="Điểm đủ điều kiện" value={submitted ? score + '/100' : '—'} />
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        {/* Quiz */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-10 w-10 rounded-xl bg-brand-red text-white grid place-items-center"><Target className="h-5 w-5" /></div>
            <div>
              <div className="font-display text-xl font-extrabold">Quiz đủ điều kiện du học nghề Đức</div>
              <div className="text-xs text-neutral-500">Ước lượng dựa trên 4 yếu tố: tuổi, tiếng Đức, học vấn, ngân sách</div>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="grid md:grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="mb-1 font-medium">Tuổi</div>
              <input type="number" min={15} max={50} value={answers.age} onChange={e => setAnswers({ ...answers, age: Number(e.target.value) })} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2" />
            </label>
            <label className="text-sm">
              <div className="mb-1 font-medium">Trình độ tiếng Đức</div>
              <select value={answers.germanLevel} onChange={e => setAnswers({ ...answers, germanLevel: e.target.value })} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 font-medium">Học vấn</div>
              <select value={answers.education} onChange={e => setAnswers({ ...answers, education: e.target.value })} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2">
                {['Tốt nghiệp THCS', 'Tốt nghiệp THPT', 'Trung cấp/Cao đẳng', 'Đại học trở lên'].map(l => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 font-medium">Ngân sách (triệu đồng) — học tiếng + phí dịch vụ</div>
              <input type="range" min={30} max={400} step={10} value={answers.budgetMillion} onChange={e => setAnswers({ ...answers, budgetMillion: Number(e.target.value) })} className="w-full" />
              <div className="text-xs text-neutral-500 mt-1">{answers.budgetMillion} triệu</div>
            </label>
            <button className="btn btn-primary col-span-full">Tính điểm</button>
          </form>

          {submitted && (
            <div className="mt-6 rounded-2xl border border-neutral-200 dark:border-white/10 p-5">
              <div className="text-sm text-neutral-500">Điểm của bạn</div>
              <div className="flex items-end gap-3 mt-1">
                <div className="font-display text-5xl font-extrabold">{score}</div>
                <div className="text-neutral-500 mb-2">/100</div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${band.color}`} style={{ width: `${score}%` }} />
              </div>
              <div className="text-sm font-semibold mt-3">{band.label}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setSubmitted(false)} className="btn btn-ghost !py-2 !px-3 !text-xs"><RefreshCw className="h-3 w-3" /> Làm lại</button>
                <Link to="/jobs" className="btn btn-primary !py-2 !px-3 !text-xs"><Zap className="h-3 w-3" /> Xem đơn tuyển phù hợp</Link>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <div className="card">
            <div className="font-semibold mb-3">Gợi ý đơn tuyển</div>
            <div className="space-y-3">
              {suggestedJobs.map(j => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="block border border-neutral-200 dark:border-white/10 rounded-xl p-3 hover:border-brand-red">
                  <div className="text-sm font-semibold">{j.occupation}</div>
                  <div className="text-xs text-neutral-500">{j.city} • {j.monthlyAllowanceEUR.toLocaleString()}€/tháng • {j.germanLevelRequired}</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="card mt-4">
            <div className="font-semibold mb-2">Danh sách đã lưu</div>
            <div className="text-sm text-neutral-500">Bạn chưa lưu đơn tuyển nào. Nâng cấp lên <Link to="/pricing" className="text-brand-red font-semibold">Student Plus</Link> để lưu không giới hạn.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="card">
      <div className="h-10 w-10 rounded-xl bg-brand-red/10 text-brand-red grid place-items-center mb-2"><Icon className="h-5 w-5" /></div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-display text-xl font-extrabold">{value}</div>
    </div>
  );
}
