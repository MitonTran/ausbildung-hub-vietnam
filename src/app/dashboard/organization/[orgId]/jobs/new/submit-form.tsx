"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABEL_VI,
  GERMAN_LEVELS,
  OCCUPATIONS_VI,
  TRAINING_TYPES,
  TRAINING_TYPE_LABEL_VI,
  type EducationLevel,
  type GermanLevel,
  type JobOrderFormState,
  type TrainingType,
} from "@/lib/job-orders";
import { submitJobOrderAction } from "@/lib/job-order-actions";

const initialState: JobOrderFormState = {
  error: null,
  message: null,
  jobOrderId: null,
  slug: null,
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" disabled={pending}>
      {pending ? "Đang lưu..." : label}
    </Button>
  );
}

export function NewJobOrderForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [state, formAction] = useFormState(submitJobOrderAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="organization_id" value={organizationId} />

      <Field name="title" label="Tiêu đề đơn tuyển" required maxLength={160} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="occupation" className="block text-sm font-medium">
            Ngành nghề
          </label>
          <Select id="occupation" name="occupation" required>
            {OCCUPATIONS_VI.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="training_type" className="block text-sm font-medium">
            Loại đào tạo
          </label>
          <Select
            id="training_type"
            name="training_type"
            required
            defaultValue={"dual" satisfies TrainingType}
          >
            {TRAINING_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRAINING_TYPE_LABEL_VI[t]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="germany_city"
          label="Thành phố tại Đức"
          required
          maxLength={120}
        />
        <Field
          name="germany_state"
          label="Bang"
          required
          maxLength={120}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="german_level_required"
            className="block text-sm font-medium"
          >
            Trình độ tiếng Đức yêu cầu
          </label>
          <Select
            id="german_level_required"
            name="german_level_required"
            required
            defaultValue={"B1" satisfies GermanLevel}
          >
            {GERMAN_LEVELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="education_required"
            className="block text-sm font-medium"
          >
            Trình độ học vấn tối thiểu
          </label>
          <Select
            id="education_required"
            name="education_required"
            required
            defaultValue={"thpt" satisfies EducationLevel}
          >
            {EDUCATION_LEVELS.map((e) => (
              <option key={e} value={e}>
                {EDUCATION_LEVEL_LABEL_VI[e]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="start_date"
          label="Ngày khai giảng"
          required
          type="date"
        />
        <Field
          name="interview_date"
          label="Ngày phỏng vấn dự kiến"
          required
          type="date"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="application_deadline"
          label="Hạn nộp hồ sơ"
          required
          type="date"
        />
        <Field
          name="expiry_date"
          label="Ngày hết hạn đơn tuyển"
          required
          type="date"
        />
      </div>

      <Field
        name="monthly_training_allowance"
        label="Trợ cấp đào tạo hàng tháng (EUR)"
        required
        type="number"
        min={0}
        step={1}
      />

      <div className="space-y-1">
        <label
          htmlFor="accommodation_support"
          className="block text-sm font-medium"
        >
          Hỗ trợ chỗ ở
        </label>
        <Textarea
          id="accommodation_support"
          name="accommodation_support"
          rows={3}
          maxLength={1000}
          required
          placeholder="VD: Có ký túc của trường nghề, 200 EUR/tháng. Doanh nghiệp hỗ trợ tìm chỗ ở 3 tháng đầu."
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="fee_disclosure"
          className="block text-sm font-medium"
        >
          Công khai phí dịch vụ
        </label>
        <Textarea
          id="fee_disclosure"
          name="fee_disclosure"
          rows={4}
          maxLength={2000}
          required
          placeholder="Liệt kê đầy đủ mọi khoản phí thu của ứng viên: phí đào tạo tiếng, phí hồ sơ, phí dịch thuật, ký quỹ... Đơn không có phần này sẽ không được duyệt."
        />
        <p className="text-[11px] text-muted-foreground">
          Theo Trust Engine, mọi đơn tuyển bắt buộc phải khai báo minh bạch phí
          dịch vụ trước khi được duyệt công khai.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="submit_for_review"
          name="submit_for_review"
          type="checkbox"
          className="h-4 w-4"
          defaultChecked
        />
        <label htmlFor="submit_for_review" className="text-sm">
          Gửi đi để quản trị viên duyệt ngay (bỏ chọn để lưu bản nháp)
        </label>
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-500/10 p-2 text-sm text-rose-600 dark:text-rose-300">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-emerald-500/10 p-2 text-sm text-emerald-700 dark:text-emerald-300">
          {state.message}
        </p>
      ) : null}

      <SubmitButton label="Lưu đơn tuyển" />
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  maxLength,
  min,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        min={min}
        step={step}
      />
    </div>
  );
}
