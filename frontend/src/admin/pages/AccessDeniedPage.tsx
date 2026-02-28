import { useTelegram } from '@/hooks/useTelegram'

export default function AccessDeniedPage() {
  const { tg } = useTelegram()

  return (
    <div className="flex flex-col min-h-screen min-h-dvh bg-gray-50 items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Нет доступа</h1>
      <p className="text-gray-500 mb-6">
        У вас нет прав для доступа к панели администратора.
        Обратитесь к администратору для получения доступа.
      </p>
      <button
        onClick={() => tg.close()}
        className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-base active:bg-emerald-600 transition-colors"
      >
        Закрыть
      </button>
    </div>
  )
}
