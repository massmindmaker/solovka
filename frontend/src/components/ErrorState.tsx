interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export default function ErrorState({
  title = 'Что-то пошло не так',
  description = 'Не удалось загрузить данные. Проверьте подключение к интернету.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <span className="text-5xl mb-4">😕</span>
      <h2 className="text-lg font-bold text-[var(--tg-theme-text-color)] mb-1">
        {title}
      </h2>
      <p className="text-sm text-[var(--tg-theme-hint-color)] mb-5 max-w-[280px]">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 transition-colors"
        >
          Повторить
        </button>
      )}
    </div>
  )
}
