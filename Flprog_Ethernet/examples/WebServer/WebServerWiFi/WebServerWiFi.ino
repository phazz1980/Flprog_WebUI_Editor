// Подключаем необходимую библиотеку
#include "flprogWebServer.h"

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
  -----------------------------------------------------------------------------------------
     Создаем объект непосредстредственно вебсервера на необходимом интерфейсе
  -----------------------------------------------------------------------------------------
*/

FLProgWebServer webServer(&WifiInterface, 80);

/*
  -----------------------------------------------------------------------------------------
          Определение рабочих параметров и функций
  -----------------------------------------------------------------------------------------
*/
uint32_t blinkStartTime = 0;

uint8_t ethernetStatus = 255;
uint8_t ethernetError = 255;

bool isNeedClientSendConnectMessage = true;
bool isNeedClientSendDisconnectMessage = true;

bool isNeedApSendConnectMessage = true;
bool isNeedApSendDisconnectMessage = true;

uint32_t startCicleTime;
uint32_t maxCicleTime = 0;

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

  flprog::printConsole(" Тест WebServer - Wifi ");
  pinMode(LED_BUILTIN, OUTPUT);

  /*
    -----------------------------------------------------------------------------------------
         Настройка интерфейса
    -----------------------------------------------------------------------------------------
  */
  WifiInterface.clientOn();
  WifiInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x30, 0x45);
  // WifiInterface.localIP(IPAddress(192, 168, 199, 38));
  // WifiInterface.resetDhcp();
  WifiInterface.setClientSsid("totuin-router");
  WifiInterface.setClientPassword("12345678");
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
  WifiInterface.pool();
  webServer.pool();
  uint32_t diff = flprog::difference32(startCicleTime, micros());
  if (diff > maxCicleTime)
  {
    maxCicleTime = diff;
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