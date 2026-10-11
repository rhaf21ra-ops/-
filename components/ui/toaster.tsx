"use client"
import { useToast as useToastHook } from "@/hooks/use-toast"

export { useToastHook as useToast }

export function Toaster() {
  const { toasts, dismiss } = useToastHook()

  return (
    <div className="fixed bottom-0 left-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[420px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`mb-2 rounded-lg border p-4 shadow-lg transition-all animate-slide-up ${
            toast.variant === "destructive"
              ? "border-destructive/50 bg-destructive text-destructive-foreground"
              : "border-border bg-card text-card-foreground"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {toast.title && (
                <p className="font-semibold text-sm">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-sm opacity-90 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
