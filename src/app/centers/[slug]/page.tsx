import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Star,
  MapPin,
  Phone,
  Globe,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CenterCard } from "@/components/cards/center-card";
import {
  centers,
  findCenter,
  centerReviews,
  classIntakes,
  teachers,
} from "@/lib/mock-data";
import { formatDate, formatVnd } from "@/lib/utils";

export function generateStaticParams() {
  return centers.map((c) => ({ slug: c.slug }));
}

export default function CenterDetailPage({ params }: { params: { slug: string } }) {
  const center = findCenter(params.slug);
  if (!center) notFound();

  const reviews = centerReviews.filter((r) => r.center_id === center.id);
  const intakes = classIntakes.filter((i) => i.center_id === center.id);
  const ts = teachers.filter((t) => t.center_id === center.id);
  const similar = centers.filter((c) => c.id !== center.id && c.city === center.city).slice(0, 3);

  return (
    <div className="container py-8 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/centers">
          <ArrowLeft className="h-4 w-4" /> Tất cả trung tâm
        </Link>
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={center.logo_url} alt={center.name} className="h-full w-full object-contain p-2" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{center.name}</h1>
              {center.verification_status === "verified" && (
                <Badge variant="verified">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {center.city}
                {center.address ? ` · ${center.address}` : ""}
              </span>
              {center.website && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> {center.website}
                </span>
              )}
              {center.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {center.phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold">{center.rating_avg}</span>
                <span className="text-xs text-muted-foreground">/5</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({center.review_count} đánh giá)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {center.german_levels.map((l) => (
                <Badge key={l} variant="level">
                  {l}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="gradient">Liên hệ ngay</Button>
            <Button variant="outline">Lưu</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>{center.description}</p>
              {center.highlights && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {center.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                    >
                      <GraduationCap className="h-4 w-4 text-primary" /> {h}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Khóa học sắp khai giảng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {intakes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có lịch khai giảng. Liên hệ trung tâm để cập nhật.
                </p>
              ) : (
                intakes.map((i) => (
                  <div
                    key={i.id}
                    className="grid gap-3 rounded-xl border border-border/40 p-4 sm:grid-cols-4"
                  >
                    <div>
                      <Badge>{i.level}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">Trình độ</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{formatDate(i.start_date)}</div>
                      <div className="text-xs text-muted-foreground">Khai giảng</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{i.schedule}</div>
                      <div className="text-xs text-muted-foreground">Lịch học</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{formatVnd(i.tuition)}</div>
                      <div className="text-xs text-muted-foreground">
                        Còn {i.seats_left} suất
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đội ngũ giáo viên</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {ts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Đang cập nhật.</p>
              ) : (
                ts.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border/40 p-3">
                    <Avatar src={t.avatar_url} fallback={t.full_name.slice(0, 1)} className="h-12 w-12" />
                    <div>
                      <div className="text-sm font-semibold">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.level} · {t.years_exp} năm kinh nghiệm
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{t.bio}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Đánh giá học viên</CardTitle>
                <Badge variant="outline">{reviews.length} đã duyệt</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => Math.round(r.rating) === star).length;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-6">{star}★</span>
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="w-8 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
              <div className="space-y-3 pt-3">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/40 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold">{r.reviewer_name}</span>{" "}
                        <span className="text-xs text-muted-foreground">· {r.reviewer_role}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < r.rating
                                ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                : "h-3.5 w-3.5 text-muted-foreground/40"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{r.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" /> Liên hệ tư vấn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Họ và tên" />
              <Input placeholder="Số điện thoại" />
              <Input placeholder="Email" type="email" />
              <Textarea placeholder="Bạn quan tâm khóa học nào?" />
              <Button variant="gradient" className="w-full">
                Gửi yêu cầu
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Bằng việc gửi yêu cầu, bạn đồng ý với điều khoản và chính sách
                bảo mật.
              </p>
            </CardContent>
          </Card>

          {similar.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Trung tâm tương tự</h3>
              <div className="space-y-3">
                {similar.map((c) => (
                  <CenterCard key={c.id} center={c} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
