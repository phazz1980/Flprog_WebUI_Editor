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
    Serial.begin(9600);
   
    WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); 
    // WiznetInterface.localIP(192, 168, 199, 155);
    // WiznetInterface.resetDhcp();
}
//=================================================================================================
void loop()
{
    WiznetInterface.pool();
    printStatusMessages();

}

//=================================================================================================

void printStatusMessages()
{
    if (WiznetInterface.getStatus() != ethernetStatus)
    {
        ethernetStatus = WiznetInterface.getStatus();
        Serial.println();
        Serial.print("In_S - ");
        Serial.println(ethernetStatus);
    }
    if (WiznetInterface.getError() != ethernetError)
    {
        ethernetError = WiznetInterface.getError();
        if (ethernetError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("In_E - ");
            Serial.println(ethernetError);
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

    Serial.print("Ip - ");
    Serial.println(WiznetInterface.localIP());
    Serial.print("Dns - ");
    Serial.println(WiznetInterface.dns());
    Serial.print("Sub - ");
    Serial.println(WiznetInterface.subnet());
    Serial.print("Gat - ");
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
    isNeedSendConnectMessage = true;
    isNeedSendDisconnectMessage = false;
}