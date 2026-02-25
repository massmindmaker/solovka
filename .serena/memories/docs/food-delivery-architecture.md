# Архитектура систем доставки еды — Research Notes

Источник: foodtech.folio3.com, medium.com, sidekickinteractive.com

## Ключевые компоненты production food delivery

### Для нашего масштаба (столовая ~200 чел) — используем:
| Компонент | Production | Solovka MVP |
|-----------|-----------|------------|
| API Gateway | Kong / AWS API GW | Vercel Edge Routing |
| Order Management | Dedicated microservice | Single Express handler |
| Catalog/Menu | NoSQL + Elasticsearch | PostgreSQL (Neon) |
| Payments | Stripe/PayPal SDK | T-Bank эквайринг |
| Notifications | FCM/APNs + WebSocket | Telegram Bot API |
| Caching | Redis (200M ops/sec) | Neon (встроенный кэш PG) |
| Queue | Kafka / RabbitMQ | Vercel Cron + sync ops |
| Tracking | GPS + WebSocket | Не нужно (самовывоз/доставка по расписанию) |
| Analytics | Snowflake/BigQuery | PostgreSQL (простые запросы) |

## Когда добавлять Redis (НЕ нужно сейчас)
- При >1000 одновременных пользователей
- Если нужен real-time чат/статус заказа
- Если меню меняется очень часто (кэш TTL)
- Для rate limiting на уровне IP

## Когда добавлять очереди (НЕ нужно сейчас)
- Если рассылка уведомлений >1000 получателей (блокирует webhook)
- Если нужна гарантированная доставка сообщений с retry
- Если нужна обработка платежей в фоне (для нас T-Bank делает сам)

## Паттерны применённые в MVP

### Idempotency
- OrderId = UUID (уникальный, T-Bank не создаст дубль)
- Webhook обработка: проверять статус перед обновлением

### State Machine для заказа
```
pending → paid → preparing → ready → delivered
                    ↓
                cancelled
```

### Snapshot цены при заказе
- `order_items.price_kopecks` = цена на момент заказа (не меняется)
- `order_items.item_name` = название на момент заказа
- Это защищает от изменения цен после оформления

### Soft delete
- `menu_items.available = false` вместо DELETE
- Сохраняет историческую целостность заказов

## Безопасность платежей (PCI DSS упрощённо)
- НЕ хранить данные карт — T-Bank делает всё на своей стороне
- Верифицировать каждый webhook через Token (SHA-256)
- Хранить только PaymentId и статус (не PAN, не CVV)
- Использовать HTTPS везде (Vercel даёт автоматически)

## Order End-to-End flow (адаптировано)
1. User выбирает блюда → корзина
2. Оформление: кабинет, время, комментарий
3. Выбор оплаты: карта / талон / подписка
4. Создание заказа в БД (status=pending)
5. Если карта → T-Bank Init → PaymentURL
6. T-Bank обрабатывает → Webhook → status=paid
7. Бот уведомляет пользователя
8. Бот уведомляет администратора/кухню
9. Кухня готовит → (опционально) меняет статус через admin
10. Доставка → status=delivered
