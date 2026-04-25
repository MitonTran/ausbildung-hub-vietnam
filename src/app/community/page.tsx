"use client";

import * as React from "react";
import { Search, Send, Sparkles, AlertTriangle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/cards/post-card";
import { Avatar } from "@/components/ui/avatar";
import { communityPosts, reportFlags } from "@/lib/mock-data";

const CATS = ["Tất cả", "Hỏi đáp", "Kinh nghiệm", "Hồ sơ", "Việc làm", "Thông báo"] as const;

export default function CommunityPage() {
  const [tab, setTab] = React.useState<(typeof CATS)[number]>("Tất cả");
  const [q, setQ] = React.useState("");

  const filtered = communityPosts.filter(
    (p) =>
      (tab === "Tất cả" || p.category === tab) &&
      (q === "" ||
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.content.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="container py-8 space-y-6">
      <header className="space-y-2">
        <Badge>Cộng đồng Ausbildung</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Kết nối · Chia sẻ · <span className="text-gradient">Thành công</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          18.2K thành viên đang đồng hành cùng bạn trên hành trình du học nghề Đức.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <Avatar fallback="N" />
              <div className="flex-1 space-y-2">
                <Input placeholder="Bạn muốn chia sẻ điều gì?" />
                <Textarea placeholder="Chi tiết bài viết..." className="min-h-[80px]" />
                <div className="flex items-center justify-between">
                  <select className="rounded-lg border border-border/40 bg-background/50 px-2 py-1 text-xs">
                    {CATS.filter((c) => c !== "Tất cả").map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <Button variant="gradient" size="sm">
                    Đăng bài <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm kiếm bài viết..."
                className="pl-9"
              />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                {CATS.map((c) => (
                  <TabsTrigger key={c} value={c}>
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-3">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Quy định cộng đồng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <Rule>Tôn trọng mọi thành viên</Rule>
              <Rule>Không quảng cáo trá hình</Rule>
              <Rule>Nội dung có dẫn nguồn rõ ràng</Rule>
              <Rule>Thông tin đảm bảo trung thực</Rule>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Top thành viên
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ["Nguyễn Minh Anh", "12 bài · 4.8k like"],
                ["Trần Đức Nam", "9 bài · 3.1k like"],
                ["Phạm Thị Hương", "8 bài · 2.9k like"],
              ].map(([name, meta]) => (
                <div key={name} className="flex items-center gap-2 rounded-lg border border-border/30 p-2">
                  <Avatar fallback={name.slice(0, 1)} className="h-8 w-8" />
                  <div>
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-[11px] text-muted-foreground">{meta}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Báo cáo gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {reportFlags.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/30 p-2">
                  <div>
                    <div className="font-semibold">{r.target_label}</div>
                    <div className="text-muted-foreground">{r.reason}</div>
                  </div>
                  <Badge variant="warning">Chờ xử lý</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
      <span>{children}</span>
    </div>
  );
}
