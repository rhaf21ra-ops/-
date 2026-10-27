"use client"
import { usePathname } from "next/navigation"
import { Header } from "./header"
import { Footer } from "./footer"
import { BottomNav } from "./bottom-nav"

const HIDDEN_PREFIXES = ["/admin","/merchant","/company","/employee","/customer","/financial","/staff"]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const isDashboard = HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"))
  // صفحات الإدارة/التاجر لها DashboardLayout الخاص بها - لا نعرض هيدر المتجر العام
  if (isDashboard) return <>{children}</>
  return (
    <>
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </>
  )
}
