"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CenterCard } from "@/components/cards/center-card";
import { centers } from "@/lib/mock-data";
import type { GermanLevel } from "@/types";

export default function CenterDirectoryPage() {
  const [q, setQ] = React.useState("");
  const [city, setCity] = React.useState("all");
  const [level, setLevel] = React.useState<"all" | GermanLevel>("all");
  const [minRating, setMinRating] = React.useState(0);

  const cities = Array.from(new Set(centers.map((c) => c.city)));
  const filtered = centers.filter(
    (c) =>
      (q === "" || c.name.toLowerCase().includes(q.toLowerCase())) &&
      (city === "all" || c.city === city) &&
      (level === "all" || c.german_levels.includes(level)) &&
      c.rating_avg >= minRating,
  );

  return (
    <div className="container py-8 space-y-6">
      <header className="space-y-2">
        <Badge>Center Directory</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Trung tâm <span className="text-gradient">tiếng Đức</span> tại Việt Nam
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          So sánh, đánh giá và liên hệ trung tâm xác minh — tìm trung tâm phù hợp
          nhất với mục tiêu Ausbildung của bạn.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm trung tâm, địa điểm..."
              className="pl-9"
            />
          </div>
          <Select value={city} onChange={(e) => setCity(e.target.value)} className="md:col-span-2">
            <option value="all">Tất cả thành phố</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
            className="md:col-span-2"
          >
            <option value="all">Trình độ</option>
            {(["A1", "A2", "B1", "B2", "C1"] as const).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Select
            value={String(minRating)}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="md:col-span-2"
          >
            <option value="0">Mọi đánh giá</option>
            <option value="4">≥ 4.0★</option>
            <option value="4.5">≥ 4.5★</option>
            <option value="4.7">≥ 4.7★</option>
          </Select>
          <Button variant="gradient" className="md:col-span-1">
            Lọc
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <CenterCard key={c.id} center={c} />
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Bạn là trung tâm tiếng Đức?</h3>
            <p className="text-sm text-muted-foreground">
              Yêu cầu sở hữu hồ sơ và xác minh trung tâm để xuất hiện trong directory.
            </p>
          </div>
          <Button variant="gradient">Yêu cầu xác minh</Button>
        </CardContent>
      </Card>
    </div>
  );
}
