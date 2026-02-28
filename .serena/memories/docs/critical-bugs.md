# Критические баги — обнаруженные и исправленные

Последнее обновление: **28.02.2026**

Этот файл — справочник для будущей разработки, чтобы не повторять ошибки.

---

## Баг 1: oklch() цвета не работают в Telegram WebView

**Проблема**: Tailwind CSS v4 генерирует цвета в формате `oklch()` по умолчанию. Telegram WebView (Android/iOS) не поддерживает `oklch()` → все цвета прозрачные/невидимые.

**Решение**: Переопределить все цвета через `@theme` в `index.css` с hex-значениями:
```css
@theme {
  --color-emerald-500: #10b981;
  --color-gray-900: #111827;
  /* и т.д. */
}
```

**Правило**: ВСЕГДА проверять, что цвета в hex, не oklch(). При добавлении новых цветов — добавлять override в `@theme`.

---

## Баг 2: Невидимые кнопки (CSS Layers)

**Проблема**: Глобальный reset `button { background: none; border: none; }` был ВЫШE `@layer` — по спецификации CSS Cascade Layers unlayered styles имеют высший приоритет и перебивают все `@layer utilities`. Результат: `bg-emerald-500` на кнопках не работал.

**Решение**: ВСЕ кастомные стили обязательно внутри `@layer`:
```css
@layer base {
  button { background: none; border: none; }
}
@layer utilities {
  .skeleton { ... }
  .animate-bounce-in { ... }
}
```

**Правило**: НИКОГДА не писать стили вне `@layer base` или `@layer utilities` в файлах с Tailwind v4.

---

## Баг 3: Изображения не отображаются в WebView

**Проблема**: `<img>` внутри flex-контейнера с `w-full h-full items-center justify-center` рендерится как 0px в Telegram WebView. Браузер отображает нормально.

**Решение**: Использовать абсолютное позиционирование:
```tsx
<div className="relative aspect-[4/3]">
  <img className="absolute top-0 left-0 w-full h-full object-cover" />
</div>
```

**Правило**: Для изображений в контейнерах с aspect-ratio — ВСЕГДА `absolute + inset-0 + object-cover`.

---

## Баг 4: Пустое меню на production

**Проблема**: Frontend вызывал `/api/menu/categories` и `/api/menu/items` (раздельные endpoints), которые не существовали → 404.

**Решение**: Единый endpoint `GET /api/menu` → `{ categories, items, dailyItemIds }`. Frontend: `fetchMenu()` с module-level cache.

---

## Баг 5: Auth header trailing space

**Проблема**: Vercel стрипает trailing spaces из заголовков. `Authorization: tma ` → `"tma"` → `startsWith('tma ')` = false → 401.

**Решение**: `authHeader.trim()`, проверка `startsWith('tma')` (без пробела), `slice(3).trim()`.

---

## Баг 6: Race condition в MenuPage

**Проблема**: `activeSlug` стартовал как `'daily'` → useEffect сразу запускал `fetchMenuItems('daily')` до того, как первый useEffect определил нужный slug.

**Решение**: `activeSlug` стартует как `null`, guard: `if (!activeSlug) return`.

---

## Баг 7: "Меню дня" пусто по умолчанию

**Проблема**: `dailyItemIds: []` → категория daily показывала "Пусто".

**Решение**: Если `dailyItemIds.length === 0`, ищем первую непустую категорию (кроме daily/business-lunch).

---

## Баг 8: Vercel build ошибка — импорты orders

**Проблема**: `api/orders/index.ts` имел неправильные пути импорта.

**Решение**: Исправлены relative import paths.
