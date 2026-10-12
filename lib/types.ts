import type {
  Category,
  OrderStatus,
  InstallmentStatus,
  PaymentStatus,
  DeliveryStatus,
  SettlementStatus,
  InstallmentPaymentStatus,
  EmployeeStatus,
  MerchantStatus,
  OrderType,
  UserRole,
  IdentityDocumentType,
  VerificationStatus,
  InstallmentRequestStatus,
  UserStatus,
} from "./constants";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  status?: UserStatus;
  verificationStatus?: VerificationStatus;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  employeeNumber: string;
  phone: string;
  email: string;
  companyId: string;
  jobTitle: string;
  salary: number;
  hireDate: string;
  status: EmployeeStatus;
  eligibility: "مؤهل" | "غير مؤهل" | "قيد المراجعة";
  installmentLimit: number;
  usedLimit: number;
  city: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  employeeCount: number;
  city: string;
  status: MerchantStatus;
  createdAt: string;
  /** Per-company switch for "ضمانة الشركة". Absent = platform default (enabled). */
  companyGuaranteeAllowed?: boolean;
}

/** Financing choice made at checkout. Only present on installment orders. */
export interface FinancingDetails {
  region: string;
  branchId: string;
  branchName: string;
  guaranteeCode: "account" | "gold" | "commercial" | "company";
  guaranteeName: string;
  guaranteeDetails: Record<string, string>;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorIdNumber?: string;
}

export interface Merchant {
  id: string;
  userId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  status: MerchantStatus;
  rating: number;
  salesTotal: number;
  /** 1-10 integer percent kept by the platform. Absent = default 5. */
  commissionPercent?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  merchantId: string;
  merchantName: string;
  name: string;
  description: string;
  cashPrice: number;
  deferredPrice: number;
  category: Category;
  stock: number;
  images: string[];
  installmentAvailable: boolean;
  city: string;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  specs: { label: string; value: string }[];
  featured: boolean;
  visible: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  merchantId: string;
  merchantName: string;
  quantity: number;
  cashPrice: number;
  deferredPrice: number;
  paymentType: OrderType;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  paymentType: OrderType;
  status: OrderStatus;
  city: string;
  governorate: string;
  address: string;
  phone: string;
  notes: string;
  createdAt: string;
  merchantIds: string[];
  financing?: FinancingDetails;
}

export interface InstallmentApplication {
  id: string;
  applicationNumber: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  productId: string;
  productName: string;
  merchantId: string;
  merchantName: string;
  cashPrice: number;
  deferredPrice: number;
  durationMonths: number;
  monthlyInstallment: number;
  status: InstallmentStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  financing?: FinancingDetails;
}

export interface InstallmentContract {
  id: string;
  applicationId: string;
  contractNumber: string;
  employeeId: string;
  employeeName: string;
  productName: string;
  totalAmount: number;
  monthlyInstallment: number;
  durationMonths: number;
  paidAmount: number;
  remainingAmount: number;
  paidInstallments: number;
  status: InstallmentStatus;
  startDate: string;
  firstDueDate: string;
  payments: InstallmentPaymentSchedule[];
}

export interface InstallmentPaymentSchedule {
  number: number;
  amount: number;
  dueDate: string;
  status: InstallmentPaymentStatus;
  paidAt?: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  contractId: string;
  employeeName: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  createdAt: string;
  installmentNumber?: number;
}

export interface Settlement {
  id: string;
  merchantId: string;
  merchantName: string;
  orderId: string;
  orderNumber: string;
  saleValue: number;
  merchantAmount: number;
  status: SettlementStatus;
  date: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  governorate: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  notes: string;
  status: DeliveryStatus;
  driverName?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "order" | "installment" | "payment" | "delivery" | "system";
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  details: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  merchantId: string;
  merchantName: string;
  quantity: number;
  cashPrice: number;
  deferredPrice: number;
  paymentType: OrderType;
  durationMonths?: number;
}

export interface IdentityVerification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  documentType: IdentityDocumentType;
  documentImage: string;
  documentFrontImage?: string;
  documentBackImage?: string;
  documentWithFaceImage?: string;
  selfieImage: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNotes?: string;
  consentAccepted: boolean;
}

export interface InstallmentRequest {
  id: string;
  requestNumber: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  productId: string;
  productName: string;
  productImage: string;
  merchantId: string;
  merchantName: string;
  cashPrice: number;
  deferredPrice: number;
  durationMonths: number;
  monthlyInstallment: number;
  status: InstallmentRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
  companyId?: string;
  companyApproved?: boolean | null;
  companyReviewedAt?: string;
  companyReviewedBy?: string;
  companyNotes?: string;
  financing?: FinancingDetails;
}

export type {
  Category,
  OrderStatus,
  InstallmentStatus,
  PaymentStatus,
  DeliveryStatus,
  SettlementStatus,
  InstallmentPaymentStatus,
  EmployeeStatus,
  MerchantStatus,
  OrderType,
  UserRole,
  IdentityDocumentType,
  VerificationStatus,
  InstallmentRequestStatus,
  UserStatus,
} from "./constants";
