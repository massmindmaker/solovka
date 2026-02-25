import { cn } from '@/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent opacity-60',
        sizeClass,
        className,
      )}
    />
  )
}

export function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
