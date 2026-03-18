#include "flprogEthernet.h"
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
  -------------------------------------------------------------------------------------------------
          Создание объекта сервера  с привязкой к интерфейсу
  -------------------------------------------------------------------------------------------------
*/
FLProgEthernetServer server(&WiznetInterface, 80);

/*
  -----------------------------------------------------------------------------------------
          Определение рабочих параметров и функций
  -----------------------------------------------------------------------------------------
*/

uint8_t ethernetStatus = 255;
uint8_t ethernetError = 255;

uint8_t serverStatus = 255;
uint8_t serverError = 255;

uint32_t blinkStartTime = 0;

bool isNeedSendConnectMessage = true;
bool isNeedSendDisconnectMessage = true;

//=================================================================================================
void setup()
{
    Serial.begin(115200);
    WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); //--Установка MAC-адрес контроллера
    // WiznetInterface.localIP(192, 168, 199, 155);
    // WiznetInterface.resetDhcp();
}

//=================================================================================================
void loop()
{
    WiznetInterface.pool();
    printStatusMessages();
    workServer();
}

//=================================================================================================
void workServer()
{
    if (!server.connected())
    {
        return;
    }
    if (!server.available())
    {
        return;
    }
    bool currentLineIsBlank = true;
    while (server.connected())
    {
        if (server.available())
        {
            char c = server.read();
            Serial.write(c);
            if (c == '\n' && currentLineIsBlank)
            {
                // send a standard http response header
                server.println("HTTP/1.1 200 OK");
                server.println("Content-Type: text/html");
                server.println("Connection: close");
                server.println("Refresh: 5");
                server.println();
                server.println("<!DOCTYPE HTML>");
                server.println("<html>");
                // output the value of each analog input pin
                for (int analogChannel = 0; analogChannel < 6; analogChannel++)
                {
                    int sensorReading = analogRead(analogChannel);
                    server.print("analog input ");
                    server.print(analogChannel);
                    server.print(" is ");
                    server.print(sensorReading);
                    server.println("<br />");
                }
                server.println("</html>");
                break;
            }
            if (c == '\n')
            {
                // you're starting a new line
                currentLineIsBlank = true;
            }
            else if (c != '\r')
            {
                currentLineIsBlank = false;
            }
        }
    }
    server.stopConnection();
}

void printStatusMessages()
{
    if (WiznetInterface.getStatus() != ethernetStatus)
    {
        ethernetStatus = WiznetInterface.getStatus();
        Serial.println();
        Serial.print("S_I-");
        Serial.println(ethernetStatus);
    }
    if (WiznetInterface.getError() != ethernetError)
    {
        ethernetError = WiznetInterface.getError();
        if (ethernetError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("E-I-");
            Serial.println(ethernetError);
        }
    }
    if (server.getStatus() != serverStatus)
    {
        serverStatus = server.getStatus();
        Serial.println();
        Serial.print("S_S-");
        Serial.println(serverStatus);
    }
    if (server.getError() != serverError)
    {
        serverError = server.getError();
        if (serverError != FLPROG_NOT_ERROR)
        {
            Serial.println();
            Serial.print("E_S-");
            Serial.println(serverError);
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
    Serial.print("Ip-");
    Serial.println(WiznetInterface.localIP());
    Serial.print("Dns-");
    Serial.println(WiznetInterface.dns());
    Serial.print("Sub-");
    Serial.println(WiznetInterface.subnet());
    Serial.print("Gat-");
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