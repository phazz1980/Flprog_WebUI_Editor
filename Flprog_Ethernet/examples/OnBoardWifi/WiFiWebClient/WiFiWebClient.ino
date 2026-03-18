
#include "flprogEthernet.h"
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

/*
  -------------------------------------------------------------------------------------------------
              Создание интерфейса для работы с Wifi интерфейсом
  -------------------------------------------------------------------------------------------------
*/
FLProgOnBoardWifiInterface WifiInterface;

/*
  ------------------------------------------------------------------------------------------------ -
  Задание параметров интернет соеденения и параметров клиента
  ------------------------------------------------------------------------------------------------ -
*/

const char *host = "djxmmx.net";
// const char *host = "flprog1.ru"; // Несуществующий домен для проверки  работы DNS при неправильном задании хоста
// IPAddress  host = IPAddress(104, 230, 16, 86); // IP адрес хоста "djxmmx.net" для работы без DNS
const uint16_t port = 17;

/*
  -------------------------------------------------------------------------------------------------
          Создание объекта клиента  с привязкой к интерфейсу
  -------------------------------------------------------------------------------------------------
*/
FLProgEthernetClient client(&WifiInterface);

/*
  -----------------------------------------------------------------------------------------
          Определение рабочих параметров и функций
  -----------------------------------------------------------------------------------------
*/

uint8_t ethernetStatus = 255;
uint8_t ethernetError = 255;

uint8_t clientStatus = 255;
uint8_t clientError = 255;

uint32_t blinkStartTime = 0;

uint32_t reqestPeriod = 60000;
uint32_t startSendReqest = flprog::timeBack(reqestPeriod);

uint32_t reqestTimeout = 10000;

bool isWaitReqest = false;

bool isNeedClientSendConnectMessage = true;
bool isNeedClientSendDisconnectMessage = true;

bool isNeedApSendConnectMessage = true;
bool isNeedApSendDisconnectMessage = true;

uint32_t printPointTime = 0;

//=================================================================================================
void setup()
{
    Serial.begin(115200);
    while (!Serial)
    {
    }

    flprog::printConsole(" Тест WIFI Web клиента ");

    WifiInterface.clientOn();
    WifiInterface.apOn();
    WifiInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x28); //--Установка MAC-адрес контроллера (лучше адрес прошитый производителем);
    WifiInterface.setApSsid("Test-Esp-FLProg");
    WifiInterface.setApPassword("12345678");
    WifiInterface.setClientSsid("totuin-router");
    WifiInterface.setClientPassword("12345678");

    // WifiInterface.localIP(192, 168, 199, 196);
    // WifiInterface.resetDhcp();

    client.setDnsCacheStorageTime(600000); // Устанавливаем клиенту время хранаения DNS кэша 10 минут

    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);
}

//=================================================================================================
void loop()
{
    WifiInterface.pool();
    printStatusMessages();
    blinkLed();
    sendReqest();
    ressiveData();
}

//=================================================================================================

void blinkLed()
{
    if (flprog::isTimer(blinkStartTime, 50))
    {
        blinkStartTime = millis();
        digitalWrite(LED_BUILTIN, !(digitalRead(LED_BUILTIN)));
    }
}

void ressiveData()
{
    if (!isWaitReqest)
    {
        return;
    }
    if (!WifiInterface.isReady())
    {
        isWaitReqest = false;
        client.stop();
        return;
    }
    if (flprog::isTimer(startSendReqest, reqestTimeout))
    {
        isWaitReqest = false;
        Serial.println("Нет ответа от сервера!");
        return;
    }
    if (client.available() == 0)
    {
        return;
    }
    while (client.available())
    {
        char ch = static_cast<char>(client.read());
        Serial.print(ch);
    }
    Serial.println();
    Serial.println();
    isWaitReqest = false;
}

