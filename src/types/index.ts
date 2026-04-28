export type UserRole = "student" | "center" | "employer" | "admin";

export type VerificationStatus = "verified" | "pending" | "unverified";

export type GermanLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/**
 * Public content classification — see /docs/trust-engine.md §9 and
 * `src/lib/content-types.ts`. Every public-facing card / detail page
 * that surfaces promotable content (articles, organization profile
 * highlights, job order promotions, homepage featured sections) must
 * render the matching Vietnamese label so visitors can distinguish
 * editorial from paid placements.
 */
export type ContentType =
  | "editorial"
  | "sponsored"
  | "partner_content"
  | "user_generated";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  city?: string;
  german_level?: GermanLevel;
  target_occupation?: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category:
    | "Chính sách"
    | "Thị trường"
    | "Kinh nghiệm"
    | "Học bổng"
    | "Tài trợ";
  cover_image_url: string;
  author: string;
  published_at: string;
  read_time: number;
  is_sponsored: boolean;
  /**
   * Canonical four-value content classification. Mirrors the
   * `articles.content_type` column added in migration 0010. The UI
   * prefers this over `is_sponsored` for labeling, but `is_sponsored`
   * is kept as a back-compat shortcut so older callers still work.
   */
  content_type: ContentType;
  /** Optional reference to the sponsoring organization. */
  sponsor_organization_id?: string | null;
  /** Whether the article is promoted to the homepage featured section. */
  is_featured?: boolean;
  views?: number;
  comments?: number;
  tags: string[];
}

export interface Center {
  id: string;
  owner_id?: string;
  name: string;
  slug: string;
  logo_url: string;
  city: string;
  address?: string;
  website?: string;
  phone?: string;
  description: string;
  german_levels: GermanLevel[];
  tuition_min: number;
  tuition_max: number;
  verification_status: VerificationStatus;
  rating_avg: number;
  review_count: number;
  next_intake_date?: string;
  branches?: string[];
  highlights?: string[];
  /** See ContentType. Org profile highlights default to partner_content. */
  content_type?: ContentType;
  /** Paid placement on homepage / category landing — never a trust signal. */
  is_featured?: boolean;
}

export interface CenterReview {
  id: string;
  center_id: string;
  reviewer_name: string;
  reviewer_role: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  status: "approved" | "pending" | "rejected";
}

export interface ClassIntake {
  id: string;
  center_id: string;
  level: GermanLevel;
  start_date: string;
  schedule: string;
  seats_left: number;
  tuition: number;
}

export interface Teacher {
  id: string;
  center_id: string;
  full_name: string;
  level: GermanLevel;
  years_exp: number;
  avatar_url: string;
  bio: string;
}

export interface Company {
  id: string;
  owner_id?: string;
  name: string;
  slug: string;
  logo_url: string;
  industry: string;
  city: string;
  state: string;
  country: string;
  website?: string;
  description: string;
  verification_status: VerificationStatus;
  rating_avg: number;
  job_count: number;
  satisfaction_rate: number;
  content_type?: ContentType;
  is_featured?: boolean;
}

export interface JobOrder {
  id: string;
  company_id: string;
  company_name: string;
  company_logo: string;
  title: string;
  slug: string;
  occupation: string;
  training_type: "Dual" | "Schulisch";
  city: string;
  state: string;
  german_level_required: GermanLevel;
  education_required: string;
  monthly_allowance_min: number;
  monthly_allowance_max: number;
  start_date: string;
  interview_date?: string;
  deadline: string;
  description: string;
  requirements: string[];
  benefits: string[];
  status: "open" | "closed" | "draft";
  verification_status: VerificationStatus;
  is_featured: boolean;
  /**
   * Whether the job order is a paid sponsored promotion. Mirrors
   * `job_orders.is_sponsored`. Sponsored placement is ENTIRELY
   * separate from `verification_status` — see
   * /docs/trust-engine.md §3.4.
   */
  is_sponsored?: boolean;
  /** Public content classification — see ContentType. */
  content_type?: ContentType;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_role: UserRole;
  title: string;
  content: string;
  category: "Hỏi đáp" | "Kinh nghiệm" | "Hồ sơ" | "Việc làm" | "Thông báo";
  like_count: number;
  comment_count: number;
  status: "approved" | "pending" | "rejected";
  created_at: string;
  tags?: string[];
}

export interface VerificationRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  entity_type: "center" | "company" | "job_order";
  entity_id: string;
  entity_name: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  submitted_at: string;
}

export interface ReportFlag {
  id: string;
  reporter_id: string;
  reporter_name: string;
  target_type: "post" | "review" | "job" | "user";
  target_id: string;
  target_label: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  audience: string;
  description: string;
  features: string[];
  highlight?: boolean;
  cta: string;
}
