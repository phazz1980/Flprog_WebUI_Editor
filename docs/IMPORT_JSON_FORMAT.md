# JSON-формат данных для импорта (код по секциям, параметрам, входам и выходам)

Формат предназначен для импорта «готового» кода в редактор с разбивкой на:
- **секции** — именованные блоки кода (setup, loop, обработчики и т.д.);
- **параметры** — настраиваемые величины (порт, таймаут и т.п.);
- **входы** — переменные, приходящие с устройства в UI (LED, метки, значения слайдеров/переключателей);
- **выходы** — переменные, отправляемые из UI на устройство (кнопки, установки слайдеров, сброс аварии).

---

## Корневая структура

```json
{
  "version": 1,
  "meta": { ... },
  "parameters": [ ... ],
  "inputs": [ ... ],
  "outputs": [ ... ],
  "sections": [ ... ],
  "ui": { ... }
}
```

- **version** (обязательно) — целое число, версия формата (сейчас `1`).
- **meta** (опционально) — метаданные проекта/шаблона.
- **parameters** — массив параметров (например, порт сервера).
- **inputs** — массив входных переменных (с МК в UI).
- **outputs** — массив выходных переменных (из UI на МК).
- **sections** — массив секций кода.
- **ui** (опционально) — состояние редактора (виджеты, вкладки, канва) для полного импорта проекта.

---

## 1. Параметры (`parameters`)

Параметры — величины, задаваемые в коде один раз (константы конфигурации).

| Поле      | Тип    | Обязательно | Описание |
|-----------|--------|-------------|----------|
| name      | string | да          | Имя переменной (например `port`). |
| type      | string | да          | Тип: `int`, `byte`, `float`, `bool`, `String`. |
| default   | string | да          | Значение по умолчанию (как в коде, например `"80"`). |
| parName   | string | нет         | Имя/метка параметра (например для комментария в коде). |

**Пример:**

```json
"parameters": [
  { "name": "port", "type": "int", "default": "8080", "parName": "par" },
  { "name": "info_port", "type": "int", "default": "80", "parName": "par2" }
]
```

В сгенерированном коде это может соответствовать: `int port=8080; //par`, `int info_port=80; //par2`.

---

## 2. Входы (`inputs`)

Входы — переменные, которые устройство передаёт в веб-интерфейс (состояние LED, меток, значение слайдера/переключателя «с устройства» и т.д.).

| Поле      | Тип    | Обязательно | Описание |
|-----------|--------|-------------|----------|
| varName   | string | да          | Имя переменной (например `led1`, `slider1_in`). |
| type      | string | да          | Тип: `int`, `byte`, `float`, `bool`, `String`. |
| inName    | string | нет         | Имя/метка входа (например для комментария в коде). |

**Пример:**

```json
"inputs": [
  { "varName": "led1", "type": "bool", "inName": "in" },
  { "varName": "slider1_in", "type": "int", "inName": "in" }
]
```

---

## 3. Выходы (`outputs`)

Выходы — переменные, которые веб-интерфейс отправляет на устройство (нажатие кнопки, установка слайдера/переключателя, сброс аварии и т.д.).

| Поле      | Тип    | Обязательно | Описание |
|-----------|--------|-------------|----------|
| varName   | string | да          | Имя переменной (например `btn1`, `slider1_out`, `alarm_reset`). |
| type      | string | да          | Тип: `int`, `byte`, `float`, `bool`, `String`. |
| outName   | string | нет         | Имя/метка выхода (например для комментария в коде). |

**Пример:**

```json
"outputs": [
  { "varName": "btn1", "type": "bool", "outName": "out" },
  { "varName": "slider1_out", "type": "int", "outName": "out" },
  { "varName": "alarm_reset", "type": "bool", "outName": "out" }
]
```

---

## 4. Секции кода (`sections`)

Секции — именованные фрагменты кода (заголовки, setup, loop, обработчики HTTP и т.д.). **Код из `loop`, `handleRoot` и остальных частей скетча лежит именно здесь:** у каждой секции поле **`code`** содержит полный текст этого фрагмента (включая объявление функции). При сборке файла секции склеиваются в заданном порядке.

| Поле      | Тип    | Обязательно | Описание |
|-----------|--------|-------------|----------|
| id        | string | да          | Уникальный идентификатор секции (например `includes`, `setup`, `loop`, `handleRoot`, `handleConfig`, `handleSetVar`, `handleState`, `handlePing`, `handle404`). |
| name      | string | нет         | Человекочитаемое название. |
| code      | string | да          | Текст кода (переносы строк — `\n`). |

**Рекомендуемые идентификаторы секций** (соответствуют текущему генератору):

| id           | Описание |
|--------------|----------|
| includes     | Подключение библиотек и препроцессор. |
| globals      | Глобальные переменные (объявления). |
| setup        | Функция `setup()`. |
| loop         | Функция `loop()`. |
| handleApiRootHint | Корень порта API (короткий текст; полная справка на `info_port`). |
| handleRoot   | HTML-справка на порту `info_port` (80 по умолчанию). |
| handleConfig | Обработчик `/config`. |
| handleSetVar | Обработчик `/set`. |
| handleState  | Обработчик `/state`. |
| handlePing   | Обработчик `/ping`. |
| handle404    | Обработчик 404. |