void sendReqest()
{
    if (!WifiInterface.isReady())
    {
        client.stop();
        return;
    }

    if (isWaitReqest)
    {
        return;
    }
    if (!(flprog::isTimer(startSendReqest, reqestPeriod)))
    {
        if (flprog::isTimer(printPointTime, 1000))
        {
            Serial.print(".");
            printPointTime = millis();
        }
        return;
    }
    uint8_t temp = client.connect(host, port);

    if (temp == FLPROG_WAIT)
    {
        return;
    }
    if (temp == FLPROG_ERROR)
    {
        startSendReqest = millis();
        Serial.println("Клиент не смог подключиться к серверу!");
        return;
    }
    Serial.println();
    Serial.print("Подключаемся к серверу: ");
    Serial.print(host);
    Serial.print(':');
    Serial.println(port);

    if (client.connected())
    {
        Serial.println("Отправляем запрос на сервер");
        Serial.println();
        client.println("hello from ESP8266");
    }
    startSendReqest = millis();
    isWaitReqest = true;
}

void printStatusMessages()
{
    if (WifiInterface.getStatus() != ethernetStatus)
    {
        ethernetStatus = WifiInterface.getStatus();
        Serial.println();
        Serial.print("Статус интерфейса - ");
        Serial.println(flprog::flprogStatusCodeName(ethernetStatus));
    }
    if (WifiInterface.getError() != ethernetError)
    {
        ethernetError = WifiInterface.getError();
        if (ethernetError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("Ошибка интерфейса - ");
            Serial.println(flprog::flprogErrorCodeName(ethernetError));
        }
    }
    if (client.getStatus() != clientStatus)
    {
        clientStatus = client.getStatus();
        Serial.println();
        Serial.print("Статус клиента - ");
        Serial.println(flprog::flprogStatusCodeName(clientStatus));
    }
    if (client.getError() != clientError)
    {
        clientError = client.getError();
        if (clientError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("Ошибка клиента - ");
            Serial.println(flprog::flprogErrorCodeName(clientError));
        }
    }
    printClientConnectMessages();
    printClientDisconnectMessages();
    printApConnectMessages();
    printApDisconnectMessages();
}

void printClientConnectMessages()
{
    if (!WifiInterface.clientIsReady())
    {
        return;
    }
    if (!isNeedClientSendConnectMessage)
    {
        return;
    }
    Serial.println("WiFiClient подключён!");
    Serial.print("Ssid - ");
    Serial.println(WifiInterface.clientSsid());
    Serial.print("Ip - ");
    Serial.println(WifiInterface.localIP());
    Serial.print("DNS - ");
    Serial.println(WifiInterface.dns());
    Serial.print("Subnet - ");
    Serial.println(WifiInterface.subnet());
    Serial.print("Gateway - ");
    Serial.println(WifiInterface.gateway());
    Serial.println();
    isNeedClientSendConnectMessage = false;
    isNeedClientSendDisconnectMessage = true;
}

void printApConnectMessages()
{
    if (!WifiInterface.apIsReady())
    {
        return;
    }
    if (!isNeedApSendConnectMessage)
    {
        return;
    }
    Serial.println("WiFi точка включенна!");
    Serial.print("Ssid - ");
    Serial.println(WifiInterface.apSsid());
    Serial.print("Ip - ");
    Serial.println(WifiInterface.apLocalIP());
    Serial.print("DNS - ");
    Serial.println(WifiInterface.apDns());
    Serial.print("Subnet - ");
    Serial.println(WifiInterface.apSubnet());
    Serial.print("Gateway - ");
    Serial.println(WifiInterface.apGateway());
    Serial.println();
    isNeedApSendConnectMessage = false;
    isNeedApSendDisconnectMessage = true;
}

void printClientDisconnectMessages()
{
    if (WifiInterface.clientIsReady())
    {
        return;
    }
    if (isNeedClientSendConnectMessage)
    {
        return;
    }
    if (!isNeedClientSendDisconnectMessage)
    {
        return;
    }
    Serial.println("WiFiClient отключён!");
    isNeedClientSendConnectMessage = true;
    isNeedClientSendDisconnectMessage = false;
}

void printApDisconnectMessages()
{
    if (WifiInterface.apIsReady())
    {
        return;
    }
    if (isNeedApSendConnectMessage)
    {
        return;
    }
    if (!isNeedApSendDisconnectMessage)
    {
        return;
    }
    Serial.println("WiFi точка отключёна!");
    isNeedApSendConnectMessage = true;
    isNeedApSendDisconnectMessage = false;
}