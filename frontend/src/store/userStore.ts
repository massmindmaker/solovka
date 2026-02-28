import { create } from 'zustand'
import type { UserProfile, CouponBalance, Subscription } from '@/types'

interface UserStore {
  profile: UserProfile | null
  loading: boolean
  setProfile: (profile: UserProfile) => void
  setLoading: (loading: boolean) => void
  getCouponBalance: (type: 'lunch' | 'coffee') => number
  hasActiveSubscription: (type: 'lunch' | 'coffee') => boolean
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  loading: true,

  setProfile: (profile) => set({ profile, loading: false }),
  setLoading: (loading) => set({ loading }),

  getCouponBalance: (type) => {
    const coupon = get().profile?.coupons.find((c: CouponBalance) => c.type === type)
    return coupon?.balance ?? 0
  },

  hasActiveSubscription: (type) => {
    const subs = get().profile?.subscriptions ?? []
    return subs.some(
      (s: Subscription) =>
        s.active &&
        new Date(s.expiresAt) > new Date() &&
        (s.type === type || s.type === 'lunch_coffee'),
    )
  },
}))