**Пример (включая код `loop` и `handleRoot`):**

```json
"sections": [
  {
    "id": "includes",
    "name": "Подключения",
    "code": "/* @once */\n#include \"flprogWebServer.h\"\n"
  },
  {
    "id": "setup",
    "name": "Инициализация",
    "code": "void setup() {\n  Serial.begin(115200);\n  WebServer.addHandler(\"/\", handleRoot);\n}\n"
  },
  {
    "id": "loop",
    "name": "Цикл",
    "code": "void loop() {\n  WebServer.pool();\n}\n"
  },
  {
    "id": "handleRoot",
    "name": "Главная страница",
    "code": "void handleRoot(FLProgWebServer *server) {\n  server->print(\"HTTP/1.1 200 OK\\r\\n\");\n  server->print(\"Content-Type: text/html\\r\\n\\r\\n\");\n  server->print(\"<h1>ESP32 Web UI</h1>\");\n}\n"
  }
]
```

При импорте приложение может подставлять в секции объявления переменных из `parameters`, `inputs`, `outputs` и собирать итоговый скетч из `sections` в заданном порядке.

---

## 5. Метаданные (`meta`)

| Поле        | Тип    | Описание |
|-------------|--------|----------|
| name        | string | Название проекта или шаблона. |
| description | string | Краткое описание. |
| author      | string | Автор. |
| createdAt   | string | Дата создания (например ISO 8601). |

**Пример:**

```json
"meta": {
  "name": "Базовый Web UI",
  "description": "Шаблон с кнопкой и LED",
  "author": "",
  "createdAt": "2025-03-17T12:00:00.000Z"
}
```

---

## 6. Состояние UI (`ui`) — опционально

Если нужно импортировать не только код, но и раскладку редактора (виджеты, вкладки, канва), используется объект `ui`. Его структура совместима с типами редактора (`Widget[]`, `Tab[]`, `canvasConfig`).

| Поле   | Тип   | Описание |
|--------|-------|----------|
| widgets       | array | Массив виджетов (см. типы `Widget` в `src/types.ts`). |
| tabs          | array | Массив вкладок `{ id, name }`. |
| canvasConfig  | object | `{ width, height, color }`. |
| activeTabId   | string | Идентификатор активной вкладки. |

**Пример (минимальный):**

```json
"ui": {
  "widgets": [
    {
      "id": "btn_1",
      "type": "button",
      "x": 50,
      "y": 50,
      "width": 120,
      "height": 40,
      "text": "OK",
      "color": "#3b82f6",
      "varName": "btn_1",
      "varType": "bool",
      "tabId": "tab_1"
    }
  ],
  "tabs": [{ "id": "tab_1", "name": "Вкладка 1" }],
  "canvasConfig": { "width": 320, "height": 480, "color": "#ffffff" },
  "activeTabId": "tab_1"
}
```

---

## Полный пример (только код: параметры, входы, выходы, секции)

```json
{
  "version": 1,
  "meta": {
    "name": "Минимальный Web UI",
    "description": "Одна кнопка и один LED"
  },
  "parameters": [
    { "name": "port", "type": "int", "default": "8080", "parName": "par" },
    { "name": "info_port", "type": "int", "default": "80", "parName": "par2" }
  ],
  "inputs": [
    { "varName": "led1", "type": "bool", "inName": "in" }
  ],
  "outputs": [
    { "varName": "btn1", "type": "bool", "outName": "out" }
  ],
  "sections": [
    {
      "id": "includes",
      "name": "Подключения",
      "code": "/* @once */\n#include \"flprogWebServer.h\"\n\nint port = 80;\nbool btn1;\nbool led1;\n\nvoid setup() {\n  Serial.begin(115200);\n  WebServer.addHandler(\"/\", handleRoot);\n  WebServer.addHandler(\"/config\", handleConfig);\n  WebServer.addHandler(\"/set\", handleSetVar);\n  WebServer.addHandler(\"/state\", handleState);\n}\n\nvoid loop() {\n  WebServer.pool();\n}\n"
    },
    {
      "id": "handleRoot",
      "code": "void handleRoot(FLProgWebServer *server) { server->print(\"OK\"); }\n"
    }
  ]
}
```

Импорт может:
- только подставлять параметры/входы/выходы в шаблон секций;
- или собирать полный скетч из массива `sections` (например, по порядку или по списку id);
- при наличии `ui` — восстанавливать виджеты, вкладки и канву в редакторе.

---

## Порядок секций при сборке кода

Рекомендуемый порядок id при склейке в один файл:

1. `includes`
2. `globals` (или генерация из `parameters` + `inputs` + `outputs`)
3. `setup`
4. `loop`
5. `handleRoot`
6. `handleConfig`
7. `handleSetVar`
8. `handleState`
9. `handlePing`
10. `handle404`

Если в импортируемом JSON секции заданы в другом порядке, сборщик может сортировать по этому списку или использовать явный порядок из поля (например `order` в каждой секции), если он будет добавлен в формате.

---

## Расширения формата (на будущее)

- В секции можно добавить поле **order** (число) для явного порядка вставки.
- Для **parameters** — поле **min/max** или **options** для ограничения значений в UI.
- Для **inputs**/**outputs** — привязка к виджету по **widgetId** для обратной синхронизации с `ui.widgets`.
