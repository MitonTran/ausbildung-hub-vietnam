"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ORG_EVIDENCE_FILES_MAX_COUNT,
  ORG_VERIFICATION_REQUESTABLE,
  ORG_VERIFICATION_REQUESTABLE_LABEL_VI,
} from "@/lib/organization";

import {
  submitOrganizationVerificationRequestAction,
  type SubmitOrgVerificationState,
} from "./actions";

const initialState: SubmitOrgVerificationState = {
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

export function OrgVerificationSubmitForm({
  organizationId,
  hasOpenRequest,
}: {
  organizationId: string;
  hasOpenRequest: boolean;
}) {
  const [state, formAction] = useFormState(
    submitOrganizationVerificationRequestAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organization_id" value={organizationId} />

      <div className="space-y-1">
        <label htmlFor="requested_status" className="block text-sm font-medium">
          Bạn muốn xin cấp huy hiệu nào?
        </label>
        <Select
          id="requested_status"
          name="requested_status"
          defaultValue="basic_verified"
          required
        >
          {ORG_VERIFICATION_REQUESTABLE.map((s) => (
            <option key={s} value={s}>
              {ORG_VERIFICATION_REQUESTABLE_LABEL_VI[s]}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Đối tác uy tín yêu cầu đã có xác minh giấy tờ cơ bản, lịch sử
          review tốt và được duyệt thủ công.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="document_summary" className="block text-sm font-medium">
          Mô tả tài liệu đính kèm
        </label>
        <Textarea
          id="document_summary"
          name="document_summary"
          rows={3}
          maxLength={4000}
          placeholder="VD: Giấy phép hoạt động, hợp đồng đối tác với trường nghề, chứng nhận đăng ký kinh doanh..."
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="fee_disclosure" className="block text-sm font-medium">
          Công khai phí / chính sách thu phí (nếu có)
        </label>
        <Textarea
          id="fee_disclosure"
          name="fee_disclosure"
          rows={3}
          maxLength={4000}
          placeholder="VD: Học phí, phí dịch vụ visa, phí môi giới việc làm... Bắt buộc minh bạch để được xét Đối tác uy tín."
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="evidence_files" className="block text-sm font-medium">
          Tài liệu (PDF, JPG, PNG — tối đa {ORG_EVIDENCE_FILES_MAX_COUNT} tệp, 5 MB / tệp)
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
          Tài liệu được lưu trong bucket riêng tư. Quản trị viên chỉ xem
          qua link tạm thời do server cấp; tài liệu không bao giờ công khai.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-border/40 bg-muted/40 p-3 text-xs">
        <p className="font-medium">Trước khi gửi, vui lòng xác nhận:</p>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="ack_rights" className="mt-0.5" />
          <span>Tôi có quyền nộp các tài liệu này thay mặt tổ chức.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="ack_authentic" className="mt-0.5" />
          <span>
            Tôi cam kết tài liệu là thật, không chỉnh sửa và phản ánh đúng tổ
            chức.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="ack_no_self_grant" className="mt-0.5" />
          <span>
            Tôi hiểu rằng tổ chức không thể tự cấp huy hiệu xác minh và việc
            thanh toán không tương đương với xác minh.
          </span>
        </label>
      </div>

      {hasOpenRequest ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Bạn đã có một yêu cầu đang được xử lý. Bạn có thể đợi kết quả hoặc
          liên hệ quản trị viên nếu cần bổ sung.
        </p>
      ) : null}

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
