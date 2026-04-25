"use client";

import * as React from "react";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Answers = {
  age: string;
  german: string;
  education: string;
  budget: string;
  occupation: string;
  timeline: string;
};

const initial: Answers = {
  age: "",
  german: "",
  education: "",
  budget: "",
  occupation: "",
  timeline: "",
};

const fields: {
  key: keyof Answers;
  label: string;
  options: string[];
}[] = [
  { key: "age", label: "Tuổi", options: ["18-22", "23-26", "27-30", "31-35"] },
  {
    key: "german",
    label: "Trình độ tiếng Đức",
    options: ["Chưa học", "A1", "A2", "B1", "B2", "C1+"],
  },
  {
    key: "education",
    label: "Bằng cấp cao nhất",
    options: ["THCS", "THPT", "Trung cấp / Cao đẳng", "Đại học trở lên"],
  },
  {
    key: "budget",
    label: "Ngân sách dự kiến (VND)",
    options: ["< 100 triệu", "100-200 triệu", "200-300 triệu", "> 300 triệu"],
  },
  {
    key: "occupation",
    label: "Ngành quan tâm",
    options: ["Điều dưỡng", "Cơ điện tử", "Nhà hàng-Khách sạn", "IT", "Bán lẻ", "Khác"],
  },
  {
    key: "timeline",
    label: "Thời gian muốn đi Đức",
    options: ["< 6 tháng", "6-12 tháng", "12-18 tháng", "> 18 tháng"],
  },
];

function score(a: Answers): number {
  let s = 40;
  if (a.german === "B1") s += 18;
  else if (a.german === "B2") s += 22;
  else if (a.german === "C1+") s += 25;
  else if (a.german === "A2") s += 8;
  else if (a.german === "A1") s += 4;
  if (a.education === "THPT") s += 10;
  else if (a.education === "Trung cấp / Cao đẳng") s += 15;
  else if (a.education === "Đại học trở lên") s += 18;
  if (a.age === "18-22") s += 10;
  else if (a.age === "23-26") s += 8;
  else if (a.age === "27-30") s += 4;
  if (a.budget === "100-200 triệu") s += 6;
  else if (a.budget === "200-300 triệu") s += 8;
  else if (a.budget === "> 300 triệu") s += 10;
  if (a.occupation && a.occupation !== "Khác") s += 4;
  if (a.timeline === "6-12 tháng" || a.timeline === "12-18 tháng") s += 5;
  return Math.min(100, s);
}

function band(s: number) {
  if (s >= 80) return { label: "Sẵn sàng", color: "text-emerald-500", description: "Bạn có nền tảng rất tốt — hãy bắt đầu nộp hồ sơ ngay!" };
  if (s >= 60) return { label: "Khá tốt", color: "text-cyan-500", description: "Sẵn sàng cao, cần hoàn thiện 1-2 yếu tố trước khi nộp." };
  if (s >= 40) return { label: "Cần cải thiện", color: "text-amber-500", description: "Cần học thêm tiếng Đức / chuẩn bị tài chính." };
  return { label: "Mới bắt đầu", color: "text-rose-500", description: "Bạn nên có một lộ trình 12-18 tháng để chuẩn bị." };
}

export function EligibilityQuiz({ compact = false }: { compact?: boolean }) {
  const [answers, setAnswers] = React.useState<Answers>(initial);
  const [submitted, setSubmitted] = React.useState(false);

  const ready = Object.values(answers).every(Boolean);
  const result = score(answers);
  const b = band(result);

  return (
    <Card className={cn("relative overflow-hidden", compact && "border-primary/40")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Quiz đánh giá điều kiện du học nghề
            </CardTitle>
            <CardDescription>
              Kiểm tra khả năng của bạn trong 2 phút — kết quả mang tính tham khảo.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!submitted ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {f.label}
                  </label>
                  <Select
                    value={answers[f.key]}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [f.key]: e.target.value }))
                    }
                  >
                    <option value="">— Chọn —</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <Button
              variant="gradient"
              className="w-full"
              disabled={!ready}
              onClick={() => setSubmitted(true)}
            >
              Tính điểm sẵn sàng
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Điểm sẵn sàng
              </div>
              <div className="text-5xl font-black text-gradient mt-1">{result}/100</div>
              <div className={cn("mt-1 text-sm font-semibold", b.color)}>{b.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>
            </div>
            <Progress value={result} />
            <div className="space-y-2 rounded-xl border border-border/40 bg-background/40 p-3 text-xs">
              <div className="font-semibold">Đề xuất cho bạn</div>
              <ul className="space-y-1.5 text-muted-foreground">
                {result < 60 && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                    Đăng ký lớp tiếng Đức B1 cấp tốc 6-8 tháng tại trung tâm xác minh.
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                  Tham gia 5 đơn tuyển{" "}
                  {answers.occupation || "ngành phù hợp"} đang mở.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                  Hoàn thiện hồ sơ visa Ausbildung trong 4-6 tuần.
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSubmitted(false);
                setAnswers(initial);
              }}
            >
              Làm lại quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
