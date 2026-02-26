// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Auth Service Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
}

// ============================================================================
// Employee Service Types
// ============================================================================

export type EmployeeRole = 'CEO' | 'Accountant' | 'Teacher' | 'Support' | 'Admin' | 'Manager';
export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave';
export type PaymentSchedule = 'Monthly' | 'Weekly' | 'Bi-weekly';

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: EmployeeRole;
  phone: string;
  salary: number;
  paymentSchedule: PaymentSchedule;
  status: EmployeeStatus;
  telegramChatId?: string;
  isOnline?: boolean;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  salary: number;
  paymentSchedule: PaymentSchedule;
  status: EmployeeStatus;
  telegramChatId?: string;
}

export interface ListEmployeesParams extends PaginationParams {
  status?: EmployeeStatus;
  role?: string;
}

// ============================================================================
// Student Service Types
// ============================================================================

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'suspended';
export type AcademicStatus = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';

export interface Parent {
  id?: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface Student {
  id: string;
  name: string;
  surname: string;
  grade: number;
  className: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  idPassport: string;
  enrollmentDate: string;
  balance: number;
  totalOwed: number;
  totalPaid?: number; // Total amount paid by student
  attendance?: number; // Attendance percentage
  gpa?: number; // Grade point average
  documents?: string[]; // Document URLs
  notes?: string; // Additional notes
  avatar?: string;
  status: StudentStatus;
  academicStatus: AcademicStatus;
  parents: Parent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  name: string;
  surname: string;
  grade: number;
  className: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  idPassport: string;
  enrollmentDate: string;
  balance: number;
  totalOwed: number;
  avatar?: string;
  parents: Parent[];
}

export interface UpdateStudentRequest {
  status?: StudentStatus;
  academicStatus?: AcademicStatus;
  [key: string]: unknown;
}

export interface ListStudentsParams extends PaginationParams {
  search?: string;
  hasDebt?: boolean;
  grade?: number;
  status?: StudentStatus;
  academicStatus?: AcademicStatus;
}

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalOwed: number;
  avgAttendance: number;
  debtCases: number;
}

// ============================================================================
// Finance Service Types
// ============================================================================

export type TransactionStatus = 'Pending' | 'Paid' | 'Failed' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer';
export type PaymentSource = 'Payme' | 'Click' | 'Uzum' | 'Uzum Bank' | 'Cash' | 'Bank' | 'Company Transfer' | 'Manual';

export interface Transaction {
  id: string;
  student_id: string;
  studentName?: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_source: PaymentSource;
  purpose: string;
  date: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_source: PaymentSource;
  purpose: string;
  date: string;
  status?: TransactionStatus;
  notes?: string;
}

export interface UpdateTransactionStatusRequest {
  status: TransactionStatus;
}

export interface ListTransactionsParams extends PaginationParams {
  status?: TransactionStatus;
  search?: string;
  student_id?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  totalTransactions?: number;
  paymeCount?: number;
  uzumCount?: number;
  clickCount?: number;
  pendingAmount?: number;
  completedAmount?: number;
}

export type ExpenseCategory = 'Office' | 'Utilities' | 'Salaries' | 'Marketing' | 'Equipment' | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  payee: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  payee: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  attachments?: string[];
}

export interface ListExpensesParams extends PaginationParams {
  category?: ExpenseCategory;
}

export interface ExpenseStats {
  totalExpenses: number;
  monthlyExpenses: number;
  expensesByCategory: Record<string, number>;
  countMonth?: number;
  topCategory?: string;
  topCategorySum?: number;
}

// ============================================================================
// Events Service Types
// ============================================================================

export type EventType = 'Meeting' | 'Sports' | 'Academic' | 'Social' | 'Administrative' | 'Training' | 'Celebration' | 'Announcement' | 'Conference' | 'Workshop' | 'Seminar' | 'Other';
export type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
export type LocationType = 'Online' | 'Offline' | 'Hybrid';
export type EventCategory = 'Academic' | 'Administrative' | 'Social' | 'Other';

