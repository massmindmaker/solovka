import { cn } from '@/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />
}

/** 2-column grid of menu card skeletons */
export function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-[var(--tg-theme-secondary-bg-color)]">
          <div className="aspect-[4/3] skeleton" />
          <div className="p-3 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Item detail page skeleton */
export function ItemSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="w-full h-56 skeleton rounded-none" />
      <div className="px-5 pt-6 space-y-4">
        <div className="skeleton h-7 w-2/3" />
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-12 w-32 rounded-xl mt-6" />
      </div>
    </div>
  )
}

/** Order card skeleton */
export function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-[var(--tg-theme-secondary-bg-color)] p-4 space-y-3">
          <div className="flex justify-between">
            <div className="skeleton h-5 w-16" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
          <div className="flex justify-between pt-2">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Profile page skeleton */
export function ProfileSkeleton() {
  return (
    <div className="px-4 pb-6 space-y-6 animate-fade-in">
      {/* Avatar + name */}
      <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-4 flex items-center gap-4">
        <div className="skeleton w-14 h-14 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-4 w-24" />
        </div>
      </div>
      {/* Talons */}
      <div className="space-y-2">
        <div className="skeleton h-3 w-16" />
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-4 space-y-3">
          <div className="skeleton h-5 w-full" />
          <div className="skeleton h-5 w-full" />
        </div>
      </div>
      {/* Subscriptions */}
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="skeleton h-20 w-full rounded-xl" />
      </div>
    </div>
  )
}
