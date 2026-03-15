# Flprog WebUI Edit

Автономное приложение для редактирования интерфейса:

- конструктор виджетов;
- настройка canvas и tabs;
- генерация `.ino` и `.ubi`.

## Запуск

```bash
npm install
npm start
```

## Сборка

```bash
npm run build
```

## Симулятор ESP (эмулятор устройства)

Симулятор — HTTP-сервер с эндпоинтами как у прошивки Flprog WebServer. Запуск:

```bash
npm run simulator
```

Сервер слушает порт 31337 (или `SIMULATOR_PORT`). Из редактора: **Generate Code → Отправить в симулятор**. Просмотрщик подключается к `http://localhost:31337`.

### Сборка симулятора в exe (Windows)

Чтобы раздавать симулятор одним файлом без установки Node.js:

```bash
npm install
npm run build:simulator-exe
```

Готовый файл: `dist/FlprogSimulator.exe`. Запуск exe равносилен `node server/simulatorServer.js` (порт по умолчанию 31337, переопределяется переменной окружения `SIMULATOR_PORT`).
