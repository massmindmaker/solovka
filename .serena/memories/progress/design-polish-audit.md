# Design Polish Audit — Выполнено

Дата: 2026-02-27

## Применено 48 фиксов по UI Engineer Skill

### P1: Типографика (6 фиксов)
- `text-[10px]` → `text-xs` (MenuPage badge, OrderSuccess stepper, BottomNav badge)
- H1 заголовки `text-xl` → `text-[22px]` (все 7 страниц)
- Инпуты `text-sm` → `text-base` (Checkout input + textarea) — iOS zoom fix

### P2: Цвета (20 фиксов)
- ВСЕ `var(--tg-theme-button-color)` убраны из TSX файлов
- CTA: `bg-emerald-500 text-white active:bg-emerald-600`
- Цены/итого: `text-emerald-600`
- Активные табы: `bg-emerald-500 text-white`
- Focus ring: `ring-emerald-500`
- Toggle: `bg-emerald-500`
- Файлы: MenuPage, ItemPage, CartPage, CheckoutPage, OrderSuccessPage, OrdersPage, ProfilePage, TalonsPage, Counter, BottomNav

### P3: Touch Targets (3 фикса)
- Counter sm: `w-6 h-6` → `w-8 h-8`
- Counter md: `w-8 h-8` → `w-10 h-10`
- Крестик удаления: `w-6 h-6` → `w-9 h-9`

### P4: Карточки (1 фикс)
- `aspect-square` → `aspect-[4/3]` (еда лучше в горизонтальном формате)
- Градиент: `from-amber-50 to-orange-50` (теплее)

### P5: Skeleton Loading (4 фикса)
- Создан `Skeleton.tsx` с 5 вариантами: MenuSkeleton, ItemSkeleton, OrdersSkeleton, ProfileSkeleton
- Shimmer анимация 1.5s ease-in-out infinite
- Применён вместо Spinner на: MenuPage, ItemPage, OrdersPage, ProfilePage

### P6: Микроанимации (6 фиксов в CSS)
- `animate-bounce-in` — счётчик на карточке меню, badge в BottomNav
- `animate-slide-up` — dropdown подсказок в Checkout
- `animate-pulse-once` — активный шаг степпера при смене статуса
- `animate-count-pop` — для счётчика (определён)
- Tab fade — `key={activeSlug}` на grid → remount с fade-in

### P7: Native Navigation (3 фикса)
- CartPage — native back button в header
- TalonsPage — native back button в header + useNavigate
- OrderSuccessPage — native sticky CTA "Вернуться в меню"

### P8: Visual Polish (5 фиксов)
- Spinner: `border-emerald-500` вместо `opacity-60`
- MenuPage header: `shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- EmptyState: `py-16` → `py-12`
- ProfilePage toggle: `bg-emerald-500`
- ProfilePage "Пополнить талоны": `bg-emerald-50 text-emerald-600`

## Новые файлы
- `frontend/src/components/Skeleton.tsx`

## CSS анимации добавлены в index.css
- `@keyframes slide-up`
- `@keyframes shimmer` + `.skeleton`
- `@keyframes bounce-in`
- `@keyframes pulse-once`
- `@keyframes count-pop`

## Оценка
- До: 5 / 8
- После: 7.5 / 8
- Build: OK (vite build clean, tsc --noEmit clean)
