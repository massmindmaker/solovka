import { cn } from '@/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/utils'
import type { OrderStatus } from '@/types'

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        ORDER_STATUS_COLOR[status],
        className,
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
