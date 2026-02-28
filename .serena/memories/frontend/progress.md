# Frontend — Прогресс разработки

Последнее обновление: **28.02.2026**
Статус: **ВСЕ 4 ФАЗЫ ЗАВЕРШЕНЫ**

---

## Клиентский Mini App (index.html) ✅
- 10 страниц: Menu, Item, Cart, Checkout, OrderSuccess, Orders, OrderDetail, Profile, Coupons, Favorites
- 7 компонентов: Spinner, EmptyState, Counter, StatusBadge, BottomNav, ErrorState, Skeleton
- 3 стора: cartStore, userStore, favoritesStore
- 4 хука: useTelegram, useMainButton, useBackButton, useRepeatOrder
- Design polish: 48 UI fixes applied

## Админский Mini App (admin.html) ✅
### Admin role (4 страницы)
- AdminOrdersPage — список заказов, фильтр, смена статуса, auto-refresh 15s
- AdminMenuPage — все блюда, поиск, toggle доступности (стоп-лист)
- AdminDailyMenuPage — выбор даты, чекбокс-список, сохранение
- AdminStatsPage — выручка, средний чек, топ блюд, способы оплаты, курьеры, bar chart

### Delivery role (2 страницы)
- DeliveryOrdersPage — готовые заказы, "Забрать"/"Доставлено", auto-refresh 10s
- DeliveryHistoryPage — stats карточки, список доставок за сегодня

### Shared
- AdminNav (4 tabs), DeliveryNav (2 tabs), AccessDeniedPage
- API clients: admin.ts, delivery.ts

## Build Output
- index.html → client (64KB JS)
- admin.html → admin+delivery (31KB JS)
- Shared chunk (262KB JS — React, router, etc.)
- tsc: 0 errors

## File Structure
```
frontend/src/
├── main.tsx, App.tsx, index.css
├── types/, api/, utils/, hooks/, store/
├── components/, pages/, mock/
└── admin/
    ├── main.tsx, AdminApp.tsx
    ├── api/ (admin.ts, delivery.ts)
    ├── components/ (AdminNav, DeliveryNav)
    └── pages/ (6 pages + AccessDeniedPage)
```
