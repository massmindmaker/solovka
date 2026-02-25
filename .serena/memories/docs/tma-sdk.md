# Telegram Mini Apps — SDK & Platform Documentation

Источник: https://docs.telegram-mini-apps.com

## Что такое Mini App
- Обычное веб-приложение (HTML/CSS/JS), отображаемое в WebView внутри Telegram
- Требует создания Telegram Bot (нельзя без бота)
- Нужен HTTPS — на Vercel автоматически
- Поддерживается: Android, iOS, macOS, Desktop, Web A/K

## Установка SDK

```bash
npm i @tma.js/sdk
# React-обёртка:
npm i @tma.js/sdk-react
# Для валидации initData на сервере:
npm i @tma.js/init-data-node
```

---

## Init Data (Аутентификация пользователя)

### Что это
Init data — набор данных о пользователе, передаваемых при запуске Mini App.
Подписаны секретным ключом бота → можно верифицировать на сервере.

### Получение на фронтенде
```typescript
import { retrieveLaunchParams, retrieveRawInitData } from '@tma.js/sdk';

// Полный объект
const { tgWebAppData: initData } = retrieveLaunchParams();

// Raw строка для отправки на сервер
const initDataRaw = retrieveRawInitData();
```

### Отправка на сервер
```typescript
fetch('/api/orders', {
  method: 'POST',
  headers: {
    Authorization: `tma ${initDataRaw}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(orderData),
});
```

### Валидация на сервере (Node.js)
```typescript
import { validate, parse } from '@tma.js/init-data-node';

// Middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization; // "tma <raw>"
  if (!auth?.startsWith('tma ')) return res.status(401).json({ error: 'Unauthorized' });

  const rawInitData = auth.slice(4);
  try {
    validate(rawInitData, process.env.BOT_TOKEN);  // бросает если невалидно
    const initData = parse(rawInitData);
    req.user = initData.user;  // { id, first_name, last_name, username, ... }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid init data' });
  }
}
```

### Алгоритм валидации (вручную)
1. Распарсить init data как query string
2. Исключить `hash`, остальные → `key=value`, сортировать по ключу
3. Соединить символом `\n` → data_check_string
4. `secret = HMAC-SHA256(botToken, "WebAppData")`
5. `hash = HMAC-SHA256(data_check_string, secret)` → hex
6. Сравнить с `hash` из init data
7. Проверить `auth_date` (не старше N минут)

### Поля объекта User
```typescript
interface TMAUser {
  id: number;           // Telegram user ID
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}
```

### Поля Init Data
| Поле | Тип | Описание |
|------|-----|---------|
| auth_date | number | Unix timestamp создания (проверять актуальность) |
| hash | string | Подпись данных |
| user | User | Текущий пользователь |
| query_id | string? | Для answerWebAppQuery |
| start_param | string? | Параметр из deep link |

---

## Инициализация приложения

```typescript
import { init, miniApp, viewport } from '@tma.js/sdk';

// Обязательно при старте
init();

// Уведомить Telegram что приложение готово (убрать лоадер)
miniApp.ready();

// Развернуть на весь экран
viewport.mount();
await viewport.requestFullscreen(); // или:
miniApp.expand(); // expand viewport
```

---

## Main Button (кнопка внизу экрана)

```typescript
import { mainButton } from '@tma.js/sdk';

// Показать кнопку
mainButton.show();
mainButton.setText('Оформить заказ');
mainButton.enable();

// Показать лоадер (во время обработки)
mainButton.showLoader();
mainButton.disable();

// Скрыть
mainButton.hide();

// Обработчик нажатия
const off = mainButton.onClick(() => {
  // обработать нажатие
  off(); // удалить listener
});
```

---

## Back Button

```typescript
import { backButton } from '@tma.js/sdk';

// Показать кнопку назад
backButton.show();

const off = backButton.onClick(() => {
  off();
  window.history.back();
});

// Скрыть
backButton.hide();
```

---

## Haptic Feedback (вибрация)

```typescript
import { hapticFeedback } from '@tma.js/sdk';

