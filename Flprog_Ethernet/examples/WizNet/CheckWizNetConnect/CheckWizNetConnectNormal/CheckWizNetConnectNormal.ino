#include <flprogEthernet.h> //подключаем библиотеку Ethernet
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

/*
-------------------------------------------------------------------------------------------------
        Создание интерфейса для работы с чипом W5100(W5200,W5500)
        Шина SPI и пин CS берутся из  RT_HW_Base.device.spi.busETH и RT_HW_Base.device.spi.csETH
-------------------------------------------------------------------------------------------------
*/
FLProgWiznetInterface WiznetInterface;

/*
-------------------------------------------------------------------------------------------------
        Второй вариант cоздания интерфейса для работы с чипом W5100(W5200,W5500).
        С непосредственной привязкой  пину.
        Пин CS - 10
        Шина SPI берётся из RT_HW_Base.device.spi.busETH
-------------------------------------------------------------------------------------------------
*/
// FLProgWiznetInterface WiznetInterface(10);

/*
-------------------------------------------------------------------------------------------------
        Третий вариант cоздания интерфейса для работы с чипом W5100(W5200,W5500).
        С непосредственной привязкой  пину и шине.
        Пин CS - 10
        Шина SPI - 0
-------------------------------------------------------------------------------------------------
*/
// FLProgWiznetInterface WiznetInterface(10, 0);

/*
-----------------------------------------------------------------------------------------
          Определение рабочих параметров и функций
-----------------------------------------------------------------------------------------
*/
uint32_t blinkStartTime = 0;

uint8_t ethernetStatus = 255;
uint8_t ethernetError = 255;

bool isNeedSendConnectMessage = true;
bool isNeedSendDisconnectMessage = true;

//=================================================================================================
void setup()
{
    Serial.begin(115200);
    while (!Serial)
    {
    }

    flprog::printConsole(" Тест проверки соеденения WizNet ");

    Serial.print("CS - ");
    Serial.println(WiznetInterface.pinCs());
    Serial.print("SPI BUS - ");
    Serial.println(WiznetInterface.spiBus());

    WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); //--Установка MAC-адрес контроллера
    // WiznetInterface.localIP(192, 168, 199, 155);
    // WiznetInterface.resetDhcp();

    pinMode(LED_BUILTIN, OUTPUT);
}
//=================================================================================================
void loop()
{
    WiznetInterface.pool();
    printStatusMessages();
    blinkLed();
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

void printStatusMessages()
{
    if (WiznetInterface.getStatus() != ethernetStatus)
    {
        ethernetStatus = WiznetInterface.getStatus();
        Serial.println();
        Serial.print("Статус интерфейса - ");
        Serial.println(flprog::flprogStatusCodeName(ethernetStatus));
    }
    if (WiznetInterface.getError() != ethernetError)
    {
        ethernetError = WiznetInterface.getError();
        if (ethernetError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("Ошибка интерфейса - ");
            Serial.println(flprog::flprogErrorCodeName(ethernetError));
        }
    }
    printConnectMessages();
    printDisconnectMessages();
}

void printConnectMessages()
{
    if (!WiznetInterface.isReady())
    {
        return;
    }
    if (!isNeedSendConnectMessage)
    {
        return;
    }
    Serial.println("Ethernet подключён!");
    Serial.print("Ip - ");
    Serial.println(WiznetInterface.localIP());
    Serial.print("DNS - ");
    Serial.println(WiznetInterface.dns());
    Serial.print("Subnet - ");
    Serial.println(WiznetInterface.subnet());
    Serial.print("Gateway - ");
    Serial.println(WiznetInterface.gateway());
    isNeedSendConnectMessage = false;
    isNeedSendDisconnectMessage = true;
}

void printDisconnectMessages()
{
    if (WiznetInterface.isReady())
    {
        return;
    }
    if (isNeedSendConnectMessage)
    {
        return;
    }
    if (!isNeedSendDisconnectMessage)
    {
        return;
    }
    Serial.println("Ethernet отключён!");
    isNeedSendConnectMessage = true;
    isNeedSendDisconnectMessage = false;
}