# Task Completion Checklist — Solovka

## После каждой задачи выполнить:

### 1. TypeScript
```powershell
# Фронтенд
cd frontend && npx tsc --noEmit

# Бэкенд
cd backend && npx tsc --noEmit
```

### 2. Линтинг
```powershell
# Фронтенд
cd frontend && npm run lint

# Бэкенд
cd backend && npm run lint
```

### 3. Сборка (если затронут фронтенд)
```powershell
cd frontend && npm run build
```

### 4. Проверить API вручную
```powershell
# Запустить vercel dev и протестировать endpoint
npx vercel dev

# Тест через curl (пример)
curl http://localhost:3000/api/menu \
  -H "Authorization: tma <test_init_data>"
```

### 5. Git
```powershell
git status
git add .
git commit -m "feat/fix/refactor: описание изменения"
git push
```

---

## Чеклист перед деплоем в Production

- [ ] Все TypeScript ошибки исправлены (`tsc --noEmit`)
- [ ] Линтер не выдаёт ошибок
- [ ] `npm run build` во фронтенде проходит без ошибок
- [ ] `.env` переменные добавлены в Vercel Dashboard
- [ ] Webhook T-Bank настроен на production URL
- [ ] Telegram Bot webhook установлен на production URL
- [ ] Схема БД применена на Neon (`schema.sql`)
- [ ] Seed данные добавлены (категории, тестовые блюда)
- [ ] CRON_SECRET установлен и добавлен в vercel.json cron config
- [ ] CORS настроен на правильный APP_URL

---

## Проверка после деплоя

1. Открыть Mini App через бота в Telegram
2. Убедиться что `web_app_ready` срабатывает (нет зависшего лоадера)
3. Проверить загрузку меню (GET /api/menu)
4. Создать тестовый заказ
5. Проверить T-Bank форму оплаты (test terminal)
6. Проверить webhook (T-Bank → /api/payment/webhook)
7. Проверить уведомление в Telegram
8. Проверить ежедневную рассылку (запустить /api/cron/daily-menu вручную)

---

## Решение типичных проблем

### Mini App не открывается / белый экран
- Проверить что URL в BotFather указан правильно (HTTPS)
- Проверить консоль браузера (dev tools в Telegram Desktop)
- Убедиться что `miniApp.ready()` вызывается после загрузки

### initData не валидируется
- Проверить что BOT_TOKEN в .env совпадает с тем, от которого Mini App
- В разработке — мокать initData или использовать Vercel Preview URL

### T-Bank webhook не приходит
- Проверить NotificationURL в запросе к /v2/Init
- URL должен быть HTTPS и доступен публично
- Проверить что возвращаем HTTP 200 с телом "OK"

### Neon connection timeout
- Использовать pooled connection string (с -pooler)
- Не создавать connection на уровне модуля — создавать в handler
