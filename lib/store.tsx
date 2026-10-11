"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import type {
  User,
  Employee,
  Company,
  Merchant,
  Product,
  Order,
  InstallmentApplication,
  InstallmentContract,
  Payment,
  Settlement,
  Delivery,
  Notification,
  AuditLog,
  CartItem,
  IdentityVerification,
  InstallmentRequest,
} from "./types";
import {
  seedUsers,
  seedEmployees,
  seedCompanies,
  seedMerchants,
  seedProducts,
  seedOrders,
  seedInstallmentApplications,
  seedInstallmentContracts,
  seedPayments,
  seedSettlements,
  seedDeliveries,
  seedNotifications,
  seedAuditLogs,
} from "./seed-data";
import type { UserRole, VerificationStatus } from "./constants";

interface AppState {
  // Auth
  currentUser: User | null;
  // Data
  users: User[];
  employees: Employee[];
  companies: Company[];
  merchants: Merchant[];
  products: Product[];
  orders: Order[];
  installmentApplications: InstallmentApplication[];
  installmentContracts: InstallmentContract[];
  installmentRequests: InstallmentRequest[];
  payments: Payment[];
  settlements: Settlement[];
  deliveries: Delivery[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  identityVerifications: IdentityVerification[];
  // Cart
  cart: CartItem[];
}

interface AppContextType extends AppState {
  // Auth
  login: (email: string, role?: UserRole) => boolean;
  setCurrentUser: (user: User | null) => void;
  /** Makes sure the signed-in account has the matching merchant / company / employee record so its dashboard works. */
  ensureEntityForUser: (u: { id: string; name: string; email: string; phone: string; role: string }) => void;
  logout: () => void;
  register: (data: Partial<User> & { role: UserRole }) => void;
  // Cart
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartPaymentType: (productId: string, paymentType: "نقدي" | "تقسيط", durationMonths?: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  // Orders
  createOrder: (order: Omit<Order, "id" | "orderNumber" | "createdAt">) => Order;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  // Installments
  createInstallmentApplication: (app: Omit<InstallmentApplication, "id" | "applicationNumber" | "createdAt" | "status">) => InstallmentApplication;
  reviewInstallmentApplication: (id: string, approved: boolean, rejectionReason?: string) => void;
  // Payments
  recordPayment: (contractId: string, amount: number, method: string, installmentNumber?: number) => void;
  // Products
  addProduct: (product: Omit<Product, "id" | "createdAt" | "rating" | "reviewsCount" | "soldCount">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Notifications
  addNotification: (notif: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  // Employees (company management)
  addEmployee: (emp: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  // Audit
  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
  // Deliveries
  updateDeliveryStatus: (id: string, status: Delivery["status"]) => void;
  // Settlements
  updateSettlementStatus: (id: string, status: Settlement["status"]) => void;
  // Identity Verification
  submitIdentityVerification: (data: Omit<IdentityVerification, "id" | "submittedAt" | "status">) => void;
  reviewIdentityVerification: (id: string, status: VerificationStatus, notes?: string) => void;
  // Installment Requests
  createInstallmentRequest: (req: Omit<InstallmentRequest, "id" | "requestNumber" | "createdAt" | "status">) => InstallmentRequest;
  reviewInstallmentRequest: (id: string, approved: boolean, rejectionReason?: string) => void;
  companyApproveFinancing: (id: string, notes?: string) => void;
  companyRejectFinancing: (id: string, notes?: string) => void;
  // Identity Access Audit
  logIdentityAccess: (verificationId: string, userName: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

let orderCounter = 5008;
let appCounter = 10026;
let paymentCounter = 30005;
let contractCounter = 20004;
let productCounter = 31;
let notifCounter = 100;
let auditCounter = 100;
let employeeCounter = 9;
let verificationCounter = 4;
let installmentReqCounter = 1005;

function tailNum(id: unknown): number {
  const m = /(\d+)$/.exec(String(id ?? ""));
  const n = m ? Number(m[1]) : 0;
  return n < 10_000_000 ? n : 0; // ignore timestamp-style ids
}
const maxTail = (list: { id?: unknown }[]) => list.reduce((a, x) => Math.max(a, tailNum(x.id)), 0);
const maxNumber = (list: Record<string, any>[], key: string) => list.reduce((a, x) => Math.max(a, tailNum(x[key])), 0);

/** After loading saved demo data, make sure new ids never collide with saved ones. */
function resyncCounters(st: AppState) {
  orderCounter = Math.max(orderCounter, maxNumber(st.orders, "orderNumber") + 1);
  appCounter = Math.max(appCounter, maxNumber(st.installmentApplications, "applicationNumber") + 1);
  paymentCounter = Math.max(paymentCounter, maxNumber(st.payments, "paymentNumber") + 1);
  contractCounter = Math.max(contractCounter, maxNumber(st.installmentContracts, "contractNumber") + 1);
  productCounter = Math.max(productCounter, maxTail(st.products) + 1);
  notifCounter = Math.max(notifCounter, maxTail(st.notifications) + 1);
  auditCounter = Math.max(auditCounter, maxTail(st.auditLogs) + 1);
  employeeCounter = Math.max(employeeCounter, maxTail(st.employees) + 1);
  verificationCounter = Math.max(verificationCounter, maxTail(st.identityVerifications) + 1);
  installmentReqCounter = Math.max(installmentReqCounter, maxNumber(st.installmentRequests, "requestNumber") + 1);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: seedUsers,
    employees: seedEmployees,
    companies: seedCompanies,
    merchants: seedMerchants,
    products: seedProducts,
    orders: seedOrders,
    installmentApplications: seedInstallmentApplications,
    installmentContracts: seedInstallmentContracts,
    payments: seedPayments,
    settlements: seedSettlements,
    deliveries: seedDeliveries,
    notifications: seedNotifications,
    auditLogs: seedAuditLogs,
    identityVerifications: [
      { id: "v-1", userId: "u-employee", userName: "أحمد محمد الصالح", userEmail: "employee@demo.com", userRole: "employee", documentType: "بطاقة شخصية", documentImage: "", selfieImage: "", status: "تم التحقق", submittedAt: daysAgo(85), reviewedAt: daysAgo(83), reviewedBy: "مدير المنصة", reviewerNotes: "تم التحقق بنجاح", consentAccepted: true },
      { id: "v-2", userId: "", userName: "سالم عبدالله باعباد", userEmail: "salem@demo.com", userRole: "employee", documentType: "جواز سفر", documentImage: "", selfieImage: "", status: "تم التحقق", submittedAt: daysAgo(60), reviewedAt: daysAgo(58), reviewedBy: "مدير المنصة", reviewerNotes: "جواز سفر ساري", consentAccepted: true },
      { id: "v-3", userId: "", userName: "فاطمة العنسي", userEmail: "fatima@demo.com", userRole: "employee", documentType: "بطاقة شخصية", documentImage: "", selfieImage: "", status: "بانتظار المراجعة", submittedAt: daysAgo(2), consentAccepted: true },
    ],
    installmentRequests: [
      { id: "ir-1", requestNumber: "REQ-1001", userId: "u-employee", userName: "أحمد محمد الصالح", userRole: "employee", productId: "p-1", productName: "هاتف سامسونج جالاكسي S24", productImage: "", merchantId: "m-1", merchantName: "متجر التقنية", cashPrice: 180000, deferredPrice: 219600, durationMonths: 12, monthlyInstallment: 18300, status: "قيد المراجعة", createdAt: daysAgo(5), companyId: "c-1", companyApproved: null, notes: "طلب تقسيط لهاتف" },
      { id: "ir-2", requestNumber: "REQ-1002", userId: "u-customer", userName: "سارة أحمد العمري", userRole: "customer", productId: "p-5", productName: "ثلاجة LG 18 قدم", productImage: "", merchantId: "m-2", merchantName: "متجر الأجهزة", cashPrice: 220000, deferredPrice: 268400, durationMonths: 18, monthlyInstallment: 14911, status: "بانتظار التحقق من الهوية", createdAt: daysAgo(3), notes: "بانتظار التحقق من الهوية" },
      { id: "ir-3", requestNumber: "REQ-1003", userId: "u-employee", userName: "أحمد محمد الصالح", userRole: "employee", productId: "p-8", productName: "غسالة ملابس أوتوماتيك", productImage: "", merchantId: "m-2", merchantName: "متجر الأجهزة", cashPrice: 150000, deferredPrice: 183000, durationMonths: 12, monthlyInstallment: 15250, status: "موافق", createdAt: daysAgo(20), reviewedAt: daysAgo(15), reviewedBy: "مدير المنصة", companyId: "c-1", companyApproved: true, companyReviewedAt: daysAgo(17), companyReviewedBy: "شركة الأمل للمقاولات", companyNotes: "موافقة" },
      { id: "ir-4", requestNumber: "REQ-1004", userId: "u-customer", userName: "سارة أحمد العمري", userRole: "customer", productId: "p-12", productName: "تكييف هواء شباك 1 طن", productImage: "", merchantId: "m-3", merchantName: "متجر الكهرباء", cashPrice: 95000, deferredPrice: 115900, durationMonths: 6, monthlyInstallment: 19317, status: "مرفوض", createdAt: daysAgo(30), reviewedAt: daysAgo(25), reviewedBy: "مدير المنصة", rejectionReason: "تجاوز الحد الشرائي المتاح", notes: "مرفوض بسبب تجاوز الحد" },
    ],
    cart: [],
  });

  const [hydrated, setHydrated] = useState(false);

  // Persist current user, cart and (demo mode) the whole demo data set to localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("soq-user");
      const savedCart = localStorage.getItem("soq-cart");
      const savedData = isSupabaseConfigured ? null : localStorage.getItem("qistuha-demo-data");
      setState(prev => {
        let next = prev;
        if (savedData) {
          const d = JSON.parse(savedData);
          next = { ...prev, ...d, currentUser: prev.currentUser, cart: prev.cart };
          resyncCounters(next);
        }
        if (savedUser) next = { ...next, currentUser: JSON.parse(savedUser) };
        if (savedCart) next = { ...next, cart: JSON.parse(savedCart) };
        return next;
      });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || isSupabaseConfigured) return;
    try {
      const { currentUser, cart, ...data } = state;
      localStorage.setItem("qistuha-demo-data", JSON.stringify(data));
    } catch {}
  }, [state, hydrated]);

  useEffect(() => {
    try {
      if (state.currentUser) {
        localStorage.setItem("soq-user", JSON.stringify(state.currentUser));
      } else if (hydrated) {
        localStorage.removeItem("soq-user");
      }
    } catch {}
  }, [state.currentUser, hydrated]);

  useEffect(() => {
    try {
      if (hydrated) localStorage.setItem("soq-cart", JSON.stringify(state.cart));
    } catch {}
  }, [state.cart, hydrated]);

  const addAuditLog = useCallback((log: Omit<AuditLog, "id" | "timestamp">) => {
    setState(prev => ({
      ...prev,
      auditLogs: [
        { ...log, id: `log-${auditCounter++}`, timestamp: new Date().toISOString() },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "createdAt" | "read">) => {
    setState(prev => ({
      ...prev,
      notifications: [
        { ...notif, id: `n-${notifCounter++}`, createdAt: new Date().toISOString(), read: false },
        ...prev.notifications,
      ],
    }));
  }, []);

  const login = useCallback((email: string): boolean => {
    const user = state.users.find(u => u.email === email);
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  }, [state.users]);

  const setCurrentUser = useCallback((user: User | null) => {
    setState(prev => ({ ...prev, currentUser: user }));
  }, []);

  const ensureEntityForUser = useCallback((u: { id: string; name: string; email: string; phone: string; role: string }) => {
    setState(prev => {
      const now = new Date().toISOString();
      let next = prev;
      if (!prev.users.some(x => x.id === u.id)) {
        next = { ...next, users: [...next.users, { id: u.id, email: u.email, name: u.name, role: u.role as UserRole, phone: u.phone, createdAt: now }] };
      }
      if (u.role === "merchant" && !prev.merchants.some(m => m.userId === u.id)) {
        next = { ...next, merchants: [...next.merchants, { id: `m-${u.id}`, userId: u.id, storeName: `متجر ${u.name}`, ownerName: u.name, phone: u.phone, email: u.email, city: "", address: "", status: "قيد المراجعة", rating: 0, salesTotal: 0, createdAt: now }] };
      }
      if (u.role === "company" && !prev.companies.some(c => c.userId === u.id)) {
        next = { ...next, companies: [...next.companies, { id: `c-${u.id}`, userId: u.id, name: `شركة ${u.name}`, contactName: u.name, phone: u.phone, email: u.email, employeeCount: 0, city: "", status: "قيد المراجعة", createdAt: now }] };
      }
      if (u.role === "employee" && !prev.employees.some(e => e.userId === u.id)) {
        const company = prev.companies.find(c => c.status === "نشط") ?? prev.companies[0];
        next = { ...next, employees: [...next.employees, { id: `e-${employeeCounter++}`, userId: u.id, name: u.name, employeeNumber: `EMP-${employeeCounter}`, phone: u.phone, email: u.email, companyId: company?.id ?? "", jobTitle: "", salary: 0, hireDate: now, status: "نشط", eligibility: "قيد المراجعة", installmentLimit: 0, usedLimit: 0, city: "" }] };
      }
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setState(prev => ({ ...prev, currentUser: null }));
  }, []);

  const register = useCallback((data: Partial<User> & { role: UserRole }) => {
    const needsVerification = data.role === "customer" || data.role === "employee";
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: data.email || "",
      name: data.name || "",
      role: data.role,
      phone: data.phone || "",
      createdAt: new Date().toISOString(),
      verificationStatus: needsVerification ? "بانتظار المراجعة" : undefined,
    };
    setState(prev => ({ ...prev, users: [...prev.users, newUser], currentUser: newUser }));
  }, []);

  // Cart operations
  const addToCart = useCallback((item: CartItem) => {
    setState(prev => {
      const existing = prev.cart.find(c => c.productId === item.productId);
      if (existing) {
        return {
          ...prev,
          cart: prev.cart.map(c =>
            c.productId === item.productId
              ? { ...c, quantity: c.quantity + item.quantity }
              : c
          ),
        };
      }
      return { ...prev, cart: [...prev.cart, item] };
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setState(prev => ({ ...prev, cart: prev.cart.filter(c => c.productId !== productId) }));
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(c => c.productId === productId ? { ...c, quantity } : c),
    }));
  }, []);

  const updateCartPaymentType = useCallback((productId: string, paymentType: "نقدي" | "تقسيط", durationMonths?: number) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(c =>
        c.productId === productId ? { ...c, paymentType, durationMonths } : c
      ),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState(prev => ({ ...prev, cart: [] }));
  }, []);

  const cartTotal = state.cart.reduce((sum, item) => {
    const price = item.paymentType === "تقسيط" ? item.deferredPrice : item.cashPrice;
    return sum + price * item.quantity;
  }, 0);

  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Order operations
  const createOrder = useCallback((order: Omit<Order, "id" | "orderNumber" | "createdAt">): Order => {
    const newOrder: Order = {
      ...order,
      id: `o-${Date.now()}`,
      orderNumber: `ORD-${orderCounter++}`,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, orders: [newOrder, ...prev.orders] }));
    return newOrder;
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: Order["status"]) => {
    setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      const updatedOrders = prev.orders.map(o => o.id === orderId ? { ...o, status } : o);
      let notifications = prev.notifications;
      let contracts = prev.installmentContracts;
      let deliveries = prev.deliveries;

      if (order) {
        const newNotifs: Notification[] = [];
        if (order.customerId) {
          const emp = prev.employees.find(e => e.id === order.customerId);
          const userId = emp?.userId;
          if (userId) {
            newNotifs.push({
              id: `n-${notifCounter++}`,
              userId,
              title: `تحديث حالة الطلب ${order.orderNumber}`,
              message: `تم تحديث حالة طلبك إلى: ${status}`,
              type: "order",
              read: false,
              createdAt: new Date().toISOString(),
              link: "/employee/orders",
            });
          }
        }
        // If delivered and installment, activate contract
        if (status === "تم التسليم") {
          const app = prev.installmentApplications.find(a =>
            a.productId === order.items[0]?.productId && a.employeeId === order.customerId && a.status === "مقبول"
          );
          if (app) {
            contracts = contracts.map(c =>
              c.applicationId === app.id ? { ...c, status: "نشط" } : c
            );
          }
          // Update delivery
          deliveries = deliveries.map(d =>
            d.orderId === orderId ? { ...d, status: "تم التسليم" } : d
          );
        }
        notifications = [...newNotifs, ...notifications];
      }

      return { ...prev, orders: updatedOrders, notifications, installmentContracts: contracts, deliveries };
    });
  }, []);

