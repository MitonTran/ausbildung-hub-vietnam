"use client";

import * as React from "react";
import { Search, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { NewsCard } from "@/components/cards/news-card";
import { articles } from "@/lib/mock-data";

const CATEGORIES = ["Tất cả", "Chính sách", "Thị trường", "Kinh nghiệm", "Học bổng", "Tài trợ"] as const;

export default function NewsHubPage() {
  const [tab, setTab] = React.useState<(typeof CATEGORIES)[number]>("Tất cả");
  const [q, setQ] = React.useState("");

  const filtered = articles.filter(
    (a) =>
      (tab === "Tất cả" || a.category === tab) &&
      (q === "" || a.title.toLowerCase().includes(q.toLowerCase())),
  );
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="container py-8 space-y-6">
      <header className="space-y-2">
        <Badge variant="default" className="w-fit">News Hub</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Tin tức & Thông tin <span className="text-gradient">thị trường</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Cập nhật xu hướng, chính sách và cơ hội mới về du học nghề tại Đức.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
            placeholder="Tìm kiếm bài viết..."
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c}>
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {featured && <NewsCard article={featured} />}
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Insight nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">Top ngành thiếu nhân lực</span>
                <span className="font-semibold">Điều dưỡng</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">Cơ hội</span>
                <span className="font-semibold text-emerald-500">+18%</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">DAJT</span>
                <span className="font-semibold">B1+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Thị trường</span>
                <span className="font-semibold">Bayern · Berlin</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thống kê thị trường</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Việc làm tuần này" value="+320" trend="+12%" />
              <Row label="Mức trợ cấp TB (Đức)" value="1.250 €" trend="+8%" />
              <Row label="Học viên đăng ký" value="+860" trend="+6%" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}</span>
        <Badge variant="success" className="text-[10px]">{trend}</Badge>
      </div>
    </div>
  );
}
