import { cn } from '@/utils'

interface CounterProps {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  className?: string
}

export default function Counter({
  value,
  onDecrement,
  onIncrement,
  min = 0,
  max = 99,
  size = 'md',
  className,
}: CounterProps) {
  const isSmall = size === 'sm'

  return (
    <div
      className={cn(
        'flex items-center rounded-xl bg-[var(--tg-theme-secondary-bg-color)]',
        isSmall ? 'gap-2 px-2 py-1' : 'gap-3 px-3 py-2',
        className,
      )}
    >
      <button
        onClick={onDecrement}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center rounded-lg font-bold transition-opacity',
          'text-[var(--tg-theme-button-color)] disabled:opacity-30',
          isSmall ? 'w-6 h-6 text-lg' : 'w-8 h-8 text-xl',
        )}
      >
        −
      </button>

      <span
        className={cn(
          'font-semibold text-[var(--tg-theme-text-color)] min-w-[1.5rem] text-center',
          isSmall ? 'text-sm' : 'text-base',
        )}
      >
        {value}
      </span>

      <button
        onClick={onIncrement}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center rounded-lg font-bold transition-opacity',
          'text-[var(--tg-theme-button-color)] disabled:opacity-30',
          isSmall ? 'w-6 h-6 text-lg' : 'w-8 h-8 text-xl',
        )}
      >
        +
      </button>
    </div>
  )
}
