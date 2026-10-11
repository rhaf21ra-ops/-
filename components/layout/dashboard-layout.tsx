"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, Bell, X } from "lucide-react"
import { useState } from "react"
import { useApp } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export function DashboardLayout({
  children,
  navItems,
  title,
  role,
}: {
  children: React.ReactNode
  navItems: NavItem[]
  title: string
  role: string
}) {
  const { currentUser, logout, notifications } = useApp()
  const { signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter(n => n.userId === currentUser?.id && !n.read).length

  const handleLogout = async () => {
    await signOut()
    logout()
    router.push("/")
  }

  const isActive = (item: NavItem) =>
    pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))

  const navLinks = navItems.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        isActive(item)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  ))

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 right-0 border-l bg-card">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 p-6 border-b">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  س
                </div>
                <div>
                  <p className="font-bold text-sm">قسطها</p>
                  <p className="text-xs text-muted-foreground">{title}</p>
                </div>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">{navLinks}</nav>
            <div className="border-t p-3 space-y-1">
              <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent">
                <LogOut className="h-5 w-5" />
                العودة للمتجر
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 md:mr-64 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur h-16 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 p-0">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between p-6 border-b">
                      <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                          س
                        </div>
                        <div>
                          <p className="font-bold text-sm">قسطها</p>
                          <p className="text-xs text-muted-foreground">{title}</p>
                        </div>
                      </Link>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                      {navItems.map((item) => (
                        <SheetClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive(item)
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </nav>
                    <div className="border-t p-3 space-y-1">
                      <SheetClose asChild>
                        <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent">
                          <LogOut className="h-5 w-5" />
                          العودة للمتجر
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="h-5 w-5" />
                          تسجيل الخروج
                        </button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="font-bold text-lg">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="text-left">
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[currentUser?.role as keyof typeof ROLE_LABELS] || ""}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {currentUser?.name?.charAt(0) || "؟"}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
