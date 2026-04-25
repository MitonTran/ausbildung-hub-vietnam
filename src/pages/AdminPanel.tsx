import { useState } from 'react';
import { Shield, BadgeCheck, XCircle, Flag, Users, BarChart3, Megaphone } from 'lucide-react';
import { verificationQueue, reportFlags, centers, jobOrders, communityPosts } from '../data/mockData';
import type { VerificationRequest, ReportFlag } from '../types';

type Tab = 'verify' | 'moderate' | 'analytics';

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('verify');
  const [queue, setQueue] = useState<VerificationRequest[]>(verificationQueue);
  const [flags, setFlags] = useState<ReportFlag[]>(reportFlags);

  const resolve = (id: string, result: 'verified' | 'rejected') =>
    setQueue(queue.map(q => q.id === id ? { ...q, status: result } : q));

  const handleFlag = (id: string, result: 'resolved' | 'dismissed') =>
    setFlags(flags.map(f => f.id === id ? { ...f, status: result } : f));

  return (
    <div className="section py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> ADMIN PANEL</div>
          <h1 className="font-display text-3xl font-extrabold">Kiểm duyệt & phân tích hệ thống</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-3 mb-8">
        <Stat icon={Users} label="Người dùng" value="12,547" />
        <Stat icon={BadgeCheck} label="Trung tâm xác minh" value="230" />
        <Stat icon={Megaphone} label="Đơn tuyển đang mở" value={jobOrders.length.toString()} />
        <Stat icon={Flag} label="Báo cáo đang mở" value={flags.filter(f => f.status === 'open').length.toString()} />
        <Stat icon={BarChart3} label="Traffic tuần" value="+18%" />
      </div>

      <div className="inline-flex rounded-full bg-neutral-100 dark:bg-white/5 p-1 mb-5">
        {[['verify', 'Xác minh'], ['moderate', 'Kiểm duyệt'], ['analytics', 'Phân tích']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as Tab)} className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === k ? 'bg-white dark:bg-neutral-900 shadow-soft' : 'text-neutral-500'}`}>{label}</button>
        ))}
      </div>

      {tab === 'verify' && (
        <div className="card">
          <div className="font-semibold mb-4">Hàng đợi xác minh ({queue.filter(q => q.status === 'pending').length} pending)</div>
          <div className="space-y-3">
            {queue.map(q => (
              <div key={q.id} className="flex flex-wrap items-center gap-3 border border-neutral-200 dark:border-white/10 rounded-xl p-3">
                <div className="flex-1">
                  <div className="font-semibold">{q.subjectName}</div>
                  <div className="text-xs text-neutral-500">Loại: {q.subject} • Nộp lúc {q.submittedAt}</div>
                </div>
                <StatusPill status={q.status} />
                {q.status === 'pending' && (
                  <>
                    <button onClick={() => resolve(q.id, 'verified')} className="btn btn-primary !py-1.5 !px-3 !text-xs"><BadgeCheck className="h-3 w-3" /> Duyệt</button>
                    <button onClick={() => resolve(q.id, 'rejected')} className="btn btn-ghost !py-1.5 !px-3 !text-xs"><XCircle className="h-3 w-3" /> Từ chối</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'moderate' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="font-semibold mb-3">Báo cáo từ người dùng</div>
            <div className="space-y-3">
              {flags.map(f => (
                <div key={f.id} className="border border-neutral-200 dark:border-white/10 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold capitalize">{f.targetType} · {f.targetId}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">Người báo: {f.reporter} • {f.createdAt}</div>
                      <div className="text-sm mt-2">{f.reason}</div>
                    </div>
                    <StatusPill status={f.status} />
                  </div>
                  {f.status === 'open' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleFlag(f.id, 'resolved')} className="btn btn-primary !py-1.5 !px-3 !text-xs">Ẩn nội dung</button>
                      <button onClick={() => handleFlag(f.id, 'dismissed')} className="btn btn-ghost !py-1.5 !px-3 !text-xs">Bỏ qua</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="font-semibold mb-3">Bài cộng đồng cần theo dõi</div>
            <div className="space-y-3">
              {communityPosts.slice(0, 4).map(p => (
                <div key={p.id} className="border border-neutral-200 dark:border-white/10 rounded-xl p-3">
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-xs text-neutral-500">{p.author} • {p.comments.length} bình luận • {p.likes} thích</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="font-semibold mb-3">Top trung tâm theo lượt xem</div>
            <ol className="space-y-2 text-sm">
              {centers.slice(0, 5).map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-neutral-400 w-5">#{i + 1}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-neutral-500">{(5000 - i * 430).toLocaleString()} lượt</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="card">
            <div className="font-semibold mb-3">Ngành có nhiều đơn tuyển</div>
            <ol className="space-y-2 text-sm">
              {[['Điều dưỡng', 42], ['Cơ khí', 37], ['Khách sạn', 21], ['Ô tô', 18], ['IT', 12]].map(([name, n], i) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-neutral-400 w-5">#{i + 1}</span>
                  <span className="flex-1">{name}</span>
                  <div className="h-1.5 w-32 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-brand-red" style={{ width: `${Number(n) * 2}%` }} />
                  </div>
                  <span className="text-xs text-neutral-500 w-8 text-right">{n}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'verified' || status === 'resolved' ? 'bg-emerald-50 text-emerald-700' :
    status === 'pending' || status === 'open' ? 'bg-amber-50 text-amber-700' :
    'bg-rose-50 text-rose-700';
  return <span className={`chip ${cls} capitalize`}>{status}</span>;
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="card">
      <div className="h-9 w-9 rounded-xl bg-brand-red/10 text-brand-red grid place-items-center mb-2"><Icon className="h-4 w-4" /></div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-display text-lg font-extrabold">{value}</div>
    </div>
  );
}
