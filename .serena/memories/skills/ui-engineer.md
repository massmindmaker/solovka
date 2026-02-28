# UI Engineer — Mobile Interface Design System

## Когда применять
При создании/редизайне любых мобильных интерфейсов (React + Tailwind CSS v4), особенно Telegram Mini Apps.

---

## 1. ТИПОГРАФИКА

| Роль | Размер | Вес | Tailwind |
|---|---|---|---|
| H1 | 28px | 700 | `text-[28px] font-bold tracking-tight` |
| H2 | 22px | 700 | `text-[22px] font-bold` |
| H3 | 18px | 600 | `text-lg font-semibold` |
| Body | 16px | 400 | `text-base` |
| Small | 14px | 400 | `text-sm` |
| Caption | 12px | 500 | `text-xs font-medium` |

**НИКОГДА** менее 12px. Инпуты ВСЕГДА 16px (iOS zoom).

## 2. ЦВЕТА — CTA КНОПКИ

**ПРАВИЛО #1:** Никогда не используй `--tg-theme-button-color` для CTA. Контраст не гарантирован.

| Элемент | Фон | Текст | Tailwind |
|---|---|---|---|
| Primary CTA | emerald-500 | white | `bg-emerald-500 text-white` |
| Hover/Active | emerald-600 | white | `active:bg-emerald-600` |
| Disabled | gray-200 | gray-400 | `bg-gray-200 text-gray-400` |
| Destructive | red-500 | white | `bg-red-500 text-white` |

**Где TG переменные БЕЗОПАСНЫ:** фон страницы, фон карточек, текст, хинт-текст, бордеры.

## 3. TOUCH TARGETS

- Минимум: 44x44px (`min-h-11 min-w-11`)
- Идеал: 48x48px
- Все CTA — в sticky bottom bar (зона большого пальца)
- Каждый тап-элемент: `active:scale-[0.98]` или `active:opacity-80`

## 4. КОМПОНЕНТЫ

### Карточка меню
- Картинка: `h-36` или `aspect-[3/2]`, не aspect-square
- Контент: `p-3`, название `text-sm font-medium line-clamp-2`
- CTA: **полная ширина**, `bg-emerald-500 text-white`, с ценой
- После добавления → счётчик `[− qty +]` той же ширины

### Sticky Bottom CTA
```
fixed bottom-0 left-0 right-0 z-50
px-4 pt-3 bg-[var(--tg-theme-bg-color)]
style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
```
Кнопка: `w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold`

### Кнопка Назад
- На картинке: `absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-sm`
- В шапке: `w-9 h-9 rounded-full bg-[var(--tg-theme-secondary-bg-color)]`
- **Обязательно** — TG BackButton не работает в браузере

### Форма
- Input: `px-4 py-3 rounded-xl text-base` (16px!)
- Focus: `ring-2 ring-emerald-500`
- Error: `ring-2 ring-red-400` + `text-xs text-red-500 mt-1.5`
- Валидация: blur → change (после первой ошибки) → submit

## 5. НАВИГАЦИЯ

| Страница | BottomNav | Bottom CTA |
|---|---|---|
| Меню/каталог | ВИДИМ | Скрыт |
| Корзина | ВИДИМ | Скрыт |
| Детали товара | **СКРЫТ** | "Добавить" sticky |
| Checkout | **СКРЫТ** | "Оплатить" sticky |
| Успех заказа | **СКРЫТ** | "В меню" |
| Заказы, Профиль | ВИДИМ | Скрыт |

С BottomNav: `<main class="pb-16">`
Без: `<main>` (без паддинга)

## 6. АНИМАЦИИ

| Тип | Длительность | Easing |
|---|---|---|
| Появление | 200ms | ease-out |
| Исчезновение | 150ms | ease-in |
| Slide up | 300ms | ease-out |
| Bounce | 400ms | spring (0.34, 1.56, 0.64, 1) |
| Shimmer | 1500ms | ease-in-out infinite |

**Правило:** выходы быстрее входов.
**Анимировать:** opacity, transform. **Никогда:** width, height, margin.

## 7. ЗАГРУЗКА

| Время | Паттерн |
|---|---|
| < 1с | Ничего |
| 1-3с | Skeleton |
| 3-10с | Skeleton + shimmer |
| > 10с | Progress bar |

## 8. SPACING

- Страница: `px-4` (16px)
- Карточки: `p-3` (12px)
- Зазор карточек: `gap-3` (12px)
- Секции формы: `space-y-4` (16px)
- Border radius карточек: `rounded-xl` (12px)

## 9. АНТИ-ПАТТЕРНЫ

1. НЕ используй TG переменные для CTA-кнопок
2. НЕ делай aspect-square на детальных страницах
3. НЕ полагайся только на TG MainButton
4. НЕ показывай пустые категории
5. НЕ забывай кнопку Назад
6. НЕ анимируй layout-свойства
7. НЕ делай touch target < 44px
8. НЕ используй шрифт < 12px
9. НЕ накладывай BottomNav + sticky CTA
10. НЕ забывай safe-area-inset-bottom

## 10. ЧЕКЛИСТ "PREMIUM FEEL" (ВСЕ ПУНКТЫ ПРИМЕНЕНЫ в коммите design-polish)

