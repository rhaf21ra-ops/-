import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface PremiumStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  gradient: string // tailwind gradient class
  iconBg: string
}

export function PremiumStatCard({ label, value, icon: Icon, trend, trendUp, gradient, iconBg }: PremiumStatCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={cn("h-1 w-full", gradient)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
            <p className="text-2xl font-extrabold mt-2 tracking-tight">{value}</p>
            {trend && (
              <p className={cn("text-xs font-medium mt-1 flex items-center gap-1", trendUp ? "text-emerald-600" : "text-amber-600")}>
                <span>{trendUp ? "↗" : "↘"}</span> {trend}
              </p>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-md", iconBg)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
