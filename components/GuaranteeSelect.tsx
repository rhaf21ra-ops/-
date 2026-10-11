"use client";

import { ShieldCheck } from "lucide-react";

export type GuaranteeField = { key: string; label: string; type: "text" | "number"; required: boolean };

export type GuaranteeType = {
  id: number;
  code: string;
  name_ar: string;
  description_ar: string | null;
  requires_guarantor: boolean;
  audience: "customer" | "employee" | "both";
  fields: GuaranteeField[];
};

export type GuaranteeValue = {
  guaranteeTypeId: number | null;
  details: Record<string, string>;
  guarantorName: string;
  guarantorPhone: string;
  guarantorIdNumber: string;
};

export const emptyGuarantee: GuaranteeValue = {
  guaranteeTypeId: null, details: {}, guarantorName: "", guarantorPhone: "", guarantorIdNumber: "",
};

/** Types an applicant may choose: employees see company types + shared ones, customers see shared ones. */
export function typesFor(all: GuaranteeType[], isEmployee: boolean): GuaranteeType[] {
  return all.filter((t) => t.audience === "both" || t.audience === (isEmployee ? "employee" : "customer"));
}

/** Returns an error message, or null when valid. The server re-validates (triggers in 0005). */
export function validateGuarantee(types: GuaranteeType[], v: GuaranteeValue): string | null {
  const t = types.find((x) => x.id === v.guaranteeTypeId);
  if (!t) return "اختر نوع الضمان";
  for (const f of t.fields) {
    const val = (v.details[f.key] ?? "").trim();
    if (f.required && !val) return `أدخل: ${f.label}`;
    if (f.type === "number" && val && !(Number(val) > 0)) return `قيمة غير صحيحة: ${f.label}`;
  }
  if (t.requires_guarantor && (!v.guarantorName.trim() || !v.guarantorPhone.trim()))
    return "أدخل اسم الكفيل ورقم هاتفه";
  return null;
}

export function GuaranteeSelect({
  types, value, onChange, disabled,
}: {
  types: GuaranteeType[];
  value: GuaranteeValue;
  onChange: (v: GuaranteeValue) => void;
  disabled?: boolean;
}) {
  const selected = types.find((t) => t.id === value.guaranteeTypeId);
  const field = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 disabled:opacity-50";

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="mb-2 flex items-center gap-2 font-bold">
        <ShieldCheck className="h-5 w-5 text-primary" /> اختر نوع الضمان
      </legend>

      {types.map((t) => (
        <label
          key={t.id}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
            value.guaranteeTypeId === t.id ? "border-primary bg-primary-light" : "border-neutral-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="guarantee"
            className="mt-1"
            checked={value.guaranteeTypeId === t.id}
            onChange={() => onChange({ ...emptyGuarantee, guaranteeTypeId: t.id })}
          />
          <span>
            <span className="block font-medium">{t.name_ar}</span>
            {t.description_ar && <span className="block text-sm text-neutral-500">{t.description_ar}</span>}
          </span>
        </label>
      ))}

      {selected && selected.fields.length > 0 && (
        <div className="space-y-2 rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-700">بيانات الضمان</p>
          {selected.fields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block text-neutral-700">{f.label}{f.required ? " *" : ""}</span>
              <input
                className={field}
                inputMode={f.type === "number" ? "decimal" : undefined}
                value={value.details[f.key] ?? ""}
                onChange={(e) => onChange({ ...value, details: { ...value.details, [f.key]: e.target.value } })}
              />
            </label>
          ))}
        </div>
      )}

      {selected?.requires_guarantor && (
        <div className="space-y-2 rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-700">بيانات الكفيل</p>
          <input className={field} placeholder="اسم الكفيل" value={value.guarantorName}
            onChange={(e) => onChange({ ...value, guarantorName: e.target.value })} />
          <input className={field} placeholder="رقم هاتف الكفيل" inputMode="tel" dir="ltr" value={value.guarantorPhone}
            onChange={(e) => onChange({ ...value, guarantorPhone: e.target.value })} />
          <input className={field} placeholder="رقم هوية الكفيل (اختياري)" dir="ltr" value={value.guarantorIdNumber}
            onChange={(e) => onChange({ ...value, guarantorIdNumber: e.target.value })} />
        </div>
      )}
    </fieldset>
  );
}