  // Installment operations
  const createInstallmentApplication = useCallback((app: Omit<InstallmentApplication, "id" | "applicationNumber" | "createdAt" | "status">): InstallmentApplication => {
    const newApp: InstallmentApplication = {
      ...app,
      id: `ia-${Date.now()}`,
      applicationNumber: `INS-${appCounter++}`,
      createdAt: new Date().toISOString(),
      status: "جديد",
    };
    setState(prev => ({ ...prev, installmentApplications: [newApp, ...prev.installmentApplications] }));
    return newApp;
  }, []);

  const reviewInstallmentApplication = useCallback((id: string, approved: boolean, rejectionReason?: string) => {
    setState(prev => {
      const app = prev.installmentApplications.find(a => a.id === id);
      if (!app) return prev;

      const updatedApps = prev.installmentApplications.map(a =>
        a.id === id ? {
          ...a,
          status: approved ? "مقبول" as const : "مرفوض" as const,
          reviewedAt: new Date().toISOString(),
          reviewedBy: prev.currentUser?.name || "",
          rejectionReason: rejectionReason,
        } : a
      );

      let contracts = prev.installmentContracts;
      let notifications = prev.notifications;

      if (approved) {
        // Create contract
        const monthly = app.deferredPrice / app.durationMonths;
        const payments = [];
        for (let i = 1; i <= app.durationMonths; i++) {
          payments.push({
            number: i,
            amount: Math.round(monthly),
            dueDate: new Date(Date.now() + 30 * i * 86400000).toISOString(),
            status: "قادم" as const,
          });
        }
        const newContract: InstallmentContract = {
          id: `ic-${Date.now()}`,
          applicationId: app.id,
          contractNumber: `CON-${contractCounter++}`,
          employeeId: app.employeeId,
          employeeName: app.employeeName,
          productName: app.productName,
          totalAmount: app.deferredPrice,
          monthlyInstallment: Math.round(monthly),
          durationMonths: app.durationMonths,
          paidAmount: 0,
          remainingAmount: app.deferredPrice,
          paidInstallments: 0,
          status: "نشط",
          startDate: new Date().toISOString(),
          firstDueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          payments,
        };
        contracts = [newContract, ...contracts];

        // Notify employee
        const emp = prev.employees.find(e => e.id === app.employeeId);
        if (emp?.userId) {
          notifications = [
            {
              id: `n-${notifCounter++}`,
              userId: emp.userId,
              title: "تم قبول طلب التقسيط",
              message: `تم قبول طلب التقسيط الخاص بك لـ ${app.productName}`,
              type: "installment",
              read: false,
              createdAt: new Date().toISOString(),
              link: "/employee/installments",
            },
            ...notifications,
          ];
        }

        // Update employee used limit
        const updatedEmployees = prev.employees.map(e =>
          e.id === app.employeeId ? { ...e, usedLimit: e.usedLimit + app.deferredPrice } : e
        );
        return { ...prev, installmentApplications: updatedApps, installmentContracts: contracts, notifications, employees: updatedEmployees };
      } else {
        // Notify employee of rejection
        const emp = prev.employees.find(e => e.id === app.employeeId);
        if (emp?.userId) {
          notifications = [
            {
              id: `n-${notifCounter++}`,
              userId: emp.userId,
              title: "تم رفض طلب التقسيط",
              message: `تم رفض طلب التقسيط الخاص بك لـ ${app.productName}${rejectionReason ? ` - السبب: ${rejectionReason}` : ""}`,
              type: "installment",
              read: false,
              createdAt: new Date().toISOString(),
              link: "/employee/installments",
            },
            ...notifications,
          ];
        }
        return { ...prev, installmentApplications: updatedApps, notifications };
      }
    });
  }, []);

