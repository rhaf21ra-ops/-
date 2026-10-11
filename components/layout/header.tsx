"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ShoppingCart, Search, Menu, Store, LogOut, User as UserIcon, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { BRAND } from "@/lib/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function Header() {
  const { currentUser, cartCount, logout } = useApp()
  const { signOut } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/shop?q=${encodeURIComponent(search.trim())}`)
  }

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/shop", label: "المتجر" },
    { href: "/categories", label: "التصنيفات" },
    { href: "/merchants", label: "التجار" },
    { href: "/how-it-works", label: "كيف يعمل" },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <SheetTrigger asChild>
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">{BRAND.name}</span>
              </Link>
            </SheetTrigger>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-4 border-t pt-4">
              {currentUser ? (
                <>
                  <SheetClose asChild>
                    <Link href={getDashboardHref(currentUser.role)} className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                      لوحة التحكم
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/profile" className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                      {currentUser.name}
                    </Link>
                  </SheetClose>
                  <button
                    onClick={async () => { await signOut(); logout(); router.push("/") }}
                    className="block w-full text-right rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Link href="/login"><Button className="w-full">تسجيل الدخول</Button></Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/register"><Button variant="outline" className="w-full">إنشاء حساب</Button></Link>
                  </SheetClose>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold hidden sm:inline">{BRAND.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 mr-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="pr-9"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 mr-auto">
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link href={getDashboardHref(currentUser.role)}>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <UserIcon className="h-4 w-4 ml-1" />
                  {ROLE_LABELS[currentUser.role]}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); logout(); router.push("/") }}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login"><Button variant="ghost" size="sm">تسجيل الدخول</Button></Link>
              <Link href="/register"><Button size="sm">إنشاء حساب</Button></Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function getDashboardHref(role: string): string {
  switch (role) {
    case "admin": return "/admin"
    case "merchant": return "/merchant"
    case "company": return "/company"
    case "financial": return "/financial"
    case "staff": return "/staff/identity"
    case "customer": return "/customer"
    default: return "/employee"
  }
}
