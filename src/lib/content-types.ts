/**
 * Content type taxonomy for articles, organization profile
 * highlights, job order promotions, and homepage featured sections.
 *
 * Mirrors the four-value enum defined in /docs/trust-engine.md §9 and
 * the matching CHECK constraints introduced in migration
 * 0010_sponsored_editorial_content.sql for the `articles`,
 * `organizations`, and `job_orders` tables.
 *
 * The Vietnamese labels are the user-visible strings that the public
 * UI must render so visitors can clearly distinguish editorial,
 * sponsored, partner, and user-generated content. They are the
 * canonical wording from the task spec — do not alter without also
 * updating the trust-engine doc.
 */

export const CONTENT_TYPES = [
  "editorial",
  "sponsored",
  "partner_content",
  "user_generated",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABEL_VI: Record<ContentType, string> = {
  editorial: "Nội dung biên tập",
  sponsored: "Nội dung tài trợ",
  partner_content: "Nội dung từ đối tác",
  user_generated: "Nội dung từ người dùng",
};

export const CONTENT_TYPE_DESCRIPTION_VI: Record<ContentType, string> = {
  editorial:
    "Nội dung do ban biên tập Ausbildung Hub Vietnam tự sản xuất.",
  sponsored:
    "Bài viết / vị trí được tài trợ. Việc trả phí không đồng nghĩa với việc đã được xác minh.",
  partner_content:
    "Nội dung do đối tác cung cấp và đã được kiểm duyệt theo quy trình.",
  user_generated:
    "Nội dung do người dùng cộng đồng đóng góp.",
};

export function isContentType(value: unknown): value is ContentType {
  return (
    typeof value === "string" &&
    (CONTENT_TYPES as ReadonlyArray<string>).includes(value)
  );
}

/**
 * Whether a given content_type counts as paid placement. The public
 * UI uses this to decide whether to render the `Nội dung tài trợ`
 * label, which must NEVER be shown next to a verified / trusted
 * partner trust badge as if the two were related — paid placement
 * does not grant verification (per /docs/trust-engine.md §3.4).
 */
export function isSponsoredContent(
  contentType: ContentType | string | null | undefined,
): boolean {
  return contentType === "sponsored";
}

/**
 * Tailwind class palette for the ContentTypeBadge. Kept distinct
 * from the `verified` Badge variant on purpose — sponsored content
 * uses the warm amber palette, editorial uses cool cyan, partner
 * uses violet, user-generated uses neutral slate. This makes the
 * sponsored / verified distinction visually obvious at a glance.
 */
export const CONTENT_TYPE_BADGE_CLASS: Record<ContentType, string> = {
  editorial:
    "bg-cyan-400/20 text-cyan-700 border border-cyan-400/55 dark:text-cyan-200 dark:border-cyan-400/50",
  sponsored:
    "bg-amber-400/25 text-amber-800 border border-amber-500/55 dark:text-amber-200 dark:border-amber-400/50",
  partner_content:
    "bg-violet-400/20 text-violet-700 border border-violet-400/55 dark:text-violet-200 dark:border-violet-400/50",
  user_generated:
    "bg-slate-400/20 text-slate-700 border border-slate-400/55 dark:text-slate-200 dark:border-slate-400/50",
};
