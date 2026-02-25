# T-Bank (Тинькофф) — Эквайринг API

Источник: https://developer.tbank.ru/eacq/intro/connection
Dev portal: https://developer.tbank.ru

## Способ интеграции для нашего проекта
**Редирект на платежную форму банка** — вызов `/v2/Init` → получение `PaymentURL` → открытие в браузере.

Подходит: самописный сайт / Mini App (через `openLink` из @tma.js/sdk).

---

## Инициация платежа — POST /v2/Init

**URL:** `https://securepay.tinkoff.ru/v2/Init`
**Content-Type:** `application/json`

### Обязательные параметры

| Параметр | Тип | Ограничения | Описание |
|---------|-----|-------------|---------|
| `TerminalKey` | string | max 20 | ID терминала от Т-Бизнеса |
| `Amount` | number | max 10 цифр | Сумма в **копейках** (100 руб = 10000) |
| `OrderId` | string | max 36 | Уникальный ID заказа (UUID рекомендуется) |
| `Token` | string | — | SHA-256 подпись запроса |

### Важные опциональные параметры

| Параметр | Описание |
|---------|---------|
| `Description` | Описание заказа (max 140 симв, **обязательно для СБП**) |
| `CustomerKey` | ID клиента — для сохранения карты |
| `Recurrent = "Y"` | Сохранить карту (вернёт `RebillId` для рекуррентов) |
| `NotificationURL` | Webhook URL для этого платежа (переопределяет дефолтный) |
| `SuccessURL` | Редирект после успешной оплаты |
| `FailURL` | Редирект после неудачной оплаты |
| `RedirectDueDate` | Срок действия ссылки (формат: `YYYY-MM-DDTHH24:MI:SS+GMT`) |
| `DATA` | Доп. метаданные key-value (max 20 пар, ключ max 20 симв, значение max 100) |
| `Receipt` | Кассовый чек (**обязательно если подключена онлайн-касса**) |
| `Language` | `ru` или `en` (по умолчанию `ru`) |

### Пример запроса

```typescript
const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    TerminalKey: process.env.TBANK_TERMINAL_KEY,
    Amount: 35000, // 350 рублей
    OrderId: 'order-uuid-here',
    Description: 'Заказ из столовой Solovka',
    NotificationURL: `${process.env.APP_URL}/api/payment/webhook`,
    SuccessURL: `${process.env.APP_URL}/order-success`,
    FailURL: `${process.env.APP_URL}/order-fail`,
    Token: generateToken({ ... }),
  }),
});
const data = await response.json();
// data.PaymentURL — ссылка для оплаты
```

### Ответ Init

```typescript
interface TBankInitResponse {
  Success: boolean;
  ErrorCode: string;       // "0" = успех
  TerminalKey: string;
  Status: string;          // "NEW"
  PaymentId: string;       // ID платежа в T-Bank (сохранить в БД!)
  OrderId: string;
  Amount: number;          // в копейках
  PaymentURL: string;      // редиректить пользователя сюда
  Message?: string;        // описание ошибки если ErrorCode != "0"
}
```

---

## Генерация Token (подпись запроса)

```typescript
import crypto from 'crypto';

function generateToken(params: Record<string, string | number>, password: string): string {
  // 1. Добавить пароль терминала
  const allParams = { ...params, Password: password };

  // 2. Исключить сложные объекты (Receipt, DATA и вложенные)
  const flat = Object.entries(allParams)
    .filter(([, v]) => typeof v !== 'object')
    .sort(([a], [b]) => a.localeCompare(b));

  // 3. Конкатенировать только значения
  const str = flat.map(([, v]) => String(v)).join('');

  // 4. SHA-256
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}
```

---

## Webhook — уведомление о статусе платежа

T-Bank делает **POST** запрос на `NotificationURL` при каждом изменении статуса.

### Поля webhook payload

