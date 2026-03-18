/*
  =================================================================================================
                  Test Ethernet
                  Получение по UDP точного времени.
  =================================================================================================
*/
#include <flprogEthernet.h> //подключаем библиотеку Ethernet
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
  -------------------------------------------------------------------------------------------------
         Создание объекта UDP для отправки и получения пакетов по UDP с привязкой к интерфейсу
  ------------------------------------------------------------------------------------------------
*/
FLProgUdpClient Udp(&WifiInterface); //--Создание UDP клиента;

/*
  -------------------------------------------------------------------------------------------------
         Задание параметров интернет соеденения и параметров UDP
  -------------------------------------------------------------------------------------------------
*/

uint32_t localPort = 8888; //--Определение порта для UDP пакетов (используется стандартный номер);

// const char *timeServer = "time.nist.gov"; //--Имя NTP сервера - сервер точного времени;
//  const char *timeServer = "ntp1.vniiftri.ru";
//  const char *timeServer = "128.138.140.44";
//  IPAddress  timeServer = IPAddress(128, 138, 140, 44);
IPAddress timeServer = IPAddress(192, 168, 137, 1);

const int NTP_PACKET_SIZE = 48;        //--Установка размера буфера (отметка времени NTP находится в первых 48 байтах сообщения);
uint8_t packetBuffer[NTP_PACKET_SIZE]; //--Создание буфера для хранения входящих и исходящих пакетов;
uint16_t cntGettingNTP = 0;            //--Cчетчик принятых пакетов;

/*
  -----------------------------------------------------------------------------------------
         Определение рабочих параметров и функций
  -----------------------------------------------------------------------------------------
*/
uint32_t reqestPeriod = 10000;                            // Периодичность запроса времени от сервера
uint32_t sendPacadeTime = flprog::timeBack(reqestPeriod); // Время начала ожидания
bool isReplyInProcess = false;                            // Флаг ожидания ответа

uint8_t ethernetStatus = 255;
uint8_t ethernetError = 255;

uint8_t udpStatus = 255;
uint8_t udpError = 255;

bool isNeedClientSendConnectMessage = true;
bool isNeedClientSendDisconnectMessage = true;

bool isNeedApSendConnectMessage = true;
bool isNeedApSendDisconnectMessage = true;

uint32_t blinkStartTime = 0;
uint32_t printPointTime = 0;

//=================================================================================================
void setup()
{
  pinMode(LED_BUILTIN, OUTPUT);

  Serial.begin(115200);
  while (!Serial)
  {
  }

  flprog::printConsole(" Тест WIFI UDP клиента ");

  WifiInterface.clientOn();
  WifiInterface.apOn();
  WifiInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x28);
  WifiInterface.setApSsid("Test-Esp-FLProg");
  WifiInterface.setApPassword("12345678");

  WifiInterface.setClientSsid("totuin-router");
  WifiInterface.setClientPassword("12345678");

  // WifiInterface.localIP(192, 168, 199, 196);
  // WifiInterface.resetDhcp();

  Udp.setDnsCacheStorageTime(600000); // Устанавливаем клиенту время хранаения DNS кэша 10 минут
}

