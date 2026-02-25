import { useState } from 'react'
import { useUserStore } from '@/store/userStore'
import { buyTalons } from '@/api/profile'
import { useTelegram } from '@/hooks/useTelegram'
import { useBackButton } from '@/hooks/useBackButton'
import { formatPrice, formatDateTime, plural, TALON_PACKAGES } from '@/utils'
import type { TalonType } from '@/types'

// ─── Mock transaction history (пока нет API) ─────────────

const MOCK_TRANSACTIONS = [
  {
    id: 1,
    type: 'lunch' as TalonType,
    delta: +10,
    description: 'Покупка 10 талонов',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: 'lunch' as TalonType,
    delta: -1,
    description: 'Заказ #1234',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: 'coffee' as TalonType,
    delta: +5,
    description: 'Покупка 5 талонов',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ─── Type selector tab ───────────────────────────────────

interface TypeTabProps {
  active: boolean
  icon: string
  label: string
  balance: number
  onClick: () => void
}

function TypeTab({ active, icon, label, balance, onClick }: TypeTabProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-colors',
        active
          ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
          : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
      ].join(' ')}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      <span className={['text-sm font-bold', active ? 'opacity-90' : 'text-[var(--tg-theme-button-color)]'].join(' ')}>
        {balance} {plural(balance, 'талон', 'талона', 'талонов')}
      </span>
    </button>
  )
}

// ─── Package card ─────────────────────────────────────────

interface PackageCardProps {
  quantity: 5 | 10 | 20
  priceKopecks: number
  label: string
  badge: string | null
  loading: boolean
  onBuy: () => void
}

function PackageCard({ quantity, priceKopecks, badge, loading, onBuy }: PackageCardProps) {
  const pricePerTalon = Math.round(priceKopecks / quantity)

  return (
    <button
      onClick={onBuy}
      disabled={loading}
      className="w-full bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform disabled:opacity-60"
    >
      <div className="text-left">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--tg-theme-text-color)] text-lg">
            {quantity} талонов
          </span>
          {badge && (
            <span className="text-xs font-semibold text-[var(--tg-theme-button-text-color)] bg-[var(--tg-theme-button-color)] px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--tg-theme-hint-color)] mt-0.5">
          {formatPrice(pricePerTalon)} за талон
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-[var(--tg-theme-button-color)] text-lg">
          {formatPrice(priceKopecks)}
        </p>
      </div>
    </button>
  )
}

// ─── Transaction row ─────────────────────────────────────

interface TxRowProps {
  delta: number
  description: string
  createdAt: string
}

function TxRow({ delta, description, createdAt }: TxRowProps) {
  const isPositive = delta > 0
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--tg-theme-bg-color)] last:border-0">
      <div>
        <p className="text-sm text-[var(--tg-theme-text-color)]">{description}</p>
        <p className="text-xs text-[var(--tg-theme-hint-color)] mt-0.5">
          {formatDateTime(createdAt)}
        </p>
      </div>
      <span className={['text-sm font-bold', isPositive ? 'text-green-600' : 'text-red-500'].join(' ')}>
        {isPositive ? '+' : ''}{delta}
      </span>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────

export default function TalonsPage() {
  const { haptic, tg } = useTelegram()
  const { profile, setProfile } = useUserStore()
  const [selectedType, setSelectedType] = useState<TalonType>('lunch')
  const [buyingQty, setBuyingQty] = useState<number | null>(null)

  useBackButton()

  if (!profile) return null

  const { talons } = profile
  const lunchBalance = talons.find((t) => t.type === 'lunch')?.balance ?? 0
  const coffeeBalance = talons.find((t) => t.type === 'coffee')?.balance ?? 0

  const transactions = MOCK_TRANSACTIONS.filter((t) => t.type === selectedType)

  async function handleBuy(quantity: 5 | 10 | 20) {
    if (buyingQty !== null) return
    setBuyingQty(quantity)

    try {
      const { newBalance } = await buyTalons(selectedType, quantity)
      haptic.notificationOccurred('success')

      // profile is guaranteed non-null here (guard at render level)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const p = profile!
      setProfile({
        user: p.user,
        subscriptions: p.subscriptions,
        talons: talons.map((t) =>
          t.type === selectedType ? { ...t, balance: newBalance } : t,
        ),
      })

      tg.showPopup({
        title: 'Успешно!',
        message: `Куплено ${quantity} ${plural(quantity, 'талон', 'талона', 'талонов')}. Баланс: ${newBalance}`,
        buttons: [{ id: 'ok', type: 'ok' }],
      })
    } catch {
      haptic.notificationOccurred('error')
      tg.showPopup({ message: 'Не удалось совершить покупку. Попробуйте позже.' })
    } finally {
      setBuyingQty(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Шапка */}
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-[var(--tg-theme-text-color)]">Талоны</h1>
        <p className="text-sm text-[var(--tg-theme-hint-color)] mt-0.5">
          Предоплатите обеды и кофе по сниженной цене
        </p>
      </header>

      <div className="flex-1 px-4 pb-6 space-y-6 animate-fade-in">

        {/* Selector типа талона */}
        <div className="flex gap-2">
          <TypeTab
            active={selectedType === 'lunch'}
            icon="🍱"
            label="Обед"
            balance={lunchBalance}
            onClick={() => setSelectedType('lunch')}
          />
          <TypeTab
            active={selectedType === 'coffee'}
            icon="☕"
            label="Кофе"
            balance={coffeeBalance}
            onClick={() => setSelectedType('coffee')}
          />
        </div>

        {/* Пакеты */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] px-1 mb-2">
            Купить талоны
          </h2>
          <div className="space-y-2">
            {TALON_PACKAGES.map((pkg) => (
              <PackageCard
                key={pkg.quantity}
                quantity={pkg.quantity}
                priceKopecks={pkg.priceKopecks}
                label={pkg.label}
                badge={pkg.badge}
                loading={buyingQty === pkg.quantity}
                onBuy={() => {
                  haptic.impactOccurred('medium')
                  handleBuy(pkg.quantity)
                }}
              />
            ))}
          </div>
        </div>

        {/* История транзакций */}
        {transactions.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] px-1 mb-2">
              История
            </h2>
            <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl px-4">
              {transactions.map((tx) => (
                <TxRow
                  key={tx.id}
                  delta={tx.delta}
                  description={tx.description}
                  createdAt={tx.createdAt}
                />
              ))}
            </div>
          </div>
        )}

        {/* Описание */}
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4">
          <p className="text-xs text-[var(--tg-theme-hint-color)] leading-relaxed">
            Талоны списываются автоматически при оплате заказа. Срок действия — 1 год с момента покупки.
            Оплата картой через Т-Банк.
          </p>
        </div>

      </div>
    </div>
  )
}