// Лёгкий удар (нажатие кнопки)
hapticFeedback.impactOccurred('light');   // light | medium | heavy | rigid | soft

// Уведомление (успех/ошибка)
hapticFeedback.notificationOccurred('success');   // success | error | warning

// Смена выбора
hapticFeedback.selectionChanged();
```

---

## Тема (Theme)

```typescript
import { themeParams } from '@tma.js/sdk';

// CSS-переменные (устанавливаются Telegram автоматически)
// --tg-theme-bg-color
// --tg-theme-text-color
// --tg-theme-hint-color
// --tg-theme-link-color
// --tg-theme-button-color
// --tg-theme-button-text-color
// --tg-theme-secondary-bg-color

// В CSS:
// body { background: var(--tg-theme-bg-color); }
```

---

## Открытие ссылок

```typescript
import { openLink, openTelegramLink } from '@tma.js/sdk';

// Открыть внешнюю ссылку в браузере
openLink('https://example.com');

// Открыть Telegram-ссылку (t.me/...)
openTelegramLink('t.me/username');
```

---

## Popup (нативный диалог)

```typescript
import { popup } from '@tma.js/sdk';

const buttonId = await popup.open({
  title: 'Подтверждение',
  message: 'Оформить заказ на сумму 350 ₽?',
  buttons: [
    { id: 'confirm', type: 'default', text: 'Оформить' },
    { id: 'cancel', type: 'cancel' },
  ],
});

if (buttonId === 'confirm') {
  // подтверждено
}
```

---

## Closing Behavior

```typescript
import { closingBehavior } from '@tma.js/sdk';

// Спросить подтверждение перед закрытием (если есть несохранённые данные)
closingBehavior.enableConfirmation();
closingBehavior.disableConfirmation();
```

---

## Viewport и Safe Area

```typescript
import { viewport, safeAreaInsets, contentSafeAreaInsets } from '@tma.js/sdk';

viewport.mount();
// viewport.height — текущая высота (может меняться)
// viewport.stableHeight — стабильная высота (используй для layout)
// viewport.isExpanded — развёрнут ли

// Safe area (чтобы не залезать под нотч/бар)
safeAreaInsets.mount();
// safeAreaInsets.top, .bottom, .left, .right

// CSS:
// padding-bottom: env(safe-area-inset-bottom);
```

---

## Telegram Payments через Mini App

Для нашего проекта используем **T-Bank эквайринг** (не Telegram Stars).
Флоу: получить PaymentURL от T-Bank → открыть через `openLink()`.

```typescript
// Открыть страницу оплаты T-Bank
import { openLink } from '@tma.js/sdk';
openLink(paymentUrl);
```

---

## Доступные платформы
```typescript
import { retrieveLaunchParams } from '@tma.js/sdk';
const { tgWebAppPlatform } = retrieveLaunchParams();
// 'android' | 'ios' | 'macos' | 'tdesktop' | 'weba' | 'web' | 'unknown'
```

---

## Важные события платформы (низкий уровень)

Используй `@tma.js/sdk` вместо прямого postMessage, но для справки:

| Событие | Описание |
|---------|---------|
| `main_button_pressed` | Нажата главная кнопка |
| `back_button_pressed` | Нажата кнопка назад |
| `invoice_closed` | Инвойс закрыт (paid/failed/cancelled) |
| `viewport_changed` | Изменился размер viewport |
| `theme_changed` | Изменилась тема |
| `popup_closed` | Закрыт popup (button_id) |

---

## Настройка BotFather

1. Создать бота: `/newbot`
2. Получить токен: `BOT_TOKEN`
3. Создать Mini App: `/newapp` (указать HTTPS URL фронтенда)
4. Или: `/setmenubutton` — добавить кнопку меню открывающую Mini App

## Тестирование локально
- Нужен HTTPS туннель: `npx localtunnel --port 5173` или ngrok
- Или деплоить на Vercel Preview (каждый push создаёт preview URL)
- В режиме разработки можно мокать `window.Telegram.WebApp`
