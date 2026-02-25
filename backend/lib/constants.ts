export const TALON_PACKAGES = [
  { quantity: 5 as const, priceKopecks: 150000, label: '5 талонов' },
  { quantity: 10 as const, priceKopecks: 280000, label: '10 талонов' },
  { quantity: 20 as const, priceKopecks: 500000, label: '20 талонов' },
]

export const SUBSCRIPTION_PLANS = [
  { type: 'lunch' as const, name: 'Бизнес-ланч', priceKopecks: 350000 },
  { type: 'coffee' as const, name: 'Кофе', priceKopecks: 150000 },
]
