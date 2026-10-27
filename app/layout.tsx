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
import { RouteGuard } from "@/components/RouteGuard"
import { PWAInstaller } from "@/components/PWAInstaller"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: `${BRAND.name} - ${BRAND.tagline}`,
  description: "منصة يمنية للتسوق والتقسيط عبر الرواتب للموظفين - كل سلة منفصلة لكل مستخدم، دفع آمن، تقسيط مرن 6-24 شهر",
  manifest: "/manifest.json",
  themeColor: "#047857",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: "تسوق من متاجر اليمن وادفع على راحتك",
    locale: "ar_YE",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#047857" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="قسطها" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-tajawal antialiased min-h-screen flex flex-col">
        <AppProvider>
          <AuthProvider>
            <AuthBridge />
            <ToastProvider>
            <Header />
            <main className="flex-1 pb-16 md:pb-0"><RouteGuard>{children}</RouteGuard></main>
            <Footer />
            <BottomNav />
            <PWAInstaller />
            <Toaster />
            <SonnerToaster position="bottom-left" dir="rtl" />
            </ToastProvider>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  )
}
