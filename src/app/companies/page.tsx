"use client";

import * as React from "react";
import { Search, ShieldCheck, Star, MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { companies } from "@/lib/mock-data";

export default function CompanyDirectoryPage() {
  const [q, setQ] = React.useState("");
  const [industry, setIndustry] = React.useState("all");
  const [state, setState] = React.useState("all");
  const [verified, setVerified] = React.useState("all");

  const industries = Array.from(new Set(companies.map((c) => c.industry)));
  const states = Array.from(new Set(companies.map((c) => c.state)));

  const filtered = companies.filter(
    (c) =>
      (q === "" || c.name.toLowerCase().includes(q.toLowerCase())) &&
      (industry === "all" || c.industry === industry) &&
      (state === "all" || c.state === state) &&
      (verified === "all" || c.verification_status === verified),
  );

  return (
    <div className="container py-8 space-y-6">
      <header className="space-y-2">
        <Badge>Company Directory</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Nhà tuyển dụng <span className="text-gradient">Đức</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Khám phá doanh nghiệp Đức đang tuyển Ausbildung — đã được xác minh bởi
          Ausbildung Hub Vietnam.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm công ty, ngành nghề..."
              className="pl-9"
            />
          </div>
          <Select value={industry} onChange={(e) => setIndustry(e.target.value)} className="md:col-span-3">
            <option value="all">Tất cả ngành nghề</option>
            {industries.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
          <Select value={state} onChange={(e) => setState(e.target.value)} className="md:col-span-2">
            <option value="all">Tất cả bang</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={verified} onChange={(e) => setVerified(e.target.value)} className="md:col-span-2">
            <option value="all">Mọi xác minh</option>
            <option value="verified">Verified</option>
            <option value="pending">Đang chờ</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Nghề / Công ty</th>
                <th className="p-3">Ngành / Bang</th>
                <th className="p-3">Đánh giá</th>
                <th className="p-3">Đơn tuyển</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/30 transition-colors hover:bg-muted/30"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg border border-border/40 bg-background/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.logo_url} alt={c.name} className="h-full w-full object-contain p-1" />
                      </div>
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {c.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{c.industry}</div>
                    <div className="text-xs text-muted-foreground">{c.state}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{c.rating_avg}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.satisfaction_rate}% hài lòng
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Briefcase className="h-3.5 w-3.5" /> {c.job_count}
                    </div>
                  </td>
                  <td className="p-3">
                    {c.verification_status === "verified" ? (
                      <Badge variant="success">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="warning">Đang chờ</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Bạn là nhà tuyển dụng Đức?</h3>
            <p className="text-sm text-muted-foreground">
              Đăng ký để xuất hiện trên trang trực tiếp với 18.000+ học viên.
            </p>
          </div>
          <Button variant="gradient">Trở thành đối tác</Button>
        </CardContent>
      </Card>
    </div>
  );
}
