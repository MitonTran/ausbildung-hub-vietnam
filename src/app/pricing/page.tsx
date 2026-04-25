import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { pricingPlans } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  return (
    <div className="container py-10 space-y-8">
      <header className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge className="mx-auto">Bảng giá dịch vụ</Badge>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Chọn gói phù hợp với <span className="text-gradient">mục tiêu</span> của bạn
        </h1>
        <p className="text-sm text-muted-foreground">
          Dùng thử 7 ngày miễn phí · Hủy bất cứ lúc nào · Hỗ trợ 24/7
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {pricingPlans.map((p) => (
          <Card
            key={p.id}
            className={cn(
              "relative flex flex-col p-6",
              p.highlight && "border-primary/60 glow-cyan",
            )}
          >
            {p.highlight && (
              <Badge variant="default" className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Sparkles className="h-3 w-3" /> Phổ biến nhất
              </Badge>
            )}
            <CardHeader className="p-0">
              <CardTitle className="text-xl">{p.name}</CardTitle>
              <CardDescription>{p.audience}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0 pt-4">
              <div className="text-3xl font-bold tracking-tight">{p.price}</div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={p.highlight ? "gradient" : "outline"}
                className="mt-6 w-full"
              >
                {p.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Tất cả các gói đều có 7 ngày dùng thử miễn phí · Đã bao gồm VAT
      </div>
    </div>
  );
}
