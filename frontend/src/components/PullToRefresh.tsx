import { useRef, useState, useCallback, type ReactNode } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
}

const THRESHOLD = 60    // px to trigger refresh
const MAX_PULL = 100    // max pull distance
const RESISTANCE = 2.5  // pull resistance factor

export default function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return
    const scrollTop = containerRef.current?.scrollTop ?? 0
    if (scrollTop > 0) return // only when at top
    startYRef.current = e.touches[0].clientY
    pullingRef.current = true
  }, [refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || refreshing) return
    const scrollTop = containerRef.current?.scrollTop ?? 0
    if (scrollTop > 0) {
      pullingRef.current = false
      setPullDistance(0)
      return
    }

    const diff = e.touches[0].clientY - startYRef.current
    if (diff <= 0) {
      setPullDistance(0)
      return
    }

    const distance = Math.min(diff / RESISTANCE, MAX_PULL)
    setPullDistance(distance)
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      setPullDistance(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, onRefresh])

  const triggered = pullDistance >= THRESHOLD

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : '0px',
          transition: pullingRef.current ? 'none' : 'height 0.3s ease-out',
        }}
      >
        <div className={`flex items-center gap-2 text-sm text-[var(--tg-theme-hint-color)] ${triggered || refreshing ? 'opacity-100' : 'opacity-60'}`}>
          {refreshing ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="10" />
              </svg>
              <span>Обновление...</span>
            </>
          ) : (
            <>
              <span
                className="text-base transition-transform duration-200"
                style={{ transform: triggered ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ↓
              </span>
              <span>{triggered ? 'Отпустите' : 'Потяните вниз'}</span>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