| Поле | Описание |
|------|---------|
| `TerminalKey` | ID терминала |
| `OrderId` | Ваш ID заказа |
| `PaymentId` | ID платежа T-Bank |
| `Status` | Статус: `AUTHORIZED`, `CONFIRMED`, `REJECTED`, `REFUNDED` |
| `Success` | true/false |
| `Amount` | Сумма в копейках |
| `ErrorCode` | "0" = успех |
| `Token` | Подпись для верификации |
| `Pan` | Маскированный номер карты (`200000******0000`) |
| `CardId` | ID сохранённой карты |
| `RebillId` | ID для рекуррентных платежей |

### Верификация и обработка webhook

```typescript
// backend/api/payment/webhook.ts
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const payload = req.body;

  // 1. Верифицировать Token
  const receivedToken = payload.Token;
  const expectedToken = generateToken(
    { ...payload, Token: undefined },
    process.env.TBANK_TERMINAL_PASSWORD
  );

  if (receivedToken !== expectedToken) {
    console.error('Invalid T-Bank webhook token');
    return res.status(200).send('OK'); // всегда 200, иначе будет retry
  }

  // 2. Обработать статус
  if (payload.Status === 'CONFIRMED' && payload.Success) {
    await db.query(
      `UPDATE orders SET status = 'paid', tbank_payment_id = $1 WHERE id = $2`,
      [payload.PaymentId, payload.OrderId]
    );
    // Уведомить пользователя через бота
    await bot.sendMessage(userId, '✅ Оплата получена! Ваш заказ принят.');
    // Уведомить администратора
    await bot.sendMessage(ADMIN_CHAT_ID, `Новый оплаченный заказ #${payload.OrderId}`);
  }

  // 3. ОБЯЗАТЕЛЬНО ответить "OK" (HTTP 200, plain text)
  res.status(200).send('OK');
}
```

### Retry логика T-Bank
- Если не получен HTTP 200 с телом `OK` → повтор каждый час в течение 24ч
- Затем раз в сутки в течение месяца
- **Всегда возвращать 200 OK**, даже если ошибка (логировать внутри)

---

## Статусы платежа

| Статус | Описание |
|--------|---------|
| `NEW` | Создан, ждёт оплаты |
| `FORM_SHOWED` | Форма оплаты открыта |
| `AUTHORIZING` | Авторизация |
| `AUTHORIZED` | Авторизован (при двухэтапной оплате) |
| `CONFIRMING` | Подтверждение |
| `CONFIRMED` | ✅ Оплачен успешно |
| `REJECTED` | ❌ Отклонён |
| `REFUNDED` | Возвращён |
| `PARTIAL_REFUNDED` | Частичный возврат |
| `REVERSED` | Отменён |

---

## Полный флоу для Mini App

```
1. User нажимает "Оплатить" в Mini App
2. Frontend → POST /api/payment/init { orderId, amount }
3. Backend:
   a. Создать запись в payments (status=PENDING)
   b. POST https://securepay.tinkoff.ru/v2/Init
   c. Сохранить PaymentId
   d. Вернуть { paymentUrl } фронтенду
4. Frontend → openLink(paymentUrl) через @tma.js/sdk
5. User оплачивает на странице T-Bank
6. T-Bank → POST /api/payment/webhook
7. Backend:
   a. Верифицировать Token
   b. Если CONFIRMED → orders.status = 'paid'
   c. Уведомить пользователя через бота
   d. Уведомить администратора
   e. Ответить HTTP 200 "OK"
```

---

## Среды тестирования

- **Тестовая среда:** `https://rest-api-test.tinkoff.ru/v2/`
- Тестовые терминалы выдаются при подключении к Т-Бизнесу
- Тестовые карты: предоставляются в личном кабинете

## Подключение
- Заключить договор с Т-Бизнесом на интернет-эквайринг
- Получить `TerminalKey` и `TerminalPassword`
- Настроить Webhook URL в личном кабинете
