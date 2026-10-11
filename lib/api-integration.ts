/**
 * API Integration Layer — Placeholder for future bank & financial integrations.
 *
 * This module provides a typed interface for connecting to external financial
 * services (banks, payment processors, KYC providers) when the platform moves
 * from demo to production. All functions are stubs that return demo data.
 *
 * Future integrations may include:
 * - Bank salary verification (لتأكد من الراتب عبر البنك)
 * - Payment gateway integration (بوابة دفع)
 * - KYC/Identity verification API (واجهة التحقق من الهوية)
 * - Credit scoring service (خدمة تقييم الائتمان)
 */

export interface SalaryVerificationResult {
  verified: boolean;
  monthlySalary: number;
  employerName: string;
  verificationDate: string;
  source: string;
}

export interface PaymentGatewayConfig {
  provider: string;
  apiKey: string;
  merchantId: string;
  webhookUrl: string;
}

export interface CreditScoreResult {
  score: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
}

/**
 * Verify employee salary through bank API.
 * PLACEHOLDER: Returns demo data until real bank integration is configured.
 */
export async function verifySalary(bankAccountRef: string): Promise<SalaryVerificationResult> {
  return {
    verified: true,
    monthlySalary: 250000,
    employerName: "شركة الأمل للمقاولات",
    verificationDate: new Date().toISOString(),
    source: "demo-bank-api",
  };
}

/**
 * Process a payment through the payment gateway.
 * PLACEHOLDER: Returns demo success until real gateway is configured.
 */
export async function processPayment(
  amount: number,
  method: string,
  config?: PaymentGatewayConfig
): Promise<{ success: boolean; transactionId: string }> {
  return {
    success: true,
    transactionId: `TXN-${Date.now()}`,
  };
}

/**
 * Get credit score from external service.
 * PLACEHOLDER: Returns demo score until real service is configured.
 */
export async function getCreditScore(userId: string): Promise<CreditScoreResult> {
  return {
    score: 750,
    riskLevel: "low",
    recommendation: "مؤهل للتقسيط",
  };
}

/**
 * Submit identity verification to external KYC provider.
 * PLACEHOLDER: Returns demo result until real KYC provider is configured.
 */
export async function submitKYCVerification(
  documentImage: string,
  selfieImage: string,
  documentType: string
): Promise<{ verified: boolean; confidence: number; message: string }> {
  return {
    verified: true,
    confidence: 0.95,
    message: "تم التحقق تلقائياً (وضع تجريبي)",
  };
}

/**
 * Check if bank integration is configured.
 */
export function isBankIntegrationConfigured(): boolean {
  return false;
}

/**
 * Check if payment gateway is configured.
 */
export function isPaymentGatewayConfigured(): boolean {
  return false;
}
