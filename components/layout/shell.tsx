"use client"
// Shell الآن لا يضيف Header/Footer لأن الصفحات العامة (shop, categories...) تضيفها بنفسها
// دوره فقط عزل صفحات الإدارة حتى لا يبقى هيدر المتجر عالقاً
export function Shell({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
