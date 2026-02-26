interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--tg-theme-text-color)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--tg-theme-hint-color)] mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
