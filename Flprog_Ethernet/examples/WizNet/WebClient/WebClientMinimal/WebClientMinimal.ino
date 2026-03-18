
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
        Задание параметров интернет соеденения и параметров клиента
  -------------------------------------------------------------------------------------------------
*/
//const char *host = "djxmmx.net";
// const char *host = "flprog1.ru"; // Несуществующий домен для проверки  работы DNS при неправильном задании хоста
IPAddress  host = IPAddress(104, 230, 16, 86); // IP адрес хоста "djxmmx.net" для работы без DNS
const uint16_t port = 17;

/*
  -------------------------------------------------------------------------------------------------
          Создание объекта клиента  с привязкой к интерфейсу
  -------------------------------------------------------------------------------------------------
*/
FLProgEthernetClient client(&WiznetInterface);

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

bool isNeedSendConnectMessage = true;
bool isNeedSendDisconnectMessage = true;

uint32_t printPointTime = 0;

//=================================================================================================
void setup()
{
  Serial.begin(9600);
  WiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); //--Установка MAC-адрес контроллера
  // WiznetInterface.localIP(192, 168, 199, 155);
  // WiznetInterface.resetDhcp();

  client.setDnsCacheStorageTime(600000); // Устанавливаем клиенту время хранаения DNS кэша 10 минут


}

//=================================================================================================
void loop()
{
  WiznetInterface.pool();
  printStatusMessages();
  sendReqest();
  ressiveData();
}

//=================================================================================================
void ressiveData()
{
  if (!isWaitReqest)
  {
    return;
  }
  if (!WiznetInterface.isReady())
  {
    isWaitReqest = false;
    client.stop();
    return;
  }
  if (flprog::isTimer(startSendReqest, reqestTimeout))
  {
    isWaitReqest = false;
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
  isWaitReqest = false;
}

void sendReqest()
{
  if (!WiznetInterface.isReady())
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
    return;
  }

  if (client.connected())
  {
    client.println("hello from ESP8266");
  }
  startSendReqest = millis();
  isWaitReqest = true;
}

void printStatusMessages()
{
  if (WiznetInterface.getStatus() != ethernetStatus)
  {
    ethernetStatus = WiznetInterface.getStatus();
    Serial.print("SI-");
    Serial.println(flprog::flprogStatusCodeName(ethernetStatus));
  }
  if (WiznetInterface.getError() != ethernetError)
  {
    ethernetError = WiznetInterface.getError();
    if (ethernetError != FLPROG_NOT_ERROR)
    {
      Serial.print("EI-");
      Serial.println(flprog::flprogErrorCodeName(ethernetError));
    }
  }
  if (client.getStatus() != clientStatus)
  {
    clientStatus = client.getStatus();
    Serial.println();
    Serial.print("SC-");
    Serial.println(flprog::flprogStatusCodeName(clientStatus));
  }
  if (client.getError() != clientError)
  {
    clientError = client.getError();
    if (clientError != FLPROG_NOT_ERROR)
    {
      Serial.println();
      Serial.print("EC-");
      Serial.println(flprog::flprogErrorCodeName(clientError));
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