//=================================================================================================
void loop()
{
  WifiInterface.pool();
  printStatusMessages();
  blinkLed();
  workInUDP();
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
  if (Udp.getStatus() != udpStatus)
  {
    udpStatus = Udp.getStatus();
    Serial.print("Статус UDP - ");
    Serial.println(flprog::flprogStatusCodeName(udpStatus));
  }
  if (Udp.getError() != udpError)
  {
    udpError = Udp.getError();
    if (udpError != FLPROG_NOT_ERROR)
    {
      Serial.print("Ошибка UDP - ");
      Serial.println(flprog::flprogErrorCodeName(udpError));
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

void workInUDP()
{
  if (!WifiInterface.isReady())
  {
    isReplyInProcess = false;
    return;
  }
  if (!isReplyInProcess)
  {
    sendNTPpacket();
    return;
  }
  processingResponse();
}

/*
  #################################################################################################
  =================================================================================================
                         ФУНКЦИЯ sendNTPpacket()
     Формирование запроса в буфере packetBuffer и его отправка в NTP сервер
  =================================================================================================
*/
void sendNTPpacket()
{
  if (!flprog::isTimer(sendPacadeTime, reqestPeriod)) //--Проверяем - прошло ли время после последнего запроса
  {
    if (flprog::isTimer(printPointTime, 1000))
    {
      Serial.print(".");
      printPointTime = millis();
    }
    return; //-- Если нет - выходим
  }

  Udp.begin(localPort);
  uint8_t result = Udp.beginPacket(timeServer, 123);
  if (result == FLPROG_WAIT)
  {
    return;
  }

  memset(packetBuffer, 0, NTP_PACKET_SIZE); //--Очистка буфера
  packetBuffer[0] = 0b11100011;             // LI, Version, Mode
  packetBuffer[1] = 0;                      // Stratum, or type of clock
  packetBuffer[2] = 6;                      // Polling Interval
  packetBuffer[3] = 0xEC;                   // Peer Clock Precision
  packetBuffer[12] = 49;
  packetBuffer[13] = 0x4E;
  packetBuffer[14] = 49;
  packetBuffer[15] = 52;

  if (result == FLPROG_SUCCESS)
  {
    if (Udp.write(packetBuffer, NTP_PACKET_SIZE))
    {
      if (Udp.endPacket())
      {
        isReplyInProcess = true;
      }
      else
      {
        Serial.println("UDP Ошибка отправки!");
      }
    }
    else
    {
      Serial.println("UDP Ошибка записи!");
    }
  }
  sendPacadeTime = millis();
}

/*
  #################################################################################################
  =================================================================================================
               ФУНКЦИЯ processingResponse()
               обработка ответа из NTP сервера
  =================================================================================================
*/
void processingResponse()
{
  if (flprog::isTimer(sendPacadeTime, 15000)) // проверяем прошло ли время ожидания ответа
  {
    isReplyInProcess = false;
    Udp.stop();
    Serial.println("Нет ответа от сервера!");
    return;
  }
  if (Udp.parsePacket() <= 0)
  {
    return;
  }
  Udp.read(packetBuffer, NTP_PACKET_SIZE);
  Udp.stop();
  cntGettingNTP++;
  uint16_t highWord = word(packetBuffer[40], packetBuffer[41]);
  uint16_t lowWord = word(packetBuffer[42], packetBuffer[43]);
  uint32_t secsSince1900 = ((uint32_t)highWord << 16) | lowWord;
  /*
    -------------------------------------------------------------------------------------------------
                Unix-time время в сек от 01.01.1970,
                    что соответствует 2208988800;
    -------------------------------------------------------------------------------------------------
  */
  uint32_t epoch = secsSince1900 - 2208988800UL;
  uint32_t vr;
  Serial.print(F("\nUTC(Greenwich)="));
  vr = (epoch % 86400L) / 3600;
  if (vr < 10)
  {
    Serial.print('0');
  }
  Serial.print(vr); //--Вывод часов (86400 сек в сутках);
  vr = (epoch % 3600) / 60;
  Serial.print(':');
  if (vr < 10)
  {
    Serial.print('0');
  }
  Serial.print(vr); //--Вывод минут (3600 сек в минуте);
  vr = epoch % 60;
  Serial.print(':');
  if (vr < 10)
  {
    Serial.print('0');
  }
  Serial.print(vr); //--Вывод сек;
  Serial.print(F(";  Time 01.01.1900="));
  Serial.print(secsSince1900); //--Вывод абсолютного времени в сек(с 01.01.1990);
  Serial.print(F(";  Time Unix="));
  Serial.print(epoch); //--Вывод UNIX времени (с 01.01.1970)
  Serial.print(F(";  Счетчик="));
  Serial.print(cntGettingNTP);
  Serial.println(';'); //--Вывод счетчика принятых пакетов;
  isReplyInProcess = false;
};