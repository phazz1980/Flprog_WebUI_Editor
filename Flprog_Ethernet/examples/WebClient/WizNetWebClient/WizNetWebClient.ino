/*
  =================================================================================================
                  Test Ethernet WebClient
                  Получение по UDP точного времени.
  =================================================================================================
*/
#include "flprogWebClient.h" //подключаем библиотеку webClient

/*
  -------------------------------------------------------------------------------------------------
        Создание интерфейса для работы с чипом W5100(W5200,W5500)
        Шина SPI и пин CS берутся из  RT_HW_Base.device.spi.busETH и RT_HW_Base.device.spi.csETH
  -------------------------------------------------------------------------------------------------
*/
FLProgWiznetInterface wiznetInterface;
/*
  -------------------------------------------------------------------------------------------------
        Второй вариант cоздания интерфейса для работы с чипом W5100(W5200,W5500).
       С непосредственной привязкой  пину.
        Пин CS - 10
        Шина SPI берётся из RT_HW_Base.device.spi.busETH
  -------------------------------------------------------------------------------------------------
*/
// FLProgWiznetInterface wiznetInterface(10);

/*
  -------------------------------------------------------------------------------------------------
        Третий вариант cоздания интерфейса для работы с чипом W5100(W5200,W5500).
        С непосредственной привязкой  пину и шине.
       Пин CS - 10
       Шина SPI - 0
  -------------------------------------------------------------------------------------------------
*/
// FLProgWiznetInterface wiznetInterface(10, 0);

/*
  -------------------------------------------------------------------------------------------------
       Создание webClienta
  -------------------------------------------------------------------------------------------------
*/

FLProgWebClient webClient(&wiznetInterface);

/*
  -----------------------------------------------------------------------------------------
         Определение рабочих параметров и функций
  -----------------------------------------------------------------------------------------
*/

uint32_t blinkStartTime = 0;
uint8_t ledPin;

uint32_t reqestPeriod = 60000;
uint32_t reqestTime = flprog::timeBack(reqestPeriod);

//=================================================================================================
void setup()
{
    Serial.begin(115200);
    while (!Serial)
    {
    }
    ledPin = RT_HW_Base.vPinLed();
    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, HIGH);
    Serial.println(" Тест WizNet WebClient ");
    Serial.print("CS - ");
    Serial.println(wiznetInterface.pinCs());
    Serial.print("SPI BUS - ");
    Serial.println(wiznetInterface.spiBus());

    wiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); //--Установка MAC-адрес контроллера
    // wiznetInterface.localIP(192, 168, 199, 155);
    // wiznetInterface.resetDhcp();

    /*
      ------------------------------------------------------------------------------------------------ -
      Задание параметров webClient
      ------------------------------------------------------------------------------------------------ -
    */

    // webClient.setHost("djxmmx.net");
    webClient.setHost(IPAddress(104, 230, 16, 86)); // IP адрес хоста "djxmmx.net" для работы без DNS
    webClient.setPort(17);
    webClient.setCallBack(onClient);
    webClient.setDnsCacheStorageTime(600000); // Устанавливаем клиенту время хранаения DNS кэша 10 минут
}

//=================================================================================================
void loop()
{
    wiznetInterface.pool();
    webClient.pool();
    printStatusMessages();
    blinkLed();
    if (wiznetInterface.isReady())
    {
        if (flprog::isTimer(reqestTime, reqestPeriod))
        {
            webClient.sendReqest("hello from ESP8266");
            Serial.println("Отправляем запрос на сервер");
            Serial.println();
            reqestTime = millis();
        }
    }
}

//=================================================================================================
void onClient()
{
    Serial.println(webClient.getAnswerString());
}

void printStatusMessages()
{
    if (wiznetInterface.getIsChangeStatusWithReset())
    {
        Serial.println();
        Serial.print("Статус интерфейса - ");
        Serial.println(flprog::flprogStatusCodeName(wiznetInterface.getStatus()));
    }
    if (wiznetInterface.getIsChangeErrorWithReset())
    {
        uint8_t ethernetError = wiznetInterface.getError();
        if (ethernetError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("Ошибка интерфейса - ");
            Serial.println(flprog::flprogErrorCodeName(ethernetError));
        }
    }
    if (webClient.getIsChangeStatusWithReset())
    {
        Serial.print("Статус клиента - ");
        Serial.println(flprog::flprogStatusCodeName(webClient.getStatus()));
    }
    if (webClient.getIsChangeErrorWithReset())
    {
        uint8_t udpError = webClient.getError();
        if (udpError != FLPROG_NOT_ERROR)
        {
            Serial.print("Ошибка клиента - ");
            Serial.println(flprog::flprogErrorCodeName(udpError));
        }
    }
    if (wiznetInterface.getIsChangeIsReadyWithReset())
    {
        if (wiznetInterface.isReady())
        {
            printConnectMessages();
        }
        else
        {
            Serial.println("Ethernet отключён!");
        }
    }
}

void printConnectMessages()
{
    Serial.println("Ethernet подключён!");
    Serial.print("Ip - ");
    Serial.println(wiznetInterface.localIP());
    Serial.print("DNS - ");
    Serial.println(wiznetInterface.dns());
    Serial.print("Subnet - ");
    Serial.println(wiznetInterface.subnet());
    Serial.print("Gateway - ");
    Serial.println(wiznetInterface.gateway());
}

void blinkLed()
{
    if (flprog::isTimer(blinkStartTime, 50))
    {
        blinkStartTime = millis();
        digitalWrite(ledPin, !(digitalRead(ledPin)));
    }
}