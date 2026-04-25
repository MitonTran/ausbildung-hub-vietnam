import { useState } from 'react';
import { Heart, MessageCircle, Flag, Users, Send, PlusCircle } from 'lucide-react';
import { communityPosts as initialPosts } from '../data/mockData';
import type { CommunityPost, Role } from '../types';
import { useAuth } from '../store/auth';

const roleBadge: Record<Role, string> = {
  admin: 'bg-brand-red text-white',
  student: 'bg-emerald-50 text-emerald-700',
  center: 'bg-amber-50 text-amber-700',
  employer: 'bg-blue-50 text-blue-700',
  visitor: 'bg-neutral-100 text-neutral-700',
};

export default function CommunityFeed() {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [tag, setTag] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('');
  const { user } = useAuth();

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));
  const filtered = tag ? posts.filter(p => p.tags.includes(tag)) : posts;

  const like = (id: string) =>
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));

  const addComment = (id: string, body: string) => {
    if (!body.trim()) return;
    setPosts(posts.map(p => p.id === id ? {
      ...p, comments: [...p.comments, {
        id: 'cm' + Date.now(), postId: id, author: user?.fullName ?? 'Khách', body, createdAt: new Date().toISOString().slice(0, 10),
      }]
    } : p));
  };

  const report = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, reported: true } : p));
    alert('Bài viết đã được gửi báo cáo. Admin sẽ kiểm duyệt.');
  };

  const submitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newBody) return;
    setPosts([{
      id: 'np' + Date.now(), author: user?.fullName ?? 'Khách',
      authorRole: user?.role ?? 'visitor',
      title: newTitle, body: newBody,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString().slice(0, 10), likes: 0, comments: [],
    }, ...posts]);
    setNewTitle(''); setNewBody(''); setNewTags(''); setShowCompose(false);
  };

  return (
    <div className="section py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-brand-red tracking-widest mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> CỘNG ĐỒNG KẾT NỐI</div>
          <h1 className="font-display text-4xl font-extrabold">Chia sẻ, hỏi đáp, kết nối</h1>
        </div>
        <button onClick={() => setShowCompose(s => !s)} className="btn btn-primary"><PlusCircle className="h-4 w-4" /> Viết bài mới</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setTag(null)} className={`chip ${!tag ? 'bg-brand-red text-white' : 'bg-neutral-100 dark:bg-white/10'}`}>Tất cả</button>
        {allTags.map(t => (
          <button key={t} onClick={() => setTag(t)} className={`chip ${tag === t ? 'bg-brand-red text-white' : 'bg-neutral-100 dark:bg-white/10'}`}>{t}</button>
        ))}
      </div>

      {showCompose && (
        <form onSubmit={submitPost} className="card mb-6 space-y-3">
          <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 font-semibold" placeholder="Tiêu đề bài viết" />
          <textarea required rows={4} value={newBody} onChange={e => setNewBody(e.target.value)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Nội dung..." />
          <input value={newTags} onChange={e => setNewTags(e.target.value)} className="w-full bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Tag (phân cách dấu phẩy)" />
          <div className="flex gap-2">
            <button className="btn btn-primary" type="submit">Đăng bài</button>
            <button type="button" onClick={() => setShowCompose(false)} className="btn btn-ghost">Huỷ</button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {filtered.map(p => <PostCard key={p.id} post={p} onLike={like} onComment={addComment} onReport={report} />)}
      </div>
    </div>
  );
}

function PostCard({ post, onLike, onComment, onReport }: {
  post: CommunityPost;
  onLike: (id: string) => void;
  onComment: (id: string, body: string) => void;
  onReport: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10 grid place-items-center font-semibold">{post.author[0]}</div>
        <div className="flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">{post.author} <span className={`chip text-[10px] ${roleBadge[post.authorRole]}`}>{post.authorRole}</span></div>
          <div className="text-xs text-neutral-500">{post.createdAt}</div>
        </div>
        {post.reported && <span className="chip bg-amber-50 text-amber-700">Đã báo cáo</span>}
      </div>
      <h3 className="font-display text-xl font-extrabold mt-3">{post.title}</h3>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2">{post.body}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {post.tags.map(t => <span key={t} className="chip bg-neutral-100 dark:bg-white/10 text-xs">#{t}</span>)}
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
        <button onClick={() => onLike(post.id)} className="flex items-center gap-1 hover:text-brand-red"><Heart className="h-4 w-4" /> {post.likes}</button>
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 hover:text-brand-red"><MessageCircle className="h-4 w-4" /> {post.comments.length}</button>
        <button onClick={() => onReport(post.id)} className="ml-auto flex items-center gap-1 hover:text-rose-500"><Flag className="h-4 w-4" /> Báo cáo</button>
      </div>

      {open && (
        <div className="mt-4 border-t border-neutral-200 dark:border-white/5 pt-4 space-y-3">
          {post.comments.map(c => (
            <div key={c.id} className="text-sm">
              <div className="font-semibold">{c.author} <span className="text-xs text-neutral-500 font-normal">• {c.createdAt}</span></div>
              <div className="text-neutral-700 dark:text-neutral-300">{c.body}</div>
            </div>
          ))}
          <form onSubmit={e => { e.preventDefault(); onComment(post.id, body); setBody(''); }} className="flex gap-2">
            <input value={body} onChange={e => setBody(e.target.value)} className="flex-1 bg-neutral-100 dark:bg-white/5 rounded-xl px-3 py-2 text-sm" placeholder="Viết bình luận..." />
            <button className="btn btn-primary !py-2 !px-3"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </div>
  );
}
