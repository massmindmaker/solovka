import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesStore {
  ids: number[]
  toggle: (id: number) => void
  isFavorite: (id: number) => boolean
  clear: () => void
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((fid) => fid !== id)
            : [...state.ids, id],
        })),

      isFavorite: (id) => get().ids.includes(id),

      clear: () => set({ ids: [] }),
    }),
    { name: 'solovka-favorites' },
  ),
)