  // Payment operations
  const recordPayment = useCallback((contractId: string, amount: number, method: string, installmentNumber?: number) => {
    setState(prev => {
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        paymentNumber: `PAY-${paymentCounter++}`,
        contractId,
        employeeName: prev.installmentContracts.find(c => c.id === contractId)?.employeeName || "",
        amount,
        status: "ناجح",
        method,
        createdAt: new Date().toISOString(),
        installmentNumber,
      };

      const contracts = prev.installmentContracts.map(c => {
        if (c.id !== contractId) return c;
        const updatedPayments = c.payments.map(p => {
          if (installmentNumber && p.number === installmentNumber) {
            return { ...p, status: "مدفوع" as const, paidAt: new Date().toISOString() };
          }
          if (!installmentNumber) {
            const nextUnpaid = c.payments.find(p => p.status !== "مدفوع");
            if (nextUnpaid && p.number === nextUnpaid.number) {
              return { ...p, status: "مدفوع" as const, paidAt: new Date().toISOString() };
            }
          }
          return p;
        });
        const newPaidCount = updatedPayments.filter(p => p.status === "مدفوع").length;
        const newPaidAmount = newPaidCount * c.monthlyInstallment;
        const newRemaining = c.totalAmount - newPaidAmount;
        return {
          ...c,
          payments: updatedPayments,
          paidInstallments: newPaidCount,
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? "مكتمل" as const : "نشط" as const,
        };
      });

      const contract = contracts.find(c => c.id === contractId);
      let notifications = prev.notifications;
      if (contract) {
        const emp = prev.employees.find(e => e.id === contract.employeeId);
        if (emp?.userId) {
          notifications = [
            {
              id: `n-${notifCounter++}`,
              userId: emp.userId,
              title: "تم تسجيل دفعة",
              message: `تم تسجيل دفعة بقيمة ${amount.toLocaleString("ar-YE")} ريال لـ ${contract.productName}`,
              type: "payment",
              read: false,
              createdAt: new Date().toISOString(),
              link: "/employee/installments",
            },
            ...notifications,
          ];
        }
      }

      return { ...prev, payments: [newPayment, ...prev.payments], installmentContracts: contracts, notifications };
    });
  }, []);

