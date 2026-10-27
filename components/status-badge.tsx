import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  "جديد": "bg-blue-100 text-blue-700",
  "قيد المراجعة": "bg-yellow-100 text-yellow-700",
  "بانتظار الشركة": "bg-orange-100 text-orange-700",
  "تمت الموافقة": "bg-green-100 text-green-700",
  "قيد التجهيز": "bg-orange-100 text-orange-700",
  "تم الشحن": "bg-cyan-100 text-cyan-700",
  "تم التسليم": "bg-green-100 text-green-700",
  "ملغي": "bg-red-100 text-red-700",
  "مقبول": "bg-green-100 text-green-700",
  "مرفوض": "bg-red-100 text-red-700",
  "مكتمل": "bg-emerald-100 text-emerald-700",
  "متعثر": "bg-red-100 text-red-700",
  "نشط": "bg-green-100 text-green-700",
  "ناجح": "bg-green-100 text-green-700",
  "فشل": "bg-red-100 text-red-700",
  "قيد المعالجة": "bg-yellow-100 text-yellow-700",
  "قيد التنفيذ": "bg-blue-100 text-blue-700",
  "مدفوع": "bg-green-100 text-green-700",
  "استلمته شركة التوصيل": "bg-cyan-100 text-cyan-700",
  "في الطريق": "bg-orange-100 text-orange-700",
  "تعذر التسليم": "bg-red-100 text-red-700",
  "إجازة": "bg-yellow-100 text-yellow-700",
  "متوقف": "bg-red-100 text-red-700",
  "منتهي الخدمة": "bg-gray-200 text-gray-700",
  "مستحق": "bg-orange-100 text-orange-700",
  "متأخر": "bg-red-100 text-red-700",
  "قادم": "bg-blue-100 text-blue-700",
  "مؤهل": "bg-green-100 text-green-700",
  "غير مؤهل": "bg-red-100 text-red-700",
  "بانتظار المراجعة": "bg-yellow-100 text-yellow-700",
  "تم التحقق": "bg-green-100 text-green-700",
  "تعذر التحقق": "bg-red-100 text-red-700",
  "طلب إعادة الرفع": "bg-orange-100 text-orange-700",
  "لم يتم التحقق": "bg-gray-200 text-gray-700",
  "طلب جديد": "bg-blue-100 text-blue-700",
  "بانتظار المستندات": "bg-yellow-100 text-yellow-700",
  "بانتظار التحقق من الهوية": "bg-orange-100 text-orange-700",
  "موافق": "bg-green-100 text-green-700",
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const colorClass = statusColors[status] || "bg-gray-100 text-gray-700"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colorClass, className)}>
      {status}
    </span>
  )
}