export interface EventNotification {
  id: string;
  sentAt: string;
  sentBy: string;
  recipients: string;
  type: string;
  message: string;
}

export interface Event {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  endTime: string;
  location: string;
  locationType: LocationType;
  description: string;
  audience: string;
  attendees: number;
  organizer: string;
  status: EventStatus;
  category: EventCategory;
  color: string;
  reminderSet: boolean;
  attachments?: string[];
  assignedTo?: string[];
  notifications?: EventNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  type: EventType;
  date: string;
  time: string;
  endTime: string;
  location: string;
  locationType: LocationType;
  description: string;
  audience: string;
  attendees: number;
  organizer: string;
  status: EventStatus;
  category: EventCategory;
  color: string;
  reminderSet: boolean;
  attachments?: string[];
  assignedTo?: string[];
  notifications?: EventNotification[];
}

export interface UpdateEventRequest {
  title?: string;
  date?: string;
  status?: EventStatus;
  [key: string]: unknown;
}

export interface ListEventsParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
  type?: EventType;
  status?: EventStatus;
}

// ============================================================================
// Activity Logs Types
// ============================================================================

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  timestamp: string;
}

export interface ListActivityLogsParams extends PaginationParams {
  search?: string;
}

export interface ActivityStats {
  actionsToday: number;
}

// ============================================================================
// Chat Service Types
// ============================================================================

export type ConversationType = 'internal' | 'support';

export interface Conversation {
  id: string;
  type?: ConversationType; // Optional, may not be in API response
  name?: string; // Optional, may not be in API response
  participants?: string[]; // Optional, may not be in API response
  partnerId?: string; // From API: partner_id
  lastMessage?: string; // From API: last_message
  lastMessageAt?: string; // From API: last_message_at
  unreadCount?: number; // From API: unread_count
  status?: string; // From API: status
  createdAt?: string; // Optional, may not be in API response
  updatedAt?: string; // Optional, may not be in API response
}

export interface CreateConversationRequest {
  type: ConversationType;
  name: string;
  participants: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ListConversationsParams {
  type?: ConversationType;
}

export interface ListMessagesParams extends PaginationParams {
  conversationId: string;
}

// WebSocket message types
export interface WSChatMessage {
  type: 'message' | 'typing' | 'read' | 'join' | 'leave';
  conversationId?: string;
  conversation_id?: string; // Added for snake_case support
  message?: string;
  userId?: string;
  timestamp?: string;
  id?: string; // Added for message identification
  sender_id?: string; // Added for sender identification
  senderName?: string; // Added for sender name
  sender_name?: string; // Added for sender name (snake_case)
  content?: string; // Added for message content (snake_case)
  token?: string; // Added for authentication token
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadResponse {
  url: string;
  fileName: string;
}

// ============================================================================
// Notification Service Types
// ============================================================================

export type NotificationType = 'Alert' | 'Info' | 'Warning' | 'Success';
export type NotificationStatus = 'Pending' | 'Processed' | 'Failed';
export type NotificationMethod = 'telegram' | 'in-app' | 'email' | 'sms';
export type TargetAudience = 'All' | 'Parents' | 'Students' | 'Staff' | 'Teachers' | string;

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target_audience: TargetAudience;
  methods: NotificationMethod[];
  attachments?: string[];
  send_at?: string;
  status: NotificationStatus;
  sentBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: NotificationType;
  target_audience: TargetAudience;
  methods: NotificationMethod[];
  attachments?: string[];
  send_at?: string;
}

export interface ListNotificationsParams extends PaginationParams {
  search?: string;
  type?: NotificationType;
  status?: NotificationStatus;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  scheduled?: number;
  [key: string]: unknown;
}

export interface NotificationLog {
  id: string;
  userId: string;
  userName: string;
  status: 'sent' | 'failed' | 'pending';
  method: NotificationMethod;
  timestamp: string;
}

export interface MarkAsReadRequest {
  notification_id?: string; // If empty, marks all as read
}

export interface UnreadCountResponse {
  count: number;
}

