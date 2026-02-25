# Frontend — Прогресс разработки

Последнее обновление: **26.02.2026** — все баги с пустым меню исправлены, подтверждено Playwright.

---

## Статус задач

| Задача | Статус |
|--------|--------|
| Scaffolding, deps, config | ✅ Done |
| Types, utils, hooks, stores | ✅ Done |
| API client + modules | ✅ Done |
| Все 8 страниц | ✅ Done |
| Все компоненты | ✅ Done |
| **Fix: /api/menu unified endpoint** | ✅ Done |
| **Fix: auth header trailing space** | ✅ Done |
| **Fix: MenuPage race condition** | ✅ Done |
| tsc --noEmit clean | ✅ Done |
| npm run build clean | ✅ Done |
| **Playwright: меню видно в браузере** | ✅ Verified |

---

## Исправленные баги (все подтверждены Playwright)

### Баг 1 — неправильные API endpoints (ИСПРАВЛЕН)
`menu.ts` вызывал `/api/menu/categories` и `/api/menu/items` → 404.
Рефакторинг: единый `fetchMenu()` → `/api/menu` + module-level cache.

### Баг 2 — Vercel стрипает trailing space в Authorization header (ИСПРАВЛЕН)
`Authorization: tma ` (пробел без данных) → Vercel обрезает → `"tma"` → `startsWith('tma ')` = false → 401.
Фикс: `authHeader.trim()`, проверка `startsWith('tma')`, `slice(3).trim()`.

### Баг 3 — Race condition: fetchMenuItems('daily') до setActiveSlug (ИСПРАВЛЕН)
`activeSlug` стартовал как `'daily'` → второй useEffect сразу запускал `fetchMenuItems('daily')` — до того как первый useEffect определил нужный slug.
Фикс: `activeSlug` стартует как `null`, второй useEffect гвардится `if (!activeSlug) return`.

### Баг 4 — "Меню дня" пусто по умолчанию (ИСПРАВЛЕН)
`dailyItemIds: []` → категория `daily` показывала "Пусто".
Фикс: если `dailyItemIds.length === 0`, ищем первую непустую категорию (кроме daily/business-lunch).

---

## API модули (`frontend/src/api/menu.ts`)

```typescript
interface MenuResponse { categories, items, dailyItemIds }

fetchMenu()           // GET /api/menu — один запрос, module-level cache
fetchCategories()     // из кеша
fetchMenuItems(slug?) // из кеша, фильтр: 'daily'=по dailyItemIds, иначе по categorySlug
fetchMenuItem(id)     // из кеша, поиск по id
clearMenuCache()      // сброс кеша
```

---

## MenuPage.tsx — логика загрузки

```
mount
  → fetchMenu() [одни запрос, кешируется]
      ↓ resolve
      setCategories(cats)
      if dailyItemIds.length > 0 → activeSlug = 'daily'
      else → activeSlug = первая непустая категория
  → activeSlug changes (null → slug)
      → fetchMenuItems(activeSlug) → setItems
```

---

## Playwright диагностика (production)

Результат после всех исправлений:
```
DOM: categoryTabs=7, menuCards=4, JS errors=0
API: /api/users/me → 200, /api/menu → 200
Показывается: Холодные закуски (4 позиции)
```

---

## Структура файлов

```
frontend/src/
├── api/
│   ├── client.ts          Authorization: tma + initData (пустая → dev fallback)
│   ├── menu.ts            ✅ ИСПРАВЛЕН: fetchMenu() + cache
│   ├── orders.ts
│   └── profile.ts
├── pages/
│   ├── Menu/MenuPage.tsx  ✅ ИСПРАВЛЕН: race condition fix
│   ├── Item/ItemPage.tsx
│   └── ... (6 других страниц)
└── ...
```

## Маршруты

```
/                    → MenuPage
/item/:id            → ItemPage
/cart                → CartPage
/checkout            → CheckoutPage
/order-success/:id   → OrderSuccessPage
/orders              → OrdersPage
/profile             → ProfilePage
/talons              → TalonsPage
```
