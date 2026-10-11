import type { Metadata } from "next"
import "./globals.css"
import { AppProvider } from "@/lib/store"
import { AuthProvider } from "@/lib/auth-context"
import { ToastProvider } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BottomNav } from "@/components/layout/bottom-nav"
import { AuthBridge } from "@/components/AuthBridge"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: `${BRAND.name} - ${BRAND.tagline}`,
  description: "منصة يمنية للتسوق والتقسيط عبر الرواتب للموظفين",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-tajawal antialiased min-h-screen flex flex-col">
        <AppProvider>
          <AuthProvider>
            <AuthBridge />
            <ToastProvider>
            <Header />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <BottomNav />
            <Toaster />
            <SonnerToaster position="bottom-left" dir="rtl" />
            </ToastProvider>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  )
}
