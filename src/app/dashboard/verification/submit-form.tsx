"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  USER_STAGES,
  USER_STAGE_LABEL_VI,
  VERIFICATION_TYPES,
  VERIFICATION_TYPE_LABEL_VI,
  VERIFICATION_FILES_MAX_COUNT,
} from "@/lib/verification";

import {
  submitVerificationRequestAction,
  type SubmitVerificationState,
} from "./actions";

const submitVerificationInitialState: SubmitVerificationState = {
  error: null,
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" disabled={pending}>
      {pending ? "Đang gửi..." : "Gửi yêu cầu xác minh"}
    </Button>
  );
}

export function VerificationSubmitForm({
  defaultStage,
}: {
  defaultStage: string;
}) {
  const [state, formAction] = useFormState(
    submitVerificationRequestAction,
    submitVerificationInitialState
  );

  const stageDefault = USER_STAGES.includes(
    defaultStage as (typeof USER_STAGES)[number]
  )
    ? defaultStage
    : "exploring";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="requested_stage"
          className="block text-sm font-medium"
        >
          Bạn muốn xác minh giai đoạn nào?
        </label>
        <Select
          id="requested_stage"
          name="requested_stage"
          defaultValue={stageDefault}
          required
        >
          {USER_STAGES.map((s) => (
            <option key={s} value={s}>
              {USER_STAGE_LABEL_VI[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="verification_type"
          className="block text-sm font-medium"
        >
          Loại bằng chứng
        </label>
        <Select
          id="verification_type"
          name="verification_type"
          defaultValue="other"
          required
        >
          {VERIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {VERIFICATION_TYPE_LABEL_VI[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="block text-sm font-medium">
          Ghi chú thêm (không bắt buộc)
        </label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="VD: Tôi đã học tại trung tâm X từ tháng 3/2024..."
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="evidence_files"
          className="block text-sm font-medium"
        >
          Bằng chứng (PDF, JPG, PNG — tối đa {VERIFICATION_FILES_MAX_COUNT} tệp, 5 MB / tệp)
        </label>
        <input
          id="evidence_files"
          name="evidence_files"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          required
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Bằng chứng được lưu trong bucket riêng tư. Quản trị viên chỉ xem qua
          link tạm thời do server cấp; bằng chứng không bao giờ công khai.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-border/40 bg-muted/40 p-3 text-xs">
        <p className="font-medium">Trước khi gửi, vui lòng xác nhận:</p>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="ack_rights" className="mt-0.5" />
          <span>Tôi có quyền upload tài liệu này.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="ack_redacted" className="mt-0.5" />
          <span>
            Tôi đã che các thông tin nhạy cảm không cần thiết (số CMND/CCCD, số
            tài khoản, địa chỉ đầy đủ...).
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="ack_authentic" className="mt-0.5" />
          <span>Tôi cam kết tài liệu là thật và không chỉnh sửa nội dung.</span>
        </label>
      </div>

      {state.error ? (
        <p className="text-sm text-red-500" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-emerald-500" role="status">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
