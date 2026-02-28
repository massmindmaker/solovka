# Task Completion Checklist — Solovka

## После каждой задачи выполнить:

### 1. TypeScript (фронтенд)
```powershell
cd frontend && npx tsc --noEmit
```

### 2. Сборка
```powershell
cd frontend && npm run build
```

### 3. Линтинг (если настроен)
```powershell
cd frontend && npm run lint
```

### 4. Git
```powershell
git add .
git commit -m "feat/fix/refactor: описание"
git push
```

---

## Чеклист перед деплоем в Production

- [ ] tsc --noEmit clean
- [ ] npm run build clean
- [ ] .env переменные в Vercel Dashboard
- [ ] Webhook T-Bank → production URL
- [ ] Telegram Bot webhook → production URL
- [ ] DB миграция применена к Neon
- [ ] Seed данные загружены
- [ ] CORS настроен на APP_URL

## Проверка после деплоя

1. Открыть Mini App через бота
2. web_app_ready → нет зависшего лоадера
3. Меню загружается (GET /api/menu)
4. Создать тестовый заказ
5. T-Bank оплата (test terminal)
6. Webhook (T-Bank → /api/payment/webhook)
7. Telegram уведомление
8. Cron (/api/cron/daily-menu вручную)

## Решение типичных проблем

| Проблема | Решение |
|----------|---------|
| Белый экран Mini App | Проверить HTTPS URL в BotFather, `miniApp.ready()` |
| initData не валидируется | BOT_TOKEN совпадает с ботом Mini App |
| T-Bank webhook не приходит | HTTPS + HTTP 200 "OK" |
| Neon timeout | Pooled connection string (-pooler) |
| oklch() прозрачные цвета | @theme hex overrides в index.css |
| Кнопки невидимы | Проверить CSS layers (стили вне @layer) |
| Изображения 0px | Absolute positioning, не flex |
