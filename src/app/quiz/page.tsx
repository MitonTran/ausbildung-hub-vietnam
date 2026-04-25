import { Badge } from "@/components/ui/badge";
import { EligibilityQuiz } from "@/components/eligibility-quiz";

export default function QuizPage() {
  return (
    <div className="container py-10 max-w-3xl">
      <header className="mb-6 space-y-2">
        <Badge>AI Eligibility Quiz</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Bạn đã sẵn sàng cho <span className="text-gradient">Ausbildung tại Đức</span>?
        </h1>
        <p className="text-sm text-muted-foreground">
          Trả lời 6 câu hỏi nhanh để nhận điểm sẵn sàng, đề xuất lộ trình và việc làm phù hợp.
        </p>
      </header>
      <EligibilityQuiz />
    </div>
  );
}
