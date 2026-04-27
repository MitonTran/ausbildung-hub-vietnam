"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_REASONS,
  REPORT_REASON_LABEL_VI,
  type ReportFlagState,
} from "@/lib/job-orders";
import { reportJobOrderAction } from "@/lib/job-order-actions";

const initialState: ReportFlagState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Đang gửi..." : "Gửi báo cáo"}
    </Button>
  );
}

export function JobOrderReportForm({
  jobOrderId,
  isLoggedIn,
}: {
  jobOrderId: string;
  isLoggedIn: boolean;
}) {
  const [state, formAction] = useFormState(reportJobOrderAction, initialState);

  if (!isLoggedIn) {
    return (
      <p className="text-xs text-muted-foreground">
        <a href="/login" className="underline">
          Đăng nhập
        </a>{" "}
        để gửi báo cáo nếu bạn nghi ngờ đơn tuyển này có vấn đề.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="job_order_id" value={jobOrderId} />
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase text-muted-foreground">
          Lý do báo cáo
        </label>
        <Select name="reason" required defaultValue="false_information">
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {REPORT_REASON_LABEL_VI[r]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase text-muted-foreground">
          Mô tả ngắn (tối thiểu 20 ký tự)
        </label>
        <Textarea name="summary" rows={3} maxLength={5000} required />
      </div>
      {state.error ? (
        <p className="text-xs text-rose-600 dark:text-rose-300">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
