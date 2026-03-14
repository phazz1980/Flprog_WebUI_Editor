# Flprog WebUI Viewer

Автономный просмотрщик интерфейса для МК с Flprog WebServer. Подключается по IP и порту, загружает конфиг и состояние с устройства и рисует UI по правилам из `viewer-pack/UI_RENDER_RULES.md`.

## Возможности

- **Левая панель**: поле IP, поле порт, кнопка «Подключиться». Правила сворачивания как в редакторе: на десктопе панель видна, на мобильном скрыта; кнопка ☰ открывает/закрывает панель, × закрывает.
- **Подключение**: по нажатию «Подключиться» запрашивается `GET /config`, разбирается конфиг, затем периодически запрашивается `GET /state?fmt=short`.
- **Отрисовка**: канва и виджеты по правилам Flprog WebUI (только просмотр, без редактирования).
- **Взаимодействие**: кнопки и переключатели отправляют `POST /set?var=...&value=...` при нажатии; слайдер — при перетаскивании.
- **Звук** (по полю `sound_enabled` в состоянии): **уведомление** (1) проигрывается один раз; **тревога** (2) — в цикле до отключения. При активной тревоге звук уведомления не воспроизводится. Кнопка «Выключить тревогу» появляется в панели над канвой при `sound_enabled === 2` и отправляет `POST /set?var=sound_enabled&value=0`.

## Запуск

```bash
cd viewer
npm install
npm start
```

Сборка: `npm run build`. Результат — папка `viewer/build/` со статическими файлами.

## Деплой

1. **Собрать проект:**
   ```bash
   cd viewer
   npm install
   npm run build
   ```
   В папке `build/` появятся `index.html`, `static/` (JS/CSS) и т.д.

2. **Куда залить:**

   - **Вместе с редактором (рекомендуется)**  
     Из корня репозитория: `npm run build:with-viewer` — соберётся редактор и просмотрщик; результат в `build/` (редактор в корне, просмотрщик в `build/viewer/`). Деплой: `npm run deploy:with-viewer` или вручную залейте `build/`. При деплое на GitHub Pages редактор будет по адресу `https://<user>.github.io/Flprog_WebUI_Editor/`, просмотрщик — `https://<user>.github.io/Flprog_WebUI_Editor/viewer/`. Workflow **Deploy Editor and Viewer** при пуше в `main`/`master` делает то же автоматически.
   - **Только просмотрщик на GitHub Pages**  
     Workflow `deploy-viewer.yml` (запуск вручную в Actions) публикует один просмотрщик в корень `gh-pages`.
   - **GitHub Pages (вручную)**  
     Соберите проект, создайте ветку `gh-pages`, залейте в её корень только содержимое `viewer/build/`. В Settings → Pages выберите ветку `gh-pages`, папку root. Если деплой не из корня сайта, добавьте в `viewer/package.json` поле `"homepage": "https://<user>.github.io/Flprog_WebUI_Editor"` и пересоберите.

   - **Netlify**  
     Подключите репозиторий. В настройках сборки укажите:  
     - Build command: `cd viewer && npm run build`  
     - Publish directory: `viewer/build`

   - **Vercel**  
     Импортируйте репо. Root Directory укажите `viewer` (или оставьте корень и задайте Build Command: `cd viewer && npm install && npm run build`, Output Directory: `viewer/build`).

   - **Свой сервер (nginx / Apache / любой хостинг статики)**  
     Загрузите всё содержимое папки `viewer/build/` в каталог сайта. Для SPA настройте перенаправление всех маршрутов на `index.html` (например в nginx: `try_files $uri $uri/ /index.html;`).

После деплоя пользователь открывает URL просмотрщика, вводит IP и порт устройства и нажимает «Подключиться». Устройство должно быть доступно из браузера (то же сетевое окружение или проброс портов).

## Зависимости от родительского репозитория

Логика отрисовки и протокол совпадают с описанием в `../viewer-pack/UI_RENDER_RULES.md`. Файлы `contrastColor.ts` и `viewerConstants.ts` скопированы из `viewer-pack` в `viewer/src/`. Просмотрщик автономен: для работы достаточно папки `viewer` и `npm install` в ней.
