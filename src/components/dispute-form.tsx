"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitDisputeAction, type SubmitDisputeState } from "@/lib/dispute-actions";
import {
  DISPUTE_DESCRIPTION_MAX_LEN,
  DISPUTE_EVIDENCE_FILES_MAX_COUNT,
  DISPUTE_TARGET_TYPES,
  DISPUTE_TARGET_TYPE_LABEL_VI,
  DISPUTE_TYPES,
  DISPUTE_TYPE_LABEL_VI,
  type DisputeTargetType,
  type DisputeType,
} from "@/lib/disputes";

const initialState: SubmitDisputeState = {
  error: null,
  message: null,
  disputeId: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" disabled={pending}>
      {pending ? "Đang gửi..." : "Gửi khiếu nại"}
    </Button>
  );
}

export type DisputeFormProps = {
  /** Optional pre-fill from a deep link (e.g. /disputes/new?target_type=review&target_id=...). */
  defaultTargetType?: DisputeTargetType;
  defaultTargetId?: string;
  defaultReason?: DisputeType;
};

/**
 * Public dispute submission form. Used by `/disputes/new`. Server
 * action re-validates everything against the 0009 CHECK constraints.
 */
export function DisputeForm({
  defaultTargetType,
  defaultTargetId,
  defaultReason,
}: DisputeFormProps) {
  const [state, formAction] = useFormState(submitDisputeAction, initialState);

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      <div className="space-y-1">
        <label htmlFor="target_type" className="block text-sm font-medium">
          Loại đối tượng
        </label>
        <Select
          id="target_type"
          name="target_type"
          required
          defaultValue={defaultTargetType ?? ""}
        >
          <option value="" disabled>
            -- Chọn loại đối tượng --
          </option>
          {DISPUTE_TARGET_TYPES.map((t) => (
            <option key={t} value={t}>
              {DISPUTE_TARGET_TYPE_LABEL_VI[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label htmlFor="target_id" className="block text-sm font-medium">
          ID đối tượng (UUID)
        </label>
        <Input
          id="target_id"
          name="target_id"
          required
          defaultValue={defaultTargetId ?? ""}
          placeholder="VD: 123e4567-e89b-12d3-a456-426614174000"
        />
        <p className="text-[11px] text-muted-foreground">
          ID có thể tìm thấy trên trang chi tiết của đối tượng (review,
          đơn tuyển, tổ chức, v.v.).
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="reason" className="block text-sm font-medium">
          Lý do khiếu nại
        </label>
        <Select
          id="reason"
          name="reason"
          required
          defaultValue={defaultReason ?? ""}
        >
          <option value="" disabled>
            -- Chọn lý do --
          </option>
          {DISPUTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {DISPUTE_TYPE_LABEL_VI[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium">
          Mô tả chi tiết
        </label>
        <Textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={DISPUTE_DESCRIPTION_MAX_LEN}
          placeholder="Vui lòng mô tả khiếu nại của bạn càng cụ thể càng tốt."
        />
        <p className="text-[11px] text-muted-foreground">
          Tối đa {DISPUTE_DESCRIPTION_MAX_LEN.toLocaleString("vi-VN")} ký tự.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="evidence_files" className="block text-sm font-medium">
          Bằng chứng (tùy chọn)
        </label>
        <Input
          id="evidence_files"
          name="evidence_files"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        />
        <p className="text-[11px] text-muted-foreground">
          Tối đa {DISPUTE_EVIDENCE_FILES_MAX_COUNT} tệp, mỗi tệp ≤ 10 MB.
          Bằng chứng được lưu riêng tư và chỉ admin/moderator được phân
          công mới có thể truy cập.
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-emerald-600" role="status">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
