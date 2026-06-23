import type {
  User, DesignerProfile, CorporateProfile,
  Design, DesignFile, DesignVersion,
  Problem, ProblemSubmission,
  Job, JobApplication,
  Comment, Message, Notification,
  Report, EditorialArticle, Payment,
  PlatformSetting, AuditLog,
} from "@prisma/client";

// ─── Extended types with relations ───────────────────────────────────────────

export type UserWithProfile = User & {
  designerProfile: DesignerProfile | null;
  corporateProfile: CorporateProfile | null;
};

export type DesignCard = Design & {
  author: User & { designerProfile: DesignerProfile | null };
  files: DesignFile[];
  _count: { likes: number; forks: number; saves: number; comments: number };
};

export type DesignDetail = DesignCard & {
  versions: DesignVersion[];
  collaborators: Array<{ user: UserWithProfile; role: string; status: string }>;
  forks: DesignCard[];
  comments: CommentWithAuthor[];
};

export type CommentWithAuthor = Comment & {
  author: User & { designerProfile: DesignerProfile | null };
  replies: CommentWithAuthor[];
};

export type ProblemCard = Problem & {
  corporate: CorporateProfile & { user: User };
  _count: { submissions: number };
};

export type ProblemDetail = ProblemCard & {
  submissions: ProblemSubmissionWithDesigner[];
};

export type ProblemSubmissionWithDesigner = ProblemSubmission & {
  designer: UserWithProfile;
};

export type JobCard = Job & {
  corporate: CorporateProfile & { user: User };
  _count: { applications: number };
};

export type MessageThread = {
  contact: UserWithProfile;
  lastMessage: Message;
  unreadCount: number;
};

export type NotificationFull = Notification;

export type EditorialArticleCard = EditorialArticle & {
  author: User;
};

// ─── API response types ───────────────────────────────────────────────────────

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

// ─── Filter/query types ───────────────────────────────────────────────────────

export type DesignFilters = {
  category?: string;
  licenseType?: string;
  q?: string;
  sort?: "trending" | "newest" | "most_forked" | "most_liked";
  page?: number;
};

export type ProblemFilters = {
  category?: string;
  status?: string;
  rewardType?: string;
  q?: string;
  sort?: "newest" | "prize_high" | "deadline_soon";
  page?: number;
};

export type JobFilters = {
  type?: string;
  location?: string;
  isRemote?: boolean;
  q?: string;
  sort?: "newest" | "salary_high";
  page?: number;
};

// ─── Session extension ────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "ADMIN" | "DESIGNER" | "CORPORATE" | "VISITOR";
      status: string;
    };
  }
}

// ─── Admin settings sections ──────────────────────────────────────────────────

export type SettingSection =
  | "email"
  | "database"
  | "storage"
  | "payments"
  | "auth"
  | "notifications"
  | "platform"
  | "admin_accounts"
  | "moderation"
  | "legal";
