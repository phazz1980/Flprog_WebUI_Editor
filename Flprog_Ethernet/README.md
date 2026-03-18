# Библиотека FLPROG Ethernet

Предназначена для реализации работы по сети Ethernet

## Контактная информация

- Title: `FLPROG Ethernet`
- Authors: [Глушенко Сергей](@Totuin)
- Сайт: [FLProg](http://flprog.ru)
- Почта: [support@flprog.ru](mailto:support@flprog.ru)

## Зависимости

- [Flprog_Utilites](https://github.com/Totuin/Flprog_Utilites)
- [RT_00_HW_BASE](https://github.com/ecoins1994/0010_GitHub_EIS/tree/main/RT_HW_0100_Library)

## Поддерживаемые контроллеры

- **Atmega328**
- **Mega2560**
- **STM32**
- **Raspberry Pi Pico** *(RP 2040)*
- **ESP8266**
- **ESP32**

<br>

# Реализация интерфейсов

## Класс FLProgWiznetInterface

### Конструктор

**Создание интерфейса для работы с чипом W5100 (W5200, W5500)**

- *Шина SPI и пин CS берутся из* **RT_HW_Base.device.spi.busETH** *и* **RT_HW_Base.device.spi.csETH**\*.\*

```c
FLProgWiznetInterface WiznetInterface;
```

- *С непосредственной привязкой пину. Пин CS - 10. Шина SPI берётся из* **RT_HW_Base.device.spi.busETH**\*.\*

```c
FLProgWiznetInterface WiznetInterface(10);
```

- *С непосредственной привязкой пину и шине. Пин CS - 10. Шина SPI - 0.*

```c
FLProgWiznetInterface WiznetInterface(10, 0);
```

### Настройка интерфейса

- *Установка MAC-адреса контроллера. Обязательно вызывается в секции setup().*

```c
// Установка непосредственно числами
WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40);

// Установка путём передачи массива
uint8_t macAddr[6] = {0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40};
WiznetInterface.mac(macAddr);
```

- *Получение текущего MAC-адреса контроллера. Возвращает ссылку на массив из 6 элементов типа* **uint8_t**\*.\*

```c
uint8_t *macAddres = WiznetInterface.mac();
```

- *Задание пина Cs и получение текущего значения этого пина. Может вызываться в любой момент времени.*

```c
// Задание пина
WiznetInterface.setPinCs(10);
  
// Получение номера пина  
int16_t pin = WiznetInterface.pinCs() ;
```

- *Задание номера шины SPI, и получение текущего значение номера шины. Может вызываться в любой момент времени.*

```c
// Задание номера шины
WiznetInterface.setSpiBus(0);

// Получение номера шины
uint8_t bus = WiznetInterface.spiBus()
```

- *Задание и получение значения периода проверки соединения и состояния чипа в миллисекундах. Может вызываться в любой момент времени. Значение по умолчанию - 1000.*

```c
// Задание периода
WiznetInterface.setCheckStatusPeriod(2000);

// Получение периода
uint32_t period = WiznetInterface.checkStatusPeriod();
```

- *Настройка и получение параметров DHCP*

```c
// Задание значения периода попыток пере подключения при отсутствии соединения с DHCP сервером в миллисекундах.
// Может вызываться в любой момент времени.
// Значение по умолчанию - 5000
WiznetInterface.setReconnectionPeriod(6000);

// Получение значения периода попыток пере подключения при отсутствии соединения с DHCP сервером в миллисекундах.
uint32_t period = WiznetInterface.reconnectionPeriod();

// Задание значения таймаута на ответ DHCP сервера после окончания которого будет отправлен повторный запрос, в миллисекундах.
// Может вызываться в любой момент времени.
// Значение по умолчанию - 6000.
WiznetInterface.setResponseDhcpTimeout(2000);

// Получение значения таймаута на ответ DHCP сервера после окончания которого будет отправлен повторный запрос, в миллисекундах.
uint32_t timeout = WiznetInterface.responseDhcpTimeout();

// Задание значения таймаута на весь процесс запроса к серверу DHCP в миллисекундах.
// Может вызываться в любой момент времени
// Значение по умолчанию - 20000.
WiznetInterface.setDhcpTimeout(30000);

// Получение значения таймаута на весь процесс запроса к серверу DHCP в миллисекундах.
uint32_t timeout = WiznetInterface.dhcpTimeout();

// Задание значения периода обновления данных с сервера DHCP в миллисекундах.
// Может вызываться в любой момент времени
// Значение по умолчанию - 1800000.
WiznetInterface.setMaintainPeriod(200000);

// Получение значения периода обновления данных с сервера DHCP в миллисекундах.
uint32_t period = WiznetInterface.maintainPeriod();

// Включение режима получения IP адреса через DHCP 
WiznetInterface.setDhcp();

// Отключение режима получения IP адреса через DHCP 
WiznetInterface.resetDhcp();

// Управление режимом получения IP адреса через DHCP (true - включён, false - выключен)
WiznetInterface.dhcpMode(true);

// Получение текущего состояния режима получения IP адреса через DHCP 
bool mode =  WiznetInterface.isDhcp();
```

- *Доступ к параметрам соединения.*

```c
// Внимание если не отключить режим DHCP то заданные IP адреса при соединении будут заменены полученными от сервера DHCP!

// Задание Ip адреса устройства.
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WiznetInterface.localIP(IPAddress(192, 168, 1, 100));
WiznetInterface.localIP(192, 168, 1, 100);

// Получение IP адреса устройства.
// Возвращает объект класса IPAddress
IPAddress ip = WiznetInterface.localIP();

// Задание Ip адреса DNS сервера.
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WiznetInterface.dns(IPAddress(192, 168, 1, 1));
WiznetInterface.dns(192, 168, 1, 1);

// Получение IP адреса DNS сервера
// Возвращает объект класса IPAddress
IPAddress ip = WiznetInterface.dns();

// Задание Ip адреса шлюза.
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WiznetInterface.gateway(IPAddress(192, 168, 1, 1));
WiznetInterface.gateway(192, 168, 1, 1);

// Получение IP адреса шлюза
// Возвращает объект класса IPAddress
IPAddress ip = WiznetInterface.gateway();

// Задание маски подсети. По умолчанию установлена 255.255.255.0
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WiznetInterface.subnet(IPAddress(255, 255, 255, 0));
WiznetInterface.subnet(255, 255, 255, );

// Получение маски подсети
// Возвращает объект класса IPAddress
IPAddress ip = WiznetInterface.subnet();
```

### Управление интерфейсом

```c
// Цикл работы интерфейса. 
// Обязательно вызывать один раз в секции loop().
// Возвращает результат выполнения цикла (описания значений результатов ниже).
uint8_t result = WiznetInterface.pool();

// Получение типа интерфейса (описания значений типов интерфейса ниже).
uint8_t type = WiznetInterface.type();

// Флаг, указывающий что используемый интерфейс не поддерживается на данной платформе (true - интерфейс не поддерживается) 
bool isImitation = WiznetInterface.isImitation();

// Получение текущего статуса интерфейса (описания значений статусов ниже).
uint8_t status = WiznetInterface.getStatus();

// Получение текущей ошибка интерфейса (описания значений кодов ошибок ниже).
uint8_t error = WiznetInterface.getError();
```

## Класс FLProgOnBoardWifiInterface

### Конструктор

**Создание интерфейса для работы со встроенным WiFi модулем на платах ESP8266 и ESP32**

```c
FLProgOnBoardWifiInterface WifiInterface;
```

### Настройка интерфейса

- *Установка MAC-адреса точки доступа и клиента.*

```c
// Установка непосредственно числами
WifiInterface.apMac (0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); // Точка
WifiInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); // Клиент

// Установка путём передачи массива
uint8_t macAddr[6] = {0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40};
WifiInterface. apMac(macAddr); // Точка
WifiInterface.mac(macAddr); // Клиент
```

- *Получение текущего MAC-адреса точки доступа и клиента. Возвращает ссылку на массив из 6 элементов типа* **uint8_t**\*.\*

```c
uint8_t *macAddres = WifiInterface.apMac(); // Точка
uint8_t *macAddres = WifiInterface.mac(); // Клиент
```

- *Настройка и получение параметров DHCP клиента*

```c
// Включение режима получения IP адреса через DHCP 
WifiInterface.setDhcp();

// Отключение режима получения IP адреса через DHCP 
WifiInterface.resetDhcp();

// Управление режимом получения IP адреса через DHCP (true - включён, false - выключен)
WifiInterface.dhcpMode(true);

// Получение текущего состояния режима получения IP адреса через DHCP 
bool mode =  WifiInterface.isDhcp();
```

- *Доступ к параметрам соеденения.*

```c
// Внимание если не отключить режим DHCP то заданные IP адреса клиента при соединении будут заменены полученными от сервера DHCP!

// Задание Ip адреса  точки доступа и клиента.
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WifiInterface.apLocalIP(IPAddress(192, 168, 1, 100)); // Точка
WifiInterface.apLocalIP(192, 168, 1, 100);            // Точка

WifiInterface.localIP(IPAddress(192, 168, 1, 100)); // Клиент
WifiInterface.localIP(192, 168, 1, 100);            // Клиент


// Получение IP адреса точки доступа и клиента.
// Возвращает объект класса IPAddress
IPAddress ip = WifiInterface.apLocalIP(); // Точка
IPAddress ip = WifiInterface.localIP();   // Клиент


// Задание Ip адреса DNS сервера.
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WifiInterface.apDns(IPAddress(192, 168, 1, 1)); // Точка
WifiInterface.apDns(192, 168, 1, 1);            // Точка

WifiInterface.dns(IPAddress(192, 168, 1, 1)); // Клиент
WifiInterface.dns(192, 168, 1, 1);            // Клиент

// Получение IP адреса DNS сервера
// Возвращает объект класса IPAddress
IPAddress ip = WifiInterface.apDns(); // Точка
IPAddress ip = WifiInterface.dns();   // Клиент


// Задание Ip адреса шлюза.
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WifiInterface.apGateway(IPAddress(192, 168, 1, 1)); // Точка
WifiInterface.apGateway(192, 168, 1, 1);            // Точка

WifiInterface.gateway(IPAddress(192, 168, 1, 1)); // Клиент
WifiInterface.gateway(192, 168, 1, 1);            // Клиент

// Получение IP адреса шлюза
// Возвращает объект класса IPAddress
IPAddress ip = WifiInterface.apGateway(); // Точка
IPAddress ip = WifiInterface.gateway();   // Клиент

// Задание маски подсети. По умолчанию установлена 255.255.255.0
// В качестве значения могут передаваться как объект IPAddress так и четыре цифры
WifiInterface.apSubnet(IPAddress(255, 255, 255, 0)); // Точка
WifiInterface.apSubnet(255, 255, 255, );             // Точка

WifiInterface.subnet(IPAddress(255, 255, 255, 0)); // Клиент
WifiInterface.subnet(255, 255, 255, );             // Клиент

// Получение маски подсети
// Возвращает объект класса IPAddress
IPAddress ip = WifiInterface.apSubnet(); // Точка
IPAddress ip = WifiInterface.subnet();   // Клиент

// Задание имени сети (SSID) для точки доступа (передается строка)
// Может вызываться в любой момент времени, точка будет пересозданна
WifiInterface.setApSsid("Test_Esp_Net");
 
// Получение текущего значения имени сети (SSID) для точки доступа
String name = WifiInterface.apSsid();

// Задание  пароля для точки доступа (передается строка)
// Может вызываться в любой момент времени, точка будет пересозданна
WifiInterface.setApPassword("password");

// Получение текущего значения пароля для точки доступа
String name = WifiInterface.apPassworid();
    
// Задание имени сети (SSID) для клиента (передается строка)
// Может вызываться в любой момент времени, клиент переподключится
WifiInterface.setClientSsid("Test_Net");
 
// Получение текущего значения имени сети (SSID) для клиента
String name = WifiInterface.clientSsid();

// Задание  пароля для клиента (передается строка)
// Может вызываться в любой момент времени, клиент переподключится
WifiInterface.setClientPassword("password");

// Получение текущего значения пароля для клиента
String name = WifiInterface.clientPassword();

```

### Управление интерфейсом

```c
// Цикл работы интерфейса. 
// Обязательно вызывать один раз в секции loop().
// Возвращает результат выполнения цикла (описания значений результатов ниже).
uint8_t result = WifiInterface.pool();

// Управление точкой доступа
WifiInterface.apOn(); // Включить точку
WifiInterface.apOff(); //Выключить точку
WifiInterface.apMode(true); //Управление (true - включить, false - выключить)
bool  mode = WifiInterface.apMode() // Текущий режим работы (true - вкл, false - выкл)
bool  status = WifiInterface.apIsReady() // Текущее состояние готовности

// Управление клиентом
WifiInterface.clientOn(); // Включить клиетна
WifiInterface.clientOff(); //Выключить клиетна
WifiInterface.clientMode(true); //Управление (true - включить, false - выключить)
bool  mode = WifiInterface.clientMode() // Текущий режим работы (true - вкл, false - выкл)
bool  status = WifiInterface.clientIsReady() // Текущее состояние готовности

// Получение типа интерфейса (описания значений типов интерфейса ниже).
uint8_t type = WifiInterface.type();

// Флаг, указывающий что используемый интерфейс не поддерживается на данной платформе (true - интерфейс не поддерживается) 
bool isImitation = WifiInterface.isImitation();

// Получение текущего статуса интерфейса (описания значений статусов ниже).
uint8_t status = WifiInterface.getStatus();

// Получение текущей ошибка интерфейса (описания значений кодов ошибок ниже).
uint8_t error = WifiInterface.getError();
```

<br>

# Pабота с TCP

## Класс FLProgEthernetServer

### Конструктор

- *Инстанс сервера создается на основе ссылки на экземпляр интерфейса, на котором он будет слушать порт*

```c
// Создание сервера с непосредственным указанием порта
FLProgEthernetServer Server(&WiznetInterface, 80); 

// Создание сервера с на порту по умолчанию (порт по умолчанию 80)
FLProgEthernetServer Server(&WiznetInterface); 
```

### Настройка сервера

- *Задание номера порта который будет слушать сервер* <br>
*может вызываься в любой момент времени*

```c
Server.setPort(port);
```

- *Задание имени функции которая будет вызвана при приходе запроса на сервер* <br>
*может вызываься в любой момент времени*<br>
*формат функции void funk(void)*<br>
*вызов функции произойдёт только если в секции loop() будет вызыватся метод pool()  сервера*

```c
// Синтаксис
Server.setCallback(funk);

// Пример конструкции
#include "flprogEthernet.h"
FLProgWiznetInterface WiznetInterface;
FLProgEthernetServer server(&WiznetInterface);

void setup()
{
  WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40);
  server.setCallback(callBack);
}

void loop()
{
  WiznetInterface.pool();
  server.pool();
}

void callBack()
{
  // Читаем содержимое запроса
  while (server.available())
  {
    uint8_t  byte = server.read();
    // ..........
  }
  // Отправляем ответ
  server.write(100);
  // ..........

  // Закрываем соеденение
  server.stopConnection();
}
```

### Управление сервером

- *Цикл работы сервера.* <br>
*Вызывается один раз в секции loop().*<br>
*Необходимо вызывать если заданна функция Callbac.*

```c
Server.pool();
```

- *Прверка наличия подключённого к серверу клиента.*

```c
bool hasClient = Server.connected();
```

- *Отключение от подключённого к серверу клиента.*

```c
 Server.stopConnection();
```

- *Полная отановка сервера.*

```c
 Server.stop();
```

- *Количество байт полученных от клиента.*

```c
 int count = Server.available();
```

- *Чтение байт полученных от клиента*

```c
// Чтение одного байта
 uint8_t data = Server.read();

// Чтение нескольких байт в буфер
uint8_t buffer[10];
Server.read(buffer, 10);

// Чтение нескольких байтов в никуда
Server.readToNull(10);
```

- *Передача байт клиенту*

```c
// Передача одного байта
 Server.write(100);

// Передача нескольких байт через буфер
uint8_t buffer[5] = {1, 3, 5, 2, 3};
Server.write(buffer, 5);
```

- *Получение информации о сервере*

```c
// Получени е текущего порта сервера
  uint16_t port = Server.localPort();

// Получение IP адреса подключенного клиента
 IPAddress ip = Server.remoteIP();

// Получение порта подключенного клиента
uint16_t port = Server.remotePort(); 

// Получение текущего статуса сервера (описания значений статусов ниже).
uint8_t status = Server.getStatus();

// Получение текущей ошибка сервера (описания значений кодов ошибок ниже).
uint8_t error = Server.getError();
```

## Класс FLProgEthernetClient

### Конструктор

- *Инстанс клиента создается на основе ссылки на экземпляр интерфейса, через который он будет соеденяться с сервером*

```c
FLProgEthernetClient client(&WiznetInterface);
```

### Настройка клиента

- *Задание и получение текущего значения таймаута на время попытки соеденения с сервером в миллисекундах* <br>
*Значение по умолчанию 1000 ms*

```c
// Задание значения
client.setConnectionTimeout(2000);

// Получение значения
uint16_t imeout = client.getConnectionTimeout();
```

- *Задание и получение текущего значения времени хранения кэша DNS в миллисекундах* <br>
*Значение по умолчанию 60000 ms*

```c
// Задание значения
client.setDnsCacheStorageTime(200000);

// Получение значения
uint32_t time = client.getDnsCacheStorageTime();
```

### Управление клиентом

- *Команда на подключение клиента к заданному IP  или хосту по заданному порту* <br>
*Операция не блокирующая, после выполнения данной операции необходимо проверять статус коннекта*

```c
// Команда на подключение по Ip адресу
client.connect(IPAddress(192, 168, 1, 1), 502);

// Команда на подключение по иимени хоста
char host[10] = "yandex.ru";
client.connect(host, 80);

// Проверка состояния подключения
bool isConnect = client.connected();
```

- *Запрос количесва полученных от сервера байт*

```c
uint16_t = client.available();
```

- *Отключение клиента от сервера.*

```c
 client.stop();
```

- *Чтение данных полученных от сервера*

```c
// Чтение одного байта
uint8_t = client.read();

// Чтение нескольких байт в буфер
uint8_t buffer[10];
client.read(buffer, 10);

// Чтение нескольких байтов в никуда
client.readToNull(10);
```  

- *Передача данных на сервер*

```c
// Передача одного байта
 client.write(100);

// Передача нескольких байт через буфер
uint8_t buffer[5] = {1, 3, 5, 2, 3};
client.write(buffer, 5);
```

- *Получение информации о клиенте*

```c
// Получени е текущего порта клиента
  uint16_t port = Server.localPort();

// Получение IP адреса подключенного сервера
 IPAddress ip = client.remoteIP();

// Получение порта подключенного сервера
uint16_t port = client.remotePort(); 

// Получение текущего статуса клиента (описания значений статусов ниже).
uint8_t status = client.getStatus();

// Получение текущей ошибка клиента (описания значений кодов ошибок ниже).
uint8_t error = client.getError();
```

<br>

# Pабота с UDP

## Класс FLProgUdpClient

### Конструктор

- *Инстанс UDP клиента создается на основе ссылки на экземпляр интерфейса, на котором он будет работать*

```c
FLProgUdpClient Udp(&WiznetInterface);
```