  // Product operations
  const addProduct = useCallback((product: Omit<Product, "id" | "createdAt" | "rating" | "reviewsCount" | "soldCount">) => {
    setState(prev => ({
      ...prev,
      products: [
        {
          ...product,
          id: `p-${productCounter++}`,
          rating: 4.0,
          reviewsCount: 0,
          soldCount: 0,
          createdAt: new Date().toISOString(),
        },
        ...prev.products,
      ],
    }));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
  }, []);

  // Notifications
  const markNotificationRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  // Employee operations
  const addEmployee = useCallback((emp: Omit<Employee, "id">) => {
    setState(prev => ({ ...prev, employees: [...prev.employees, { ...emp, id: `e-${employeeCounter++}` }] }));
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setState(prev => ({
      ...prev,
      employees: prev.employees.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  }, []);

  // Delivery operations
  const updateDeliveryStatus = useCallback((id: string, status: Delivery["status"]) => {
    setState(prev => ({
      ...prev,
      deliveries: prev.deliveries.map(d => d.id === id ? { ...d, status } : d),
    }));
  }, []);

  // Settlement operations
  const updateSettlementStatus = useCallback((id: string, status: Settlement["status"]) => {
    setState(prev => ({
      ...prev,
      settlements: prev.settlements.map(s => s.id === id ? { ...s, status } : s),
    }));
  }, []);

  // Identity Verification
  const submitIdentityVerification = useCallback((data: Omit<IdentityVerification, "id" | "submittedAt" | "status">) => {
    const newVerification: IdentityVerification = {
      ...data,
      id: `v-${verificationCounter++}`,
      submittedAt: new Date().toISOString(),
      status: "بانتظار المراجعة",
    };
    setState(prev => ({
      ...prev,
      identityVerifications: [newVerification, ...prev.identityVerifications],
      users: prev.users.map(u =>
        u.id === data.userId ? { ...u, verificationStatus: "بانتظار المراجعة" } : u
      ),
      currentUser: prev.currentUser?.id === data.userId
        ? { ...prev.currentUser, verificationStatus: "بانتظار المراجعة" }
        : prev.currentUser,
    }));
  }, []);

  const reviewIdentityVerification = useCallback((id: string, status: VerificationStatus, notes?: string) => {
    setState(prev => {
      const verif = prev.identityVerifications.find(v => v.id === id);
      if (!verif) return prev;

      const updatedVerifications = prev.identityVerifications.map(v =>
        v.id === id ? {
          ...v,
          status,
          reviewedAt: new Date().toISOString(),
          reviewedBy: prev.currentUser?.name || "",
          reviewerNotes: notes,
        } : v
      );

      const updatedUsers = prev.users.map(u =>
        u.id === verif.userId ? { ...u, verificationStatus: status } : u
      );

      const auditLog: AuditLog = {
        id: `log-${auditCounter++}`,
        actor: prev.currentUser?.name || "",
        actorRole: prev.currentUser?.role || "admin",
        action: `مراجعة التحقق من الهوية: ${status}`,
        entity: "IdentityVerification",
        entityId: id,
        timestamp: new Date().toISOString(),
        details: `مراجعة طلب تحقق الهوية لـ ${verif.userName} - النتيجة: ${status}${notes ? ` - ملاحظات: ${notes}` : ""}`,
      };

      let notifications = prev.notifications;
      if (verif.userId) {
        notifications = [
          {
            id: `n-${notifCounter++}`,
            userId: verif.userId,
            title: "تحديث حالة التحقق من الهوية",
            message: `حالة التحقق من هويتك: ${status}${notes ? ` - ${notes}` : ""}`,
            type: "system",
            read: false,
            createdAt: new Date().toISOString(),
            link: "/profile",
          },
          ...notifications,
        ];
      }

      return {
        ...prev,
        identityVerifications: updatedVerifications,
        users: updatedUsers,
        auditLogs: [auditLog, ...prev.auditLogs],
        notifications,
        currentUser: prev.currentUser?.id === verif.userId
          ? { ...prev.currentUser, verificationStatus: status }
          : prev.currentUser,
      };
    });
  }, []);

  // Installment Requests
  const createInstallmentRequest = useCallback((req: Omit<InstallmentRequest, "id" | "requestNumber" | "createdAt" | "status">): InstallmentRequest => {
    const newReq: InstallmentRequest = {
      ...req,
      id: `ir-${Date.now()}`,
      requestNumber: `REQ-${installmentReqCounter++}`,
      createdAt: new Date().toISOString(),
      status: "طلب جديد",
    };
    setState(prev => ({
      ...prev,
      installmentRequests: [newReq, ...prev.installmentRequests],
      notifications: [
        {
          id: `n-${notifCounter++}`,
          userId: "u-admin",
          title: "طلب تقسيط جديد",
          message: `طلب تقسيط جديد رقم ${newReq.requestNumber} من ${newReq.userName} لـ ${newReq.productName}`,
          type: "installment",
          read: false,
          createdAt: new Date().toISOString(),
          link: "/admin/installments",
        },
        ...prev.notifications,
      ],
    }));
    return newReq;
  }, []);

  const reviewInstallmentRequest = useCallback((id: string, approved: boolean, rejectionReason?: string) => {
    setState(prev => {
      const req = prev.installmentRequests.find(r => r.id === id);
      if (!req) return prev;

      const updatedRequests = prev.installmentRequests.map(r =>
        r.id === id ? {
          ...r,
          status: approved ? "موافق" as const : "مرفوض" as const,
          reviewedAt: new Date().toISOString(),
          reviewedBy: prev.currentUser?.name || "",
          rejectionReason,
        } : r
      );

      let notifications = prev.notifications;
      if (req.userId) {
        notifications = [
          {
            id: `n-${notifCounter++}`,
            userId: req.userId,
            title: approved ? "تمت الموافقة على طلب التقسيط" : "تم رفض طلب التقسيط",
            message: approved
              ? `تمت الموافقة على طلب التقسيط الخاص بك لـ ${req.productName}`
              : `تم رفض طلب التقسيط الخاص بك لـ ${req.productName}${rejectionReason ? ` - السبب: ${rejectionReason}` : ""}`,
            type: "installment",
            read: false,
            createdAt: new Date().toISOString(),
            link: "/employee/orders",
          },
          ...notifications,
        ];
      }

      const auditLog: AuditLog = {
        id: `log-${auditCounter++}`,
        actor: prev.currentUser?.name || "",
        actorRole: prev.currentUser?.role || "admin",
        action: approved ? "الموافقة على طلب تقسيط" : "رفض طلب تقسيط",
        entity: "InstallmentRequest",
        entityId: id,
        timestamp: new Date().toISOString(),
        details: `${approved ? "الموافقة" : "الرفض"} على طلب التقسيط ${req.requestNumber} لـ ${req.userName} - ${req.productName}${rejectionReason ? ` - السبب: ${rejectionReason}` : ""}`,
      };

      return {
        ...prev,
        installmentRequests: updatedRequests,
        notifications,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  }, []);

  const companyApproveFinancing = useCallback((id: string, notes?: string) => {
    setState(prev => {
      const req = prev.installmentRequests.find(r => r.id === id);
      if (!req) return prev;

      const updatedRequests = prev.installmentRequests.map(r =>
        r.id === id ? {
          ...r,
          companyApproved: true,
          companyReviewedAt: new Date().toISOString(),
          companyReviewedBy: prev.currentUser?.name || "",
          companyNotes: notes,
          status: r.status === "بانتظار التحقق من الهوية" ? "بانتظار التحقق من الهوية" as const : "قيد المراجعة" as const,
        } : r
      );

      const auditLog: AuditLog = {
        id: `log-${auditCounter++}`,
        actor: prev.currentUser?.name || "",
        actorRole: prev.currentUser?.role || "company",
        action: "موافقة الشركة على تمويل الموظف",
        entity: "InstallmentRequest",
        entityId: id,
        timestamp: new Date().toISOString(),
        details: `موافقة الشركة على طلب التقسيط ${req.requestNumber} لـ ${req.userName} - ${req.productName}${notes ? ` - ملاحظات: ${notes}` : ""}`,
      };

      let notifications = prev.notifications;
      if (req.userId) {
        notifications = [
          {
            id: `n-${notifCounter++}`,
            userId: req.userId,
            title: "موافقة الشركة على طلب التقسيط",
            message: `وافقت شركتك على طلب التقسيط الخاص بك لـ ${req.productName}`,
            type: "installment",
            read: false,
            createdAt: new Date().toISOString(),
            link: "/employee/orders",
          },
          ...notifications,
        ];
      }

      notifications = [
        {
          id: `n-${notifCounter++}`,
          userId: "u-admin",
          title: "موافقة شركة على تمويل موظف",
          message: `وافقت ${prev.currentUser?.name || "الشركة"} على طلب التقسيط ${req.requestNumber} لـ ${req.userName}`,
          type: "installment",
          read: false,
          createdAt: new Date().toISOString(),
          link: "/admin/installments",
        },
        ...notifications,
      ];

      return {
        ...prev,
        installmentRequests: updatedRequests,
        auditLogs: [auditLog, ...prev.auditLogs],
        notifications,
      };
    });
  }, []);

  const companyRejectFinancing = useCallback((id: string, notes?: string) => {
    setState(prev => {
      const req = prev.installmentRequests.find(r => r.id === id);
      if (!req) return prev;

      const updatedRequests = prev.installmentRequests.map(r =>
        r.id === id ? {
          ...r,
          status: "مرفوض" as const,
          companyApproved: false,
          companyReviewedAt: new Date().toISOString(),
          companyReviewedBy: prev.currentUser?.name || "",
          companyNotes: notes,
        } : r
      );

      const auditLog: AuditLog = {
        id: `log-${auditCounter++}`,
        actor: prev.currentUser?.name || "",
        actorRole: prev.currentUser?.role || "company",
        action: "رفض الشركة لتمويل الموظف",
        entity: "InstallmentRequest",
        entityId: id,
        timestamp: new Date().toISOString(),
        details: `رفض الشركة لطلب التقسيط ${req.requestNumber} لـ ${req.userName} - ${req.productName}${notes ? ` - السبب: ${notes}` : ""}`,
      };

      let notifications = prev.notifications;
      if (req.userId) {
        notifications = [
          {
            id: `n-${notifCounter++}`,
            userId: req.userId,
            title: "رفض الشركة لطلب التقسيط",
            message: `اعتذرت شركتك عن طلب التقسيط الخاص بك لـ ${req.productName}${notes ? ` - السبب: ${notes}` : ""}`,
            type: "installment",
            read: false,
            createdAt: new Date().toISOString(),
            link: "/employee/orders",
          },
          ...notifications,
        ];
      }

      return {
        ...prev,
        installmentRequests: updatedRequests,
        auditLogs: [auditLog, ...prev.auditLogs],
        notifications,
      };
    });
  }, []);

  const logIdentityAccess = useCallback((verificationId: string, userName: string) => {
    setState(prev => {
      const auditLog: AuditLog = {
        id: `log-${auditCounter++}`,
        actor: prev.currentUser?.name || "",
        actorRole: prev.currentUser?.role || "admin",
        action: "عرض بيانات الهوية الحساسة",
        entity: "IdentityVerification",
        entityId: verificationId,
        timestamp: new Date().toISOString(),
        details: `عرض صور الهوية والسيلفي لـ ${userName}`,
      };
      return {
        ...prev,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  }, []);

  const value: AppContextType = {
    ...state,
    login,
    setCurrentUser,
    ensureEntityForUser,
    logout,
    register,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateCartPaymentType,
    clearCart,
    cartTotal,
    cartCount,
    createOrder,
    updateOrderStatus,
    createInstallmentApplication,
    reviewInstallmentApplication,
    recordPayment,
    addProduct,
    updateProduct,
    deleteProduct,
    addNotification,
    markNotificationRead,
    addEmployee,
    updateEmployee,
    addAuditLog,
    updateDeliveryStatus,
    updateSettlementStatus,
    submitIdentityVerification,
    reviewIdentityVerification,
    createInstallmentRequest,
    reviewInstallmentRequest,
    companyApproveFinancing,
    companyRejectFinancing,
    logIdentityAccess,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
