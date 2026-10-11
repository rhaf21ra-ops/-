import type { GuaranteeType } from "@/components/GuaranteeSelect";

/**
 * Guarantee types offered for installment plans.
 * Cash payment never asks for a guarantee. The field lists are the working set for this build;
 * when the database is connected, the `guarantee_types` table (migration 0005) becomes the source.
 */
export const GUARANTEE_TYPES: GuaranteeType[] = [
  {
    id: 1,
    code: "account",
    name_ar: "ضمانة حساب",
    description_ar: "ضمان بحساب بنكي أو محفظة باسمك",
    requires_guarantor: false,
    audience: "both",
    fields: [
      { key: "account_holder", label: "اسم صاحب الحساب", type: "text", required: true },
      { key: "account_number", label: "رقم الحساب", type: "text", required: true },
      { key: "bank_name", label: "اسم البنك أو المحفظة", type: "text", required: true },
    ],
  },
  {
    id: 2,
    code: "gold",
    name_ar: "ضمانة ذهب",
    description_ar: "ضمان بذهب مملوك لك، يُراجع وزنه وعياره لدى الفرع",
    requires_guarantor: false,
    audience: "both",
    fields: [
      { key: "weight_grams", label: "الوزن بالجرام", type: "number", required: true },
      { key: "karat", label: "العيار", type: "text", required: true },
    ],
  },
  {
    id: 3,
    code: "commercial",
    name_ar: "ضمانة تجارية",
    description_ar: "ضمان بسجل أو نشاط تجاري مسجّل باسمك",
    requires_guarantor: false,
    audience: "both",
    fields: [
      { key: "business_name", label: "اسم النشاط التجاري", type: "text", required: true },
      { key: "commercial_register", label: "رقم السجل التجاري", type: "text", required: true },
    ],
  },
  {
    id: 4,
    code: "company",
    name_ar: "ضمانة الشركة",
    description_ar: "ضمان تمنحه شركتك لموظفيها، ويُرسل الطلب إلى الشركة للموافقة",
    requires_guarantor: false,
    audience: "employee",
    fields: [],
  },
];

/** Platform-wide default. A company can be switched off individually via `companyGuaranteeAllowed`. */
export const COMPANY_GUARANTEE_PLATFORM_DEFAULT = true;

/**
 * Guarantee options for the applicant.
 * - Customers: account, gold, commercial.
 * - Employees: the same three, plus company guarantee only when their company allows it.
 */
export function guaranteeOptionsFor(
  isEmployee: boolean,
  company?: { companyGuaranteeAllowed?: boolean } | null,
): GuaranteeType[] {
  const companyAllowed = isEmployee && !!company &&
    (company.companyGuaranteeAllowed ?? COMPANY_GUARANTEE_PLATFORM_DEFAULT);
  return GUARANTEE_TYPES.filter((t) => {
    if (t.audience === "both") return true;
    if (t.audience === "employee") return companyAllowed;
    return false;
  });
}
