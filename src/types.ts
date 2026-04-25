export type Role = 'visitor' | 'student' | 'center' | 'employer' | 'admin';

export type GermanLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type TrainingType = 'dual' | 'school';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
  plan?: 'free' | 'plus' | 'pro' | 'enterprise';
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string;
  author: string;
  publishedAt: string;
  tags: string[];
  featured?: boolean;
  sponsored?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  photo?: string;
  levels: GermanLevel[];
  yearsExp: number;
  bio?: string;
}

export interface ClassIntake {
  id: string;
  centerId: string;
  level: GermanLevel;
  schedule: string;
  startDate: string;
  seatsLeft: number;
  price: number; // VND per month
  mode: 'offline' | 'online' | 'hybrid';
}

export interface CenterReview {
  id: string;
  centerId: string;
  author: string;
  rating: number;
  comment: string;
  proofUrl?: string;
  approved: boolean;
  createdAt: string;
}

export interface Center {
  id: string;
  name: string;
  logo: string;
  cover?: string;
  city: string;
  branches: string[];
  germanLevels: GermanLevel[];
  tuition: { level: GermanLevel; monthlyVND: number }[];
  classSchedule: string;
  teachers: Teacher[];
  services: string[];
  verification: VerificationStatus;
  rating: number;
  reviewCount: number;
  featured?: boolean;
  sponsored?: boolean;
  phone: string;
  email: string;
  website?: string;
  about: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  city: string; // German city
  state: string; // German state
  sector: string;
  size: string;
  verification: VerificationStatus;
  rating: number;
  reviewCount: number;
  about: string;
  website?: string;
}

export interface JobOrder {
  id: string;
  companyId: string;
  occupation: string;
  city: string;
  state: string;
  trainingType: TrainingType;
  germanLevelRequired: GermanLevel;
  educationRequired: string;
  startDate: string;
  interviewDate: string;
  monthlyAllowanceEUR: number;
  accommodationSupport: boolean;
  deadline: string;
  verification: VerificationStatus;
  lastUpdated: string;
  featured?: boolean;
  sponsored?: boolean;
  perks: string[];
}

export interface ApplicationLead {
  id: string;
  jobOrderId: string;
  studentId: string;
  status: 'new' | 'contacted' | 'interview' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  body: string;
  createdAt: string;
  reported?: boolean;
}

export interface CommunityPost {
  id: string;
  author: string;
  authorRole: Role;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  likes: number;
  comments: Comment[];
  reported?: boolean;
}

export interface VerificationRequest {
  id: string;
  subject: 'center' | 'company' | 'review';
  subjectId: string;
  subjectName: string;
  submittedAt: string;
  status: VerificationStatus;
  note?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceVND: number;
  interval: 'month' | 'year';
  audience: 'center' | 'employer' | 'student';
  features: string[];
  highlight?: boolean;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  planId: string;
  amountVND: number;
  createdAt: string;
  status: 'succeeded' | 'failed' | 'refunded';
}

export interface ReportFlag {
  id: string;
  targetType: 'post' | 'comment' | 'review' | 'center' | 'company';
  targetId: string;
  reason: string;
  reporter: string;
  createdAt: string;
  status: 'open' | 'resolved' | 'dismissed';
}
