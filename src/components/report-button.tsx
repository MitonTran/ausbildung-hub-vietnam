"use client";

import * as React from "react";
import { Flag, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  REPORT_DESCRIPTION_MAX_LEN,
  REPORT_EVIDENCE_MAX_COUNT,
  REPORT_REASONS,
  REPORT_REASON_LABEL_VI,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/reports";
import {
  submitReportAction,
  type ReportSubmissionError,
} from "@/app/(reports)/actions";

const ERROR_LABEL_VI: Record<ReportSubmissionError, string> = {
  not_authenticated: "Bạn cần đăng nhập để gửi báo cáo.",
  invalid_target_type: "Loại đối tượng không hợp lệ.",
  invalid_target_id: "Đối tượng được báo cáo không tồn tại.",
  invalid_reason: "Vui lòng chọn lý do hợp lệ.",
  description_too_long: `Mô tả vượt quá ${REPORT_DESCRIPTION_MAX_LEN} ký tự.`,
  too_many_evidence_urls: `Tối đa ${REPORT_EVIDENCE_MAX_COUNT} đường dẫn bằng chứng.`,
  evidence_url_too_long: "Đường dẫn bằng chứng quá dài.",
  rate_limited:
    "Bạn đã gửi báo cáo cho đối tượng này với cùng lý do trong 24 giờ qua.",
  internal_error: "Có lỗi xảy ra. Vui lòng thử lại sau.",
};

export type ReportButtonProps = {
  targetType: ReportTargetType;
  targetId: string;
  /** Optional human label rendered in the dialog so the reporter knows what they're reporting. */
  targetLabel?: string;
  /** Whether the current user is signed in. Anonymous users see a sign-in prompt instead of the form. */
  isAuthenticated: boolean;
  className?: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "secondary";
};

export function ReportButton({
  targetType,
  targetId,
  targetLabel,
  isAuthenticated,
  className,
  size = "sm",
  variant = "ghost",
}: ReportButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<ReportReason | "">("");
  const [description, setDescription] = React.useState("");
  const [evidenceUrls, setEvidenceUrls] = React.useState<string[]>([""]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  function reset() {
    setReason("");
    setDescription("");
    setEvidenceUrls([""]);
    setError(null);
    setSuccess(false);
    setSubmitting(false);
  }

  function close() {
    setOpen(false);
    // Defer reset so the closing animation doesn't flash the empty form.
    setTimeout(reset, 200);
  }

  function updateEvidence(index: number, value: string) {
    setEvidenceUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addEvidence() {
    setEvidenceUrls((prev) =>
      prev.length >= REPORT_EVIDENCE_MAX_COUNT ? prev : [...prev, ""]
    );
  }

  function removeEvidence(index: number) {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason) {
      setError("Vui lòng chọn lý do.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("target_type", targetType);
    fd.set("target_id", targetId);
    fd.set("reason", reason);
    fd.set("description", description);
    for (const url of evidenceUrls) {
      const trimmed = url.trim();
      if (trimmed.length > 0) {
        fd.append("evidence_url", trimmed);
      }
    }

    try {
      const result = await submitReportAction(fd);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(ERROR_LABEL_VI[result.error] ?? "Có lỗi xảy ra.");
      }
    } catch (err) {
      console.error("[ReportButton] submit failed", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("text-muted-foreground hover:text-destructive", className)}
        onClick={() => setOpen(true)}
        aria-label="Báo cáo nội dung"
      >
        <Flag className="h-4 w-4" />
        Báo cáo
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
        >
          <div className="glass relative w-full max-w-lg rounded-2xl border border-border/40 p-6 shadow-xl">
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 space-y-1">
              <h2
                id="report-dialog-title"
                className="text-lg font-semibold tracking-tight"
              >
                Báo cáo nội dung
              </h2>
              <p className="text-sm text-muted-foreground">
                {targetLabel
                  ? `Bạn đang báo cáo: ${targetLabel}`
                  : "Báo cáo này được gửi tới đội ngũ kiểm duyệt. Danh tính người báo cáo được giữ kín."}
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-4 text-sm">
                <p>
                  Vui lòng đăng nhập để gửi báo cáo. Tính năng báo cáo không
                  cho phép gửi ẩn danh nhằm hạn chế spam.
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={close}>
                    Đóng
                  </Button>
                  <Button asChild variant="gradient">
                    <a href="/login">Đăng nhập</a>
                  </Button>
                </div>
              </div>
            ) : success ? (
              <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                  Cảm ơn bạn. Báo cáo đã được gửi.
                </p>
                <p className="text-muted-foreground">
                  Đội ngũ kiểm duyệt sẽ xem xét và xử lý theo quy trình. Danh
                  tính người báo cáo được giữ kín, không hiển thị công khai.
                </p>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={close}>
                    Đóng
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label
                    htmlFor="report-reason"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Lý do báo cáo
                  </label>
                  <Select
                    id="report-reason"
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value as ReportReason | "")
                    }
                    required
                  >
                    <option value="">— Chọn lý do —</option>
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REPORT_REASON_LABEL_VI[r]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="report-description"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Mô tả chi tiết (tùy chọn)
                  </label>
                  <Textarea
                    id="report-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={REPORT_DESCRIPTION_MAX_LEN}
                    placeholder="Cung cấp thêm thông tin giúp kiểm duyệt xử lý nhanh hơn."
                  />
                  <div className="text-right text-[11px] text-muted-foreground">
                    {description.length}/{REPORT_DESCRIPTION_MAX_LEN}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      Bằng chứng (đường dẫn — tùy chọn)
                    </label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                      onClick={addEvidence}
                      disabled={evidenceUrls.length >= REPORT_EVIDENCE_MAX_COUNT}
                    >
                      + Thêm
                    </button>
                  </div>
                  <div className="space-y-2">
                    {evidenceUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          type="url"
                          value={url}
                          onChange={(e) => updateEvidence(idx, e.target.value)}
                          placeholder="https://..."
                        />
                        {evidenceUrls.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeEvidence(idx)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            aria-label="Xoá"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={close}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={submitting || !reason}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Gửi báo cáo
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
