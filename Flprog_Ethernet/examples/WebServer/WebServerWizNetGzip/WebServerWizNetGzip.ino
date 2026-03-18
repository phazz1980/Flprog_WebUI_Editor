// Подключаем необходимую библиотеку
#include "flprogWebServer.h"

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
     Создаем объект непосредстредственно вебсервера на необходимом интерфейсе
  -----------------------------------------------------------------------------------------
*/

FLProgWebServer webServer(&WiznetInterface, 80);

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

uint32_t startCicleTime;
uint32_t maxCicleTime = 0;
uint32_t startCicleTime1;
uint32_t maxCicleTime1 = 0;

const char headerHTML[] = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<!DOCTYPE HTML>\r\n<html>";
const char mainPageHTML[] = "<h1>MainPage</h1><br><a href=\"/test1\">Test page 1</a><br><a href=\"/test2?value1=10&value2=blabla&value3=12345678\">Test page 2</a><br><a href=\"/resetCounter\">Reset max cicle time</a><br>";
const char resetCounterHTML[] = "<h1>Max cicle time is resetng</h1><br><a href=\"/\">MainPage</a>";
const char page1HTML[] = "<h1>Test Page 1</h1><br><a href=\"/\">MainPage</a><br><a href=\"/test2?value1=10&value2=blabla&value3=12345678\">Test page 2</a><br>";
const char page2HTML[] = "<h1>Test Page 2</h1><br><a href = \"/\">MainPage</a><br><a href=\"/test1\">Test page 1</a><br><br>";
const char page404HTML[] = "HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<!DOCTYPE HTML>\r\n<html><h1>Page not found</h1><br><a href = \"/\">MainPage</a><br>";

//=================================================================================================
void setup()
{

    Serial.begin(115200);
    while (!Serial)
    {
    }

    flprog::printConsole(" Тест Modbus Web Server RP2040 на два ядра - WizNet ");

    Serial.print("CS - ");
    Serial.println(WiznetInterface.pinCs());
    Serial.print("SPI BUS - ");
    Serial.println(WiznetInterface.spiBus());
    pinMode(LED_BUILTIN, OUTPUT);
}

void setup1()
{
    /*
      -----------------------------------------------------------------------------------------
           Настройка интерфейса
      -----------------------------------------------------------------------------------------
    */
    WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x0D, 0x5B, 0x86);
    WiznetInterface.localIP(IPAddress(192, 168, 1, 10));
    WiznetInterface.resetDhcp();
    /*
      -----------------------------------------------------------------------------------------
             Настройка Вэб сервера
      -----------------------------------------------------------------------------------------
    */
    webServer.addHandler("", mainPage);
    webServer.addHandler("/test1", testPage1);
    webServer.addHandler("/test2", testPage2);
    webServer.addHandler("/resetCounter", resetCounter);
    webServer.add404Page(page_404);
}

//=================================================================================================
void loop()
{
    startCicleTime = micros();
    printStatusMessages();
    blinkLed();
    uint32_t diff = flprog::difference32(startCicleTime, micros());
    if (diff > maxCicleTime)
    {
        maxCicleTime = diff;
    }
}

void loop1()
{
    startCicleTime1 = micros();
    WiznetInterface.pool();
    webServer.pool();
    uint32_t diff1 = flprog::difference32(startCicleTime1, micros());
    if (diff1 > maxCicleTime1)
    {
        maxCicleTime1 = diff1;
    }
}

//=================================================================================================
void page_404(FLProgWebServer *server)
{
    server->print(page404HTML);
    sendFooter(server);
}

void mainPage(FLProgWebServer *server)
{
    server->print(headerHTML);
    server->print(mainPageHTML);
    sendFooter(server);
}

void resetCounter(FLProgWebServer *server)
{
    maxCicleTime = 0;
    maxCicleTime1 = 0;
    server->print(headerHTML);
    server->print(resetCounterHTML);
    sendFooter(server);
}

void testPage1(FLProgWebServer *server)
{
    server->print(headerHTML);
    server->print(page1HTML);
    sendFooter(server);
}

void testPage2(FLProgWebServer *server)
{
    server->print(headerHTML);
    server->print(page2HTML);
    sendFooter(server);
}

void sendFooter(FLProgWebServer *server)
{
    sendWebServerData(server);
    sendCounter(server);
    server->print("</html>");
}

void sendCounter(FLProgWebServer *server)
{
    server->print("<h4> Max cicle time (micros) - ");
    server->print(maxCicleTime);
    server->print("<br>");
    server->print(" Max cicle time (micros) 1 - ");
    server->print(maxCicleTime1);
    server->print("</h4>");
}

void sendWebServerData(FLProgWebServer *server)
{
    server->print("<h2> Server data</h2><h3> Main data</h3><h4> Method - ");
    server->print(server->method());
    server->print("<br> Method version - ");
    server->print(server->methodVersion());
    server->print("<br> Host - ");
    server->print(server->host());
    server->print("<br> URL - ");
    server->print(server->uri());
    server->print("</h4><h3> Headers </h3><h4>");
    for (int i = 0; i < server->headersCount(); i++)
    {
        String key = server->headerKeyAtIndex(i);
        if (server->hasHeaderKey(key))
        {
            String value = server->headerValueAtKey(key);
            server->print(i);
            server->print(": ");
            server->print(key);
            server->print(" -- ");
            server->print(value);
            server->print("<br>");
        }
    }
    server->print("</h4><h3> Arguments </h3><h4>");
    for (int i = 0; i < server->argumentsCount(); i++)
    {
        String key = server->argumentKeyAtIndex(i);
        if (server->hasArgumentKey(key))
        {
            String value = server->argumentValueAtKey(key);
            server->print(i);
            server->print(": ");
            server->print(key);
            server->print(" = ");
            server->print(value);
            server->print("<br>");
        }
    }
    server->print("</h4>");
}

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
