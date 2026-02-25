import { api } from './client'
import { MOCK_PROFILE } from '@/mock/data'
import type { UserProfile, TalonType } from '@/types'

const IS_DEV = import.meta.env.DEV

export async function fetchProfile(): Promise<UserProfile> {
  if (IS_DEV) return Promise.resolve(MOCK_PROFILE)
  return api.get<UserProfile>('/users/me')
}

export async function buyTalons(type: TalonType, quantity: 5 | 10 | 20): Promise<{ newBalance: number }> {
  if (IS_DEV) {
    return Promise.resolve({ newBalance: 10 })
  }
  return api.post<{ newBalance: number }>('/talons/buy', { type, quantity })
}

export async function buySubscription(type: string): Promise<{ paymentUrl: string }> {
  if (IS_DEV) {
    return Promise.resolve({ paymentUrl: 'https://securepay.tinkoff.ru/mock' })
  }
  return api.post<{ paymentUrl: string }>('/subscriptions/buy', { type })
}

export async function toggleNotification(enabled: boolean): Promise<void> {
  if (IS_DEV) return Promise.resolve()
  return api.put('/users/me/notifications', { enabled })
}
