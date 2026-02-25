import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'
import { toggleNotification } from '@/api/profile'
import { useTelegram } from '@/hooks/useTelegram'
import { formatPrice, formatDate, plural, SUBSCRIPTION_PLANS } from '@/utils'
import type { SubscriptionType } from '@/types'

// ─── Subscription status card ────────────────────────────

interface SubscriptionCardProps {
  type: SubscriptionType
  name: string
  description: string
  priceKopecks: number
  icon: string
  active: boolean
  expiresAt?: string
  onBuy: () => void
}

function SubscriptionCard({
  name,
  description,
  icon,
  active,
  expiresAt,
  onBuy,
}: SubscriptionCardProps) {
  return (
    <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5">{icon}</span>
          <div>
            <p className="font-semibold text-[var(--tg-theme-text-color)]">{name}</p>
            <p className="text-xs text-[var(--tg-theme-hint-color)] mt-0.5">{description}</p>
            {active && expiresAt && (
              <p className="text-xs text-green-600 mt-1">
                До {formatDate(expiresAt)}
              </p>
            )}
          </div>
        </div>

        {active ? (
          <span className="flex-shrink-0 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
            Активна
          </span>
        ) : (
          <button
            onClick={onBuy}
            className="flex-shrink-0 text-xs font-semibold text-[var(--tg-theme-button-text-color)] bg-[var(--tg-theme-button-color)] px-3 py-1.5 rounded-lg active:opacity-80 transition-opacity"
          >
            Купить
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Section header ──────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] px-1 mb-2">
      {title}
    </h2>
  )
}

// ─── Main page ───────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { profile, setProfile } = useUserStore()
  const [notifyLoading, setNotifyLoading] = useState(false)

  if (!profile) return null

  const { user, talons, subscriptions } = profile

  const lunchBalance = talons.find((t) => t.type === 'lunch')?.balance ?? 0
  const coffeeBalance = talons.find((t) => t.type === 'coffee')?.balance ?? 0

  function getSubscription(type: SubscriptionType) {
    return subscriptions.find((s) => s.active && s.type === type)
  }

  async function handleToggleNotification() {
    if (notifyLoading) return
    setNotifyLoading(true)
    const newValue = !user.notifyDailyMenu
    try {
      await toggleNotification(newValue)
      haptic.notificationOccurred('success')
      // profile is guaranteed non-null here (guard at render level)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const p = profile!
      setProfile({
        user: { ...user, notifyDailyMenu: newValue },
        talons: p.talons,
        subscriptions: p.subscriptions,
      })
    } catch {
      haptic.notificationOccurred('error')
    } finally {
      setNotifyLoading(false)
    }
  }

  function handleBuySubscription(_type: SubscriptionType) {
    navigate('/talons')
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col min-h-screen">
      {/* Шапка */}
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-[var(--tg-theme-text-color)]">Профиль</h1>
      </header>

      <div className="flex-1 px-4 pb-6 space-y-6 animate-fade-in">

        {/* Пользователь */}
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {user.firstName[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-[var(--tg-theme-text-color)] text-lg">{fullName}</p>
            {user.username && (
              <p className="text-sm text-[var(--tg-theme-hint-color)]">@{user.username}</p>
            )}
          </div>
        </div>

        {/* Талоны */}
        <div>
          <SectionHeader title="Талоны" />
          <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl overflow-hidden">
            <TalonRow
              icon="🍱"
              label="Обеденные талоны"
              balance={lunchBalance}
            />
            <div className="mx-4 h-px bg-[var(--tg-theme-bg-color)]" />
            <TalonRow
              icon="☕"
              label="Кофейные талоны"
              balance={coffeeBalance}
            />
          </div>
          <button
            onClick={() => navigate('/talons')}
            className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium text-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)] active:opacity-80 transition-opacity"
          >
            Пополнить талоны →
          </button>
        </div>

        {/* Подписки */}
        <div>
          <SectionHeader title="Подписки" />
          <div className="space-y-2">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const sub = getSubscription(plan.type)
              return (
                <SubscriptionCard
                  key={plan.type}
                  type={plan.type}
                  name={plan.name}
                  description={plan.description}
                  priceKopecks={plan.priceKopecks}
                  icon={plan.icon}
                  active={!!sub}
                  expiresAt={sub?.expiresAt}
                  onBuy={() => {
                    haptic.impactOccurred('medium')
                    handleBuySubscription(plan.type)
                  }}
                />
              )
            })}
          </div>
          {subscriptions.length === 0 && (
            <p className="text-xs text-[var(--tg-theme-hint-color)] px-1 mt-2">
              Подписка даёт безлимитный доступ к блюдам выбранного типа в течение месяца.{' '}
              <span className="text-[var(--tg-theme-button-color)]">
                {formatPrice(350000)}/мес — обед
              </span>
            </p>
          )}
        </div>

        {/* Уведомления */}
        <div>
          <SectionHeader title="Уведомления" />
          <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--tg-theme-text-color)]">Меню на день</p>
                <p className="text-xs text-[var(--tg-theme-hint-color)] mt-0.5">
                  Рассылка в 9:00 по рабочим дням
                </p>
              </div>
              <Toggle
                enabled={user.notifyDailyMenu}
                loading={notifyLoading}
                onToggle={handleToggleNotification}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Talon row ───────────────────────────────────────────

function TalonRow({ icon, label, balance }: { icon: string; label: string; balance: number }) {
  const text = `${balance} ${plural(balance, 'талон', 'талона', 'талонов')}`
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-[var(--tg-theme-text-color)]">{label}</span>
      </div>
      <span className={['text-sm font-bold', balance > 0 ? 'text-green-600' : 'text-[var(--tg-theme-hint-color)]'].join(' ')}>
        {text}
      </span>
    </div>
  )
}

// ─── Toggle switch ───────────────────────────────────────

function Toggle({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean
  loading: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={[
        'relative w-12 h-7 rounded-full transition-colors duration-200',
        enabled ? 'bg-[var(--tg-theme-button-color)]' : 'bg-gray-300',
        loading ? 'opacity-60' : '',
      ].join(' ')}
      aria-label="Toggle notification"
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200',
          enabled ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
