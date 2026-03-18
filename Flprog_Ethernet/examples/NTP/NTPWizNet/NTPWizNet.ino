/*
  =================================================================================================
                  Test Ethernet NTP
                  Получение по UDP точного времени.
  =================================================================================================
*/
#include "flprogNTP.h" //подключаем библиотеку NTP

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
       Создание NTP клиента
  -------------------------------------------------------------------------------------------------
*/

FLProgNTP ntp(&wiznetInterface);

/*
  -----------------------------------------------------------------------------------------
         Определение рабочих параметров и функций
  -----------------------------------------------------------------------------------------
*/

uint16_t cntGettingNTP = 0; //--Cчетчик принятых пакетов;
uint32_t blinkStartTime = 0;
uint8_t ledPin;

//=================================================================================================
void setup()
{
  Serial.begin(115200);
  while (!Serial)
  {
  }
  ledPin = RT_HW_Base.vPinLed();
  Serial.println(" Тест WizNet NTP клиента ");
  Serial.print("CS - ");
  Serial.println(wiznetInterface.pinCs());
  Serial.print("SPI BUS - ");
  Serial.println(wiznetInterface.spiBus());

  wiznetInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x3E, 0x40); //--Установка MAC-адрес контроллера
  // wiznetInterface.localIP(192, 168, 199, 155);
  // wiznetInterface.resetDhcp();

  /*
    ------------------------------------------------------------------------------------------------ -
    Задание параметров NTP
    ------------------------------------------------------------------------------------------------ -
  */

  ntp.timeServer("time.nist.gov"); //--Имя NTP сервера - сервер точного времени;

  //  ntp.timeServer("ntp1.vniiftri.ru");
  //  ntp.timeServer("128.138.140.44");
  //  ntp.timeServer(IPAddress(128, 138, 140, 44));

  ntp.reqestPeriod(10);
  ntp.setCallBack(onNtp);
  ntp.udp()->setDnsCacheStorageTime(600000); // Устанавливаем клиенту время хранаения DNS кэша 10 минут
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, HIGH);
}

//=================================================================================================
void loop()
{
  wiznetInterface.pool();
  ntp.pool();
  printStatusMessages();
  blinkLed();
}

//=================================================================================================

void onNtp()
{
  cntGettingNTP++;
  Serial.print(cntGettingNTP);
  Serial.print("  Полученно время - ");
  Serial.print(ntp.getUnixTime());
  Serial.print(" - ");
  Serial.print(ntp.getHours());
  Serial.print(":");
  Serial.print(ntp.getMinutes());
  Serial.print(":");
  Serial.print(ntp.getSecond());
  Serial.print(" - ");
  Serial.print(ntp.getDay());
  Serial.print("-");
  Serial.print(ntp.getMonth());
  Serial.print("-");
  Serial.print(ntp.getYear());
  Serial.println();
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
  if (ntp.udp()->getIsChangeStatusWithReset())
  {
    Serial.print("Статус UDP - ");
    Serial.println(flprog::flprogStatusCodeName(ntp.udp()->getStatus()));
  }
  if (ntp.udp()->getIsChangeErrorWithReset())
  {
    uint8_t udpError = ntp.udp()->getError();
    if (udpError != FLPROG_NOT_ERROR)
    {
      Serial.print("Ошибка UDP - ");
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