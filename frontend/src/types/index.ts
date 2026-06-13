export type UserRole = "customer" | "worker" | "admin";

export type BadgeLevel = "SPROUT" | "SPARK" | "BLAZE" | "PRIME" | "APEX";

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "broadcast"
  | "matched"
  | "in_progress"
  | "submitted"
  | "revision"
  | "completed"
  | "cancelled";

export type OrderDifficulty = "easy" | "medium" | "hard" | "expert";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "order_payment"
  | "order_earning"
  | "refund"
  | "commission";

export type TransactionStatus = "pending" | "completed" | "failed";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  user: User;
  bio?: string;
  badge: BadgeLevel;
  isAvailable: boolean;
  reputationScore: number;
  currentActive: number;
  maxActive: number;
  categories: Category[];
  bankAccount?: BankAccount;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer: User;
  workerId?: string;
  worker?: WorkerProfile;
  title: string;
  description: string;
  categoryId: string;
  category: Category;
  difficulty: OrderDifficulty;
  deadline: string;
  price: number;
  platformFee: number;
  workerEarning: number;
  status: OrderStatus;
  isEmergency: boolean;
  surgeMultiplier: number;
  revisionQuota: number;
  revisionUsed: number;
  aiAnalysis?: AiAnalysis;
  files?: OrderFile[];
  createdAt: string;
  updatedAt: string;
}

export interface AiAnalysis {
  estimatedPrice: number;
  estimatedHours: number;
  complexity: string;
  recommendedBadge: BadgeLevel;
  suggestions: string[];
}

export interface OrderFile {
  id: string;
  orderId: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  sender: User;
  content: string;
  type: "text" | "file";
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  isModerated: boolean;
  moderationReason?: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  orderId?: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalSpent: number;
}

export interface OrderBroadcast {
  id: string;
  orderId: string;
  order: Order;
  expiresAt: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: Record<string, unknown> | null;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
}

export interface OtpPayload {
  phone: string;
  otp: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateOrderPayload {
  title: string;
  description: string;
  categoryId: string;
  difficulty: OrderDifficulty;
  deadline: string;
  files?: File[];
}

export interface SubmitOrderPayload {
  orderId: string;
  notes: string;
  files: File[];
}

export interface WithdrawPayload {
  amount: number;
  bankAccountId: string;
  otp: string;
}
