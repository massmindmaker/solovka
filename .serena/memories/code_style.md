# Code Style & Conventions — Solovka

Последнее обновление: **28.02.2026**

## Язык и окружение
- **TypeScript** strict mode
- **Node.js** 18+, **React 18**, **Vite**
- Кодировка: **UTF-8**
- Система: **Windows** (PowerShell)

---

## Именование

### Файлы
| Тип | Стиль | Пример |
|-----|-------|--------|
| React компоненты | PascalCase.tsx | `MenuPage.tsx`, `CartItem.tsx` |
| Хуки | camelCase.ts + `use` | `useTelegram.ts` |
| API endpoints (Vercel) | kebab-case.ts | `daily-menu.ts` |
| Stores (Zustand) | camelCase.ts | `cartStore.ts` |
| Утилиты | camelCase.ts | `formatPrice.ts` |

### Переменные
- `camelCase` — переменные, функции
- `PascalCase` — типы, интерфейсы, компоненты
- `SCREAMING_SNAKE_CASE` — константы
- `_` — неиспользуемые параметры

### БД
- Таблицы: `snake_case` мн.ч. → `menu_items`
- Колонки: `snake_case` → `price_kopecks`
- Индексы: `idx_table_column` → `idx_orders_user_id`

---

## Критические правила Tailwind CSS v4

### 1. oklch() не работает в Telegram WebView
Tailwind v4 генерирует `oklch()` по умолчанию. TG WebView НЕ поддерживает.
**Решение**: hex overrides через `@theme` в `index.css`:
```css
@theme {
  --color-emerald-500: #10b981;
  --color-gray-900: #111827;
  /* все используемые цвета */
}
```

### 2. CSS Layers обязательны
Стили ВНЕ `@layer` перебивают ВСЕ Tailwind utilities (по спецификации CSS Cascade Layers).
```css
/* ✅ ПРАВИЛЬНО */
@layer base {
  button { background: none; }
}
@layer utilities {
  .skeleton { background: linear-gradient(...); }
}

/* ❌ НЕПРАВИЛЬНО — перебьёт bg-emerald-500 на кнопках */
button { background: none; }
```

### 3. Изображения в WebView
`<img>` внутри flex контейнера с `w-full h-full` = 0px в TG WebView.
```tsx
// ✅ ПРАВИЛЬНО
<div className="relative aspect-[4/3]">
  <img className="absolute top-0 left-0 w-full h-full object-cover" />
</div>

// ❌ НЕПРАВИЛЬНО
<div className="flex items-center justify-center">
  <img className="w-full h-full" />
</div>
```

### 4. Цвета текста
- **Основной**: `text-gray-900` (НЕ `var(--tg-theme-text-color)`)
- **Вторичный**: `text-gray-500` (НЕ `var(--tg-theme-hint-color)`)
- **CTA кнопки**: `bg-emerald-500 text-white` (НЕ `var(--tg-theme-button-color)`)
- TG CSS vars безопасны только для: фон страницы, фон карточек, бордеры

---

## TypeScript

```typescript
// Явные return types
async function getMenu(): Promise<MenuItem[]> { ... }

// Интерфейсы для данных
interface MenuItem { id: number; name: string; priceKopecks: number; }

// Type для unions
type OrderStatus = 'pending' | 'paid' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';

// Nullable = null (не undefined)
interface User { lastName: string | null; }

// as const для конфигов
const COUPON_PACKAGES = [5, 10, 20] as const;
```

---

## React

```typescript
// Functional components с явными пропсами
interface Props { item: CartItem; onRemove: (id: number) => void; }
export default function CartItem({ item, onRemove }: Props) { ... }

// Хуки в начале, порядок: useState → useEffect → custom
// Сложную логику → в хуки
// memo() — только если реально нужно
```

---

## Zustand

```typescript
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({ ... }),
    { name: 'solovka-cart' }
  )
);
```

---

## API Client (Frontend)

```typescript
// Authorization: tma <initData>
// Dev: пустой initData → BOT_TOKEN=dev пропускает
// Relative path: /api (через Vercel proxy)
```

---

## Backend API Handlers

```typescript
// Шаблон каждого endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS headers
  // 2. OPTIONS → 200
  // 3. Auth: requireAuth(req, res)
  // 4. Route by method (GET/POST/PUT)
  // 5. Error handling: 401/403/500
}
```

---

## Цены
- Хранение: **копейки** (integer)
- Отображение: `formatPrice(kopecks)` → "350 ₽"

## Импорты (порядок)
1. Внешние (react, zustand)
2. Внутренние (api, store, utils)
3. Типы (`import type`)
4. Стили

## Git
- Commit messages: `feat: ...`, `fix: ...`, `refactor: ...`
- Auto-deploy: push to master → Vercel production
