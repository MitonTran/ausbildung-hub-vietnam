"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { JobCard } from "@/components/cards/job-card";
import { jobOrders } from "@/lib/mock-data";

export default function JobOrdersPage() {
  const [q, setQ] = React.useState("");
  const [occ, setOcc] = React.useState("all");
  const [level, setLevel] = React.useState("all");
  const [state, setState] = React.useState("all");
  const [verified, setVerified] = React.useState("all");

  const occupations = Array.from(new Set(jobOrders.map((j) => j.occupation)));
  const states = Array.from(new Set(jobOrders.map((j) => j.state)));

  const filtered = jobOrders.filter(
    (j) =>
      (q === "" ||
        j.title.toLowerCase().includes(q.toLowerCase()) ||
        j.company_name.toLowerCase().includes(q.toLowerCase())) &&
      (occ === "all" || j.occupation === occ) &&
      (level === "all" || j.german_level_required === level) &&
      (state === "all" || j.state === state) &&
      (verified === "all" || j.verification_status === verified),
  );

  return (
    <div className="container py-8 space-y-6">
      <header className="space-y-2">
        <Badge>Job Orders</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Đơn tuyển <span className="text-gradient">Ausbildung</span> tại Đức
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {jobOrders.length} đơn tuyển đang mở từ doanh nghiệp Đức xác minh.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm công việc, công ty..."
              className="pl-9"
            />
          </div>
          <Select value={occ} onChange={(e) => setOcc(e.target.value)} className="md:col-span-2">
            <option value="all">Tất cả nghề</option>
            {occupations.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
          <Select value={level} onChange={(e) => setLevel(e.target.value)} className="md:col-span-2">
            <option value="all">Tiếng Đức</option>
            <option>A2</option>
            <option>B1</option>
            <option>B2</option>
          </Select>
          <Select value={state} onChange={(e) => setState(e.target.value)} className="md:col-span-2">
            <option value="all">Bang Đức</option>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((j) => (
          <JobCard key={j.id} job={j} />
        ))}
      </div>
    </div>
  );
}
