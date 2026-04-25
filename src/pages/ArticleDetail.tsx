import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { articles } from '../data/mockData';
import { SponsoredBadge } from '../components/Badge';

export default function ArticleDetail() {
  const { slug } = useParams();
  const article = articles.find(a => a.slug === slug);
  if (!article) return <div className="section py-20 text-center">Không tìm thấy bài viết.</div>;

  return (
    <div className="section py-10 max-w-3xl">
      <Link to="/news" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-red mb-6"><ArrowLeft className="h-4 w-4" /> Quay lại tin tức</Link>

      <div className="flex items-center gap-2 mb-3">
        {article.tags.map(t => <span key={t} className="chip bg-brand-red/10 text-brand-red text-xs">{t}</span>)}
        <SponsoredBadge sponsored={article.sponsored} />
      </div>
      <h1 className="font-display text-4xl font-extrabold leading-tight">{article.title}</h1>
      <div className="mt-4 flex items-center gap-5 text-sm text-neutral-500">
        <div className="flex items-center gap-1.5"><User className="h-4 w-4" /> {article.author}</div>
        <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {article.publishedAt}</div>
      </div>
      <img src={article.cover} alt="" className="rounded-2xl w-full mt-6 object-cover max-h-96" />
      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none text-lg leading-relaxed text-neutral-800 dark:text-neutral-200">
        <p className="text-xl font-medium">{article.excerpt}</p>
        <p className="mt-6">{article.body}</p>
        <p className="mt-4">Nội dung chi tiết: Ausbildung (du học nghề Đức) là hệ thống đào tạo nghề song song giữa lớp học lý thuyết và thực hành tại doanh nghiệp. Học viên nhận trợ cấp hàng tháng từ 800 đến 1.300 EUR trong quá trình học.</p>
        <h3 className="mt-8 text-xl font-bold">Ai phù hợp với chương trình?</h3>
        <ul className="list-disc pl-5">
          <li>Người 18–35 tuổi, đã tốt nghiệp THPT hoặc tương đương</li>
          <li>Có đam mê thực hành và định hướng nghề nghiệp rõ ràng</li>
          <li>Đạt trình độ tiếng Đức B1 (yêu cầu phổ biến nhất)</li>
        </ul>
      </div>
    </div>
  );
}
