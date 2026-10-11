"use client"
import Link from "next/link"
import { Home, ShoppingBag, CreditCard, Bell, User } from "lucide-react"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

export function BottomNav() {
  const { currentUser, cartCount, notifications } = useApp()
  const pathname = usePathname()

  if (!currentUser) return null

  const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length

  const items = [
    { href: "/", label: "الرئيسية", icon: Home, active: pathname === "/" },
    { href: "/shop", label: "المتجر", icon: ShoppingBag, active: pathname.startsWith("/shop") },
    { href: "/cart", label: "السلة", icon: ShoppingBag, active: pathname === "/cart", badge: cartCount },
    { href: "/notifications", label: "الإشعارات", icon: Bell, active: pathname === "/notifications", badge: unreadCount },
    { href: "/profile", label: "حسابي", icon: User, active: pathname === "/profile" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
              item.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge ? (
                <span className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
