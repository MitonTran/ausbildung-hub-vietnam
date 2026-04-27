"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { submitReviewAction, type SubmitReviewState } from "@/lib/review-actions";
import {
  REVIEW_PROOF_FILES_MAX_COUNT,
  REVIEW_RELATIONSHIP_LABEL_VI,
  REVIEW_TYPE_LABEL_VI,
  type ReviewRelationship,
  type ReviewType,
} from "@/lib/reviews";

const initialState: SubmitReviewState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" disabled={pending}>
      {pending ? "Đang gửi..." : "Gửi đánh giá"}
    </Button>
  );
}

export type ReviewFormProps = {
  organizationId: string;
  eligibleReviewTypes: ReadonlyArray<ReviewType>;
  eligibleRelationships: ReadonlyArray<ReviewRelationship>;
};

/**
 * Verified-review submission form. Rendered only when the server has
 * already determined the user is eligible for at least one review_type
 * on this org. The action server-side re-checks all eligibility rules.
 */
export function ReviewForm({
  organizationId,
  eligibleReviewTypes,
  eligibleRelationships,
}: ReviewFormProps) {
  const [state, formAction] = useFormState(submitReviewAction, initialState);
  const [rating, setRating] = useState<number>(5);

  const reviewTypes = useMemo(
    () => Array.from(eligibleReviewTypes),
    [eligibleReviewTypes]
  );
  const relationships = useMemo(
    () => Array.from(eligibleRelationships),
    [eligibleRelationships]
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organization_id" value={organizationId} />

      <div className="space-y-1">
        <label htmlFor="review_type" className="block text-sm font-medium">
          Loại đánh giá
        </label>
        <Select id="review_type" name="review_type" required>
          {reviewTypes.map((rt) => (
            <option key={rt} value={rt}>
              {REVIEW_TYPE_LABEL_VI[rt]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="relationship_to_target"
          className="block text-sm font-medium"
        >
          Mối quan hệ của bạn với đơn vị này
        </label>
        <Select
          id="relationship_to_target"
          name="relationship_to_target"
          required
        >
          {relationships.map((r) => (
            <option key={r} value={r}>
              {REVIEW_RELATIONSHIP_LABEL_VI[r]}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Hệ thống sẽ kiểm tra mối quan hệ này khớp với trạng thái đã được xác
          minh của bạn trước khi đăng đánh giá.
        </p>
      </div>

      <div className="space-y-1">
        <span className="block text-sm font-medium">Số sao</span>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} sao`}
              className={
                n <= rating
                  ? "text-amber-400"
                  : "text-muted-foreground/40 hover:text-amber-300"
              }
            >
              ★
            </button>
          ))}
          <input type="hidden" name="rating" value={rating} />
          <span className="text-xs text-muted-foreground">{rating}/5</span>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium">
          Tiêu đề (không bắt buộc)
        </label>
        <Input id="title" name="title" maxLength={160} />
      </div>

      <div className="space-y-1">
        <label htmlFor="content" className="block text-sm font-medium">
          Nội dung đánh giá
        </label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          required
          minLength={30}
          maxLength={5000}
          placeholder="Mô tả trải nghiệm thực tế của bạn — chất lượng, sự minh bạch về phí, cách hỗ trợ học viên, tiến trình tuyển dụng..."
        />
        <p className="text-[11px] text-muted-foreground">
          Tối thiểu 30 ký tự. Không tiết lộ dữ liệu cá nhân của người khác.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="proof_files" className="block text-sm font-medium">
          Bằng chứng (không bắt buộc — PDF, JPG, PNG, tối đa{" "}
          {REVIEW_PROOF_FILES_MAX_COUNT} tệp / 5 MB mỗi tệp)
        </label>
        <input
          id="proof_files"
          name="proof_files"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/15 file:px-3 file:py-1 file:text-sm file:font-medium"
        />
        <p className="text-[11px] text-muted-foreground">
          Bằng chứng được lưu ở bucket riêng tư, chỉ admin xem được khi điều
          phối nội dung. Hãy che các thông tin nhạy cảm trước khi tải lên.
        </p>
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

      <div className="flex items-center gap-3">
        <SubmitButton />
        <p className="text-[11px] text-muted-foreground">
          Đánh giá sẽ chuyển sang trạng thái <strong>chờ duyệt</strong> và chỉ
          hiển thị công khai sau khi quản trị viên phê duyệt.
        </p>
      </div>
    </form>
  );
}
