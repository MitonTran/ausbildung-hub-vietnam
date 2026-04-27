import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Eye, MessageCircle, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryColor } from "@/lib/badge-colors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewsCard } from "@/components/cards/news-card";
import { ReportTarget } from "@/components/report-target";
import { articles, findArticle } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = findArticle(params.slug);
  if (!article) notFound();

  const related = articles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/news">
            <ArrowLeft className="h-4 w-4" /> Quay lại News Hub
          </Link>
        </Button>
        <ReportTarget
          targetType="article"
          targetId={article.id}
          targetLabel={article.title}
          variant="ghost"
        />
      </div>

      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <Badge
            variant="default"
            className={
              article.is_sponsored ? categoryColor("Tài trợ") : categoryColor(article.category)
            }
          >
            {article.is_sponsored ? "Tài trợ" : article.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>{article.author}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatDate(article.published_at)} · {article.read_time} phút đọc
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {article.views ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" /> {article.comments ?? 0}
            </span>
            <Button variant="outline" size="sm" className="ml-auto">
              <Share2 className="h-3.5 w-3.5" /> Chia sẻ
            </Button>
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-border/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.cover_image_url} alt={article.title} className="h-full w-full object-cover" />
        </div>

        <Card>
          <CardContent className="prose prose-invert max-w-none p-6 text-sm leading-relaxed">
            <p className="lead text-base">{article.excerpt}</p>
            <p>
              Đây là nội dung mẫu được hiển thị cho mục đích MVP — ở phiên bản
              production, nội dung sẽ được tải từ Supabase và render qua{" "}
              <code>articles.content</code>. Ban biên tập của Ausbildung Hub
              Vietnam sẽ thường xuyên cập nhật các bài viết về chính sách,
              hướng dẫn visa, đánh giá trung tâm và phân tích thị trường lao
              động Đức.
            </p>
            <p>
              <strong>Tóm tắt nội dung:</strong> {article.excerpt}
            </p>
            <ul>
              <li>Phân tích thị trường lao động Đức 2026</li>
              <li>Yêu cầu tiếng Đức cho từng ngành nghề</li>
              <li>Quy trình visa và những lưu ý quan trọng</li>
              <li>Lương khởi điểm và cơ hội phát triển</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {article.tags.map((t) => (
            <Badge key={t} variant="tag">
              #{t}
            </Badge>
          ))}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12 max-w-4xl mx-auto">
          <h2 className="mb-4 text-lg font-bold">Bài viết liên quan</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