- [x] Весь текст >= 12px, инпуты = 16px
- [ ] Touch targets >= 44px
- [ ] CTA = emerald-500/white
- [ ] active: state на всех тап-элементах
- [ ] safe-area-inset-bottom на sticky-элементах
- [ ] BottomNav скрыт где есть CTA
- [ ] Кнопка Назад видна
- [ ] Пустые категории скрыты
- [ ] px-4 горизонтальный отступ
- [ ] rounded-xl на карточках
- [ ] Анимации: вход 200ms, выход 150ms
- [ ] Контраст >= 4.5:1
- [ ] Skeleton для загрузки > 1с

---

## 11. ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ (Kie.ai MCP)

### Когда использовать
- Создание UI мокапов для презентации / согласования
- Генерация скриншотов экранов приложения
- Визуализация новых фич до реализации

### Инструмент
- MCP Tool: `mcp__kie-ai__generate_image`
- Модель: Nano Banana Pro (Google Gemini 3 Pro Image)
- Выход: `public/showcase/screens/`

### Экраны Столовой Огромнов

| # | Экран | Файл | Описание |
|---|---|---|---|
| 1 | Меню | 01-menu.jpg | Сетка блюд с табами категорий |
| 2 | Детали блюда | 02-item-detail.jpg | Фото, описание, кнопка "Добавить" |
| 3 | Корзина | 03-cart.jpg | Список заказа, итого, кнопка "Оформить" |
| 4 | Оформление | 04-checkout.jpg | Кабинет, время, способ оплаты |
| 5 | Успех заказа | 05-order-success.jpg | Статус-степпер с 5 шагами |
| 6 | Мои заказы | 06-orders.jpg | Список предыдущих заказов |
| 7 | Профиль | 07-profile.jpg | Данные пользователя |
| 8 | Талоны | 08-talons.jpg | Подписки и талоны на питание |

### Шаблон промпта

```
A high-fidelity mobile app screenshot, [ОПИСАНИЕ_ЭКРАНА],
light theme corporate canteen food ordering app,
white background with soft gray cards,
emerald green (#10b981) accent color for CTA buttons,
white text on emerald buttons,
clean modern iOS-style design, Telegram Mini App,
Russian text UI, Cyrillic typography,
tab bar at bottom with 4 icons (Меню, Заказы, Талоны, Профиль),
rounded corners (12px), subtle shadows,
portrait phone screen 9:16 ratio,
professional UI/UX design, Dribbble quality,
food delivery app aesthetic
```

### Правила промптов

1. **Конкретные UI элементы** — кнопки, карточки, иконки, текст
2. **Реальный русский текст** — "Борщ с говядиной", "Оформить заказ", "₽"
3. **Описание layout** — "top tab bar", "2-column grid", "sticky bottom CTA"
4. **Цвета проекта** — emerald (#10b981) для CTA, белый фон, серые карточки
5. **Контекст** — "Telegram Mini App header at top"
6. **НЕ писать** "AI generated", "mockup" — описывай как реальный скриншот

### Пример промпта: Меню

```
A high-fidelity mobile app screenshot of a food ordering menu screen,
white background, Telegram Mini App header at very top,
horizontal scrollable category tabs: "Бизнес-ланч", "Салаты", "Супы", "Горячее", "Гарниры", "Напитки",
active tab has emerald-500 underline,
2-column card grid with food photos,
each card: food photo at top (3:2 ratio), dish name "Борщ с говядиной" in dark text,
weight "350 г" in gray, full-width emerald green button with price "190 ₽",
bottom tab bar: Меню (active, emerald), Заказы, Талоны, Профиль,
clean modern iOS design, Russian text, portrait 9:16,
corporate canteen food ordering app, professional quality
```

### Пример промпта: Оформление заказа

```
A high-fidelity mobile app screenshot of a checkout screen,
white background, native back arrow button at top left,
header "Оформление заказа",
order summary section: 3 items with names, quantities and prices in rubles,
total "Итого: 570 ₽" in bold,
form section: room/office selector "Кабинет 204" with dropdown icon,
delivery time chips in a row: "12:00", "12:30", "13:00" (one selected in emerald),
payment method: radio buttons "Картой онлайн" (selected) and "Наличные",
comment field placeholder "Комментарий к заказу...",
sticky bottom emerald green button "Оплатить 570 ₽" full width,
clean modern iOS design, Russian text, portrait 9:16
```

### Процесс генерации

```
1. Вызвать mcp__kie-ai__generate_image:
   - prompt: промпт из шаблона
   - filename: "01-menu" (с номером)
   - aspect_ratio: "9:16"
2. Подождать ~30-60 сек
3. Проверить результат
4. Если качество плохое → перегенерировать с уточнённым промптом
5. После всех экранов → собрать HTML-галерею
```

### HTML-галерея

После генерации создать `public/showcase/index.html`:
- Рамка телефона (CSS iPhone mockup)
- Навигация стрелками + клавиатура + свайп
- Точки-индикаторы
- Подписи экранов на русском
- Тёмный фон
- Без внешних зависимостей (inline CSS/JS)

### Чеклист генерации

- [ ] Все экраны сгенерированы
- [ ] Единый визуальный стиль
- [ ] Русский текст читаем
- [ ] Emerald CTA-кнопки на всех экранах
- [ ] HTML-галерея открывается в браузере
- [ ] Навигация работает (стрелки, клик, клавиатура)
- [ ] Подписи экранов на русском