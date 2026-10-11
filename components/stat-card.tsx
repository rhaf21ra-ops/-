import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title?: string
  label?: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: string
  color?: string
}

export function StatCard({ title, label, value, icon: Icon, description, trend, color = "text-primary" }: StatCardProps) {
  const displayTitle = title || label
  return (
    <Card className="animate-fade-in hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{displayTitle}</p>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && <span className="text-xs font-medium text-primary">{trend}</span>}
            {description && <span className="text-xs text-muted-foreground">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
