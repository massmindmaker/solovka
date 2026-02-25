# Code Style & Conventions — Solovka

## Язык и окружение
- **TypeScript** везде (strict mode)
- **Node.js** 18+ (для бэкенда)
- **React 18** (для фронтенда)
- Кодировка: **UTF-8**

---

## Именование

### Файлы и директории
- Компоненты React: `PascalCase.tsx` → `MenuPage.tsx`, `CartItem.tsx`
- Хуки: `camelCase.ts` с префиксом `use` → `useTelegram.ts`, `useCart.ts`
- API endpoints (Vercel): `kebab-case.ts` → `daily-menu.ts`
- Stores (Zustand): `camelCase.ts` → `cartStore.ts`, `userStore.ts`
- Утилиты: `camelCase.ts` → `formatPrice.ts`, `generateToken.ts`
- Типы: `PascalCase.ts` → `Order.ts`, `MenuItem.ts`

### Переменные и функции
- `camelCase` для переменных и функций
- `PascalCase` для типов, интерфейсов, классов, компонентов
- `SCREAMING_SNAKE_CASE` для констант: `MAX_CART_ITEMS`, `API_URL`
- `_` префикс для неиспользуемых параметров: `_req`, `_unused`

### БД
- Таблицы: `snake_case` множественное число → `menu_items`, `talon_transactions`
- Колонки: `snake_case` → `created_at`, `telegram_id`, `price_kopecks`
- Индексы: `idx_tablename_column` → `idx_orders_user_id`
- Enums: `snake_case` → `order_status`, `talon_type`

---

## TypeScript

```typescript
// ✅ Всегда явно типизировать возвращаемые значения функций
async function getMenu(): Promise<MenuItem[]> { ... }

// ✅ Интерфейсы для объектов данных
interface MenuItem {
  id: number;
  name: string;
  priceKopecks: number;
  categoryId: number;
  available: boolean;
}

// ✅ Type для unions и простых типов
type OrderStatus = 'pending' | 'paid' | 'preparing' | 'delivered' | 'cancelled';
type TalonType = 'lunch' | 'coffee';

// ✅ Enums только если значения используются в рантайме
// ❌ Избегать const enums

// ✅ Nullable явно
interface User {
  id: number;
  lastName: string | null;  // не undefined
}

// ✅ Использовать as const для конфигов
const TALON_PACKAGES = [5, 10, 20] as const;
type TalonPackage = typeof TALON_PACKAGES[number]; // 5 | 10 | 20
```

---

## React компоненты

```typescript
// ✅ Functional components с явными пропсами
interface CartItemProps {
  item: CartItem;
  onRemove: (id: number) => void;
  onQuantityChange: (id: number, quantity: number) => void;
}

export default function CartItem({ item, onRemove, onQuantityChange }: CartItemProps) {
  return ( ... );
}

// ✅ Хуки — в начале компонента, порядок: useState → useEffect → кастомные
function MenuPage() {
  const [loading, setLoading] = useState(true);
  const { items, addItem } = useCart();
  const { user } = useTelegram();

  useEffect(() => { ... }, []);

  // ...
}

// ✅ Выносить сложную логику в хуки, а не компоненты
// ✅ Использовать memo() только если реально нужно (не по умолчанию)
```

---

## Zustand (State Management)

```typescript
// store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: number;
  name: string;
  priceKopecks: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalKopecks: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.id === item.id);
        if (existing) {
          return { items: state.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )};
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id),
      })),
      clearCart: () => set({ items: [] }),
      totalKopecks: () => get().items.reduce((sum, i) => sum + i.priceKopecks * i.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
);
```

---

## API Client (Frontend)

```typescript
// api/client.ts — базовый fetch-клиент
import { retrieveRawInitData } from '@tma.js/sdk';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const initData = retrieveRawInitData();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `tma ${initData}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};
```

---

## Backend API Handlers (Vercel)

```typescript
// Шаблон для каждого endpoint
import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from '../db/client';
import { authenticate } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Аутентификация
    const user = await authenticate(req);

    if (req.method === 'GET') {
      const data = await sql`SELECT ...`;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { field } = req.body;
      // валидация...
      const result = await sql`INSERT INTO ...`;
      return res.status(201).json(result[0]);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Форматирование цен

```typescript
// Всегда хранить цены в копейках (integer)
// Отображать через helper:

export function formatPrice(kopecks: number): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(rubles);
}
// formatPrice(35000) → "350 ₽"
```

---

## Импорты

```typescript
// Порядок импортов:
// 1. Внешние библиотеки
import { useState, useEffect } from 'react';
import { create } from 'zustand';

// 2. Внутренние модули (абсолютные пути через @ alias)
import { api } from '@/api/client';
import { useCartStore } from '@/store/cartStore';

// 3. Типы
import type { MenuItem, Order } from '@/types';

// 4. Стили (в конце)
import './MenuPage.css';
```

---

## Tailwind CSS

- Использовать Tailwind utility-классы
- Для сложных повторяющихся блоков — `@apply` в CSS модулях
- Цвета темы Telegram через CSS-переменные: `bg-[var(--tg-theme-bg-color)]`
- Mobile-first: базовые стили для мобилки, sm/md для десктопа

```tsx
// ✅ Хорошо
<button className="w-full py-3 px-4 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] rounded-xl font-medium">
  Добавить в корзину
</button>

// ✅ Для частоповторяющихся — компонент
function PrimaryButton({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-medium active:opacity-80 transition-opacity"
    >
      {children}
    </button>
  );
}
```
