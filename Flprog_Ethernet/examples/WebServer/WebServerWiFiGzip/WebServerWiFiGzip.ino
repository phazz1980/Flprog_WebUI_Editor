
#include "flprogWebServer.h"
/*
  Отправляемая страница в несжатом виде - 4,09 кб - после сжатия зипом - 1,5 кб



  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mr. Camel</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Pacifico&display=swap");

    body {
      margin: 0;
      box-sizing: border-box;
    }

    .container {
      line-height: 150%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background-color: #e9e9e9;
    }

    .header h1 {
      color: #222222;
      font-size: 30px;
      font-family: "Pacifico", cursive;
    }

    .header .social a {
      padding: 0 5px;
      color: #222222;
    }

    .left {
      float: left;
      width: 180px;
      margin: 0;
      padding: 1em;
    }

    .content {
      margin-left: 190px;
      border-left: 1px solid #d4d4d4;
      padding: 1em;
      overflow: hidden;
    }

    ul {
      list-style-type: none;
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }

    li a {
      display: block;
      color: #000;
      padding: 8px 16px;
      text-decoration: none;
    }

    li a.active {
      background-color: #84e4e2;
      color: white;
    }

    li a:hover:not(.active) {
      background-color: #29292a;
      color: white;
    }

    table {
      font-family: arial, sans-serif;
      border-collapse: collapse;
      width: 100%;
      margin: 30px 0;
    }

    td,
    th {
      border: 1px solid #dddddd;
      padding: 8px;
    }

    tr:nth-child(1) {
      background-color: #84e4e2;
      color: white;
    }

    tr td i.fas {
      display: block;
      font-size: 35px;
      text-align: center;
    }

    .footer {
      padding: 55px 20px;
      background-color: #2e3550;
      color: white;
      text-align: center;
    }
  </style>
  </head>
  <body>
  <div class="container">
    <header class="header">
      <h1>Mr. Camel</h1>
      <div class="social">
        <a href="#"><i class="fab fa-facebook"></i></a>
        <a href="#"><i class="fab fa-instagram"></i></a>
        <a href="#"><i class="fab fa-twitter"></i></a>
      </div>
    </header>
    <aside class="left">
      <img src="./assets/html/mr-camel.jpg" width="160px" />
      <ul>
        <li><a class="active" href="#home">Home</a></li>
        <li><a href="#career">Career</a></li>
        <li><a href="#contact">Contact</a></li>
        <li><a href="#about">About</a></li>
      </ul>
      <br><br>
      <p>"Do something important in life. I convert green grass to code."<br>- Mr Camel</p>
    </aside>
    <main class="content">
      <h2>About Me</h2>
      <p>I don't look like some handsome horse, but I am a real desert king. I can survive days without water.</p>
      <h2>My Career</h2>
      <p>I work as a web developer for a company that makes websites for camel businesses.</p>
      <hr><br>
      <h2>How Can I Help You?</h2>
      <table>
        <tr>
          <th>SKILL 1</th>
          <th>SKILL 2</th>
          <th>SKILL 3</th>
        </tr>
        <tr>
          <td><i class="fas fa-broom"></i></td>
          <td><i class="fas fa-archive"></i></td>
          <td><i class="fas fa-trailer"></i></td>
        </tr>
        <tr>
          <td>Cleaning kaktus in your backyard</td>
          <td>Storing some fat for you</td>
          <td>Taking you through the desert</td>
        </tr>
        <tr>
      </table>
      <form>
        <label>Email: <input type="text" name="email"></label><br>
        <label> Mobile: <input type="text" name="mobile"> </label><br>
        <label>Message: <textarea name="message" rows="5" cols="30"></textarea></label><br>
        <input type="submit" value="Submit" /><br>
      <closeform></closeform></form>
    </main>
    <footer class="footer">© Copyright Mr. Camel</footer>
  </div>
  </body>
  </html>
*/

FLProgOnBoardWifiInterface WifiInterface;
FLProgWebServer webServer(&WifiInterface, 80);

const char headerHTML[] = "HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n";
const char header1HTML[] = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<!DOCTYPE HTML>\r\n<html>";
const char counterHTML[] = "<a href=\"/resetcounter\">RES</a><br>";
const char resetHTML[] = "<a href=\"/counter\">counter</a></html>";

const uint8_t body[] = {31, 139, 8, 0, 0, 0, 0, 0, 0, 0, 173, 88, 253, 110, 219, 54, 16, 255, 127, 192, 222, 129, 83, 176, 173, 5,
                        34, 201, 118, 234, 34, 117, 37, 119, 69, 218, 161, 193, 26, 172, 64, 91, 96, 253, 147, 146, 78, 18, 99, 74, 84, 73, 202, 142, 55, 236,
                        129, 246, 26, 123, 178, 29, 245, 73, 127, 196, 73, 129, 197, 72, 76, 234, 120, 223, 191, 187, 163, 18, 252, 240, 230, 247, 171, 79,
                        95, 62, 188, 37, 185, 46, 248, 242, 251, 239, 2, 243, 77, 56, 45, 179, 208, 129, 210, 193, 39, 230, 25, 208, 4, 87, 132, 4, 5, 104,
                        74, 226, 156, 74, 5, 58, 116, 62, 127, 250, 213, 189, 116, 44, 74, 174, 117, 229, 194, 215, 154, 173, 67, 231, 15, 247, 243, 107, 247,
                        74, 20, 21, 213, 44, 226, 224, 144, 88, 148, 26, 74, 100, 187, 126, 27, 66, 146, 129, 205, 88, 210, 2, 66, 103, 205, 96, 83, 9, 169,
                        173, 179, 27, 150, 232, 60, 76, 96, 205, 98, 112, 155, 205, 57, 97, 37, 211, 140, 114, 87, 197, 148, 67, 56, 245, 38, 157, 36, 205,
                        52, 135, 229, 141, 244, 200, 21, 138, 227, 129, 223, 62, 104, 104, 156, 149, 43, 34, 129, 135, 142, 210, 91, 14, 42, 7, 64, 53, 185,
                        132, 52, 116, 140, 213, 106, 225, 251, 113, 82, 222, 42, 47, 230, 162, 78, 82, 78, 37, 120, 177, 40, 124, 122, 75, 239, 124, 206, 34,
                        229, 167, 104, 147, 75, 55, 160, 68, 1, 254, 220, 155, 206, 189, 11, 63, 86, 202, 167, 156, 123, 5, 43, 61, 92, 119, 134, 52, 42, 154,
                        37, 33, 191, 176, 194, 184, 68, 106, 201, 159, 12, 154, 140, 40, 229, 101, 66, 100, 28, 104, 197, 84, 163, 9, 249, 103, 175, 82, 90, 48,
                        190, 13, 63, 208, 152, 165, 44, 22, 63, 37, 76, 85, 156, 110, 67, 181, 161, 149, 243, 244, 165, 73, 135, 145, 26, 137, 100, 75, 254, 106,
                        215, 132, 20, 84, 102, 172, 92, 144, 201, 203, 254, 73, 36, 238, 92, 197, 254, 100, 101, 182, 192, 181, 76, 64, 186, 248, 168, 35, 255,
                        221, 75, 241, 76, 152, 41, 43, 65, 142, 178, 48, 80, 224, 230, 192, 178, 92, 47, 200, 116, 62, 249, 241, 128, 201, 160, 193, 230, 232,
                        76, 92, 144, 148, 195, 221, 96, 193, 109, 173, 52, 75, 183, 110, 151, 201, 5, 81, 21, 197, 20, 70, 160, 55, 0, 229, 112, 140, 114, 150,
                        149, 46, 211, 80, 168, 5, 137, 241, 32, 200, 129, 86, 209, 36, 105, 60, 152, 206, 171, 81, 112, 68, 227, 85, 38, 69, 93, 38, 40, 155, 11,
                        185, 32, 103, 240, 194, 124, 238, 51, 52, 159, 142, 182, 246, 28, 179, 230, 103, 144, 217, 164, 22, 227, 5, 11, 114, 49, 177, 116, 53,
                        207, 219, 148, 44, 136, 211, 39, 197, 57, 39, 113, 45, 21, 91, 195, 125, 42, 61, 37, 98, 68, 40, 161, 163, 230, 193, 153, 9, 177, 189,
                        57, 106, 208, 40, 143, 67, 170, 71, 25, 41, 23, 20, 35, 105, 30, 14, 2, 154, 154, 192, 16, 93, 218, 118, 31, 2, 98, 140, 37, 20, 71,
                        97, 128, 161, 223, 7, 148, 107, 20, 33, 199, 11, 91, 116, 135, 166, 142, 84, 221, 17, 37, 56, 75, 200, 89, 242, 204, 124, 78, 233, 35,
                        68, 172, 65, 162, 15, 155, 5, 201, 89, 146, 12, 40, 24, 12, 169, 185, 141, 67, 133, 41, 49, 133, 228, 234, 109, 133, 137, 41, 69, 9, 143,
                        113, 112, 114, 60, 123, 138, 150, 202, 85, 32, 89, 186, 175, 149, 51, 59, 79, 3, 154, 35, 46, 226, 213, 65, 158, 38, 147, 35, 42, 47, 49,
                        12, 211, 231, 86, 144, 52, 220, 105, 55, 129, 88, 72, 108, 126, 162, 220, 49, 126, 71, 175, 71, 99, 141, 56, 26, 213, 31, 65, 247, 229, 51,
                        120, 6, 179, 125, 75, 54, 57, 22, 205, 49, 145, 139, 220, 132, 121, 81, 10, 253, 164, 147, 254, 244, 164, 248, 217, 11, 252, 208, 71, 137,
                        215, 20, 27, 185, 5, 71, 59, 190, 84, 34, 224, 207, 15, 195, 60, 32, 6, 5, 115, 90, 41, 204, 100, 191, 58, 192, 240, 100, 232, 54, 99, 134,
                        77, 61, 14, 57, 29, 45, 73, 206, 187, 69, 110, 57, 215, 40, 218, 69, 101, 243, 115, 52, 99, 7, 34, 49, 102, 58, 119, 227, 156, 241, 228,
                        201, 244, 233, 255, 149, 18, 45, 209, 88, 194, 188, 148, 170, 7, 65, 102, 183, 161, 249, 62, 156, 154, 78, 185, 215, 35, 199, 18, 78, 133,
                        208, 118, 83, 30, 60, 157, 163, 32, 50, 155, 156, 110, 160, 51, 184, 152, 207, 39, 167, 252, 57, 109, 4, 206, 60, 191, 31, 122, 129, 223,
                        93, 23, 112, 105, 198, 84, 59, 18, 19, 182, 38, 49, 167, 74, 133, 206, 48, 116, 156, 110, 68, 6, 93, 215, 236, 232, 237, 174, 39, 26, 242,
                        212, 30, 234, 184, 27, 40, 150, 212, 182, 227, 142, 92, 72, 165, 221, 124, 63, 115, 150, 1, 235, 207, 165, 52, 34, 41, 69, 216, 198, 16, 9,
                        177, 66, 146, 207, 240, 151, 62, 150, 145, 149, 74, 211, 76, 210, 226, 155, 57, 245, 134, 105, 109, 28, 219, 231, 11, 124, 244, 163, 143,
                        133, 223, 186, 223, 111, 169, 98, 9, 244, 130, 76, 211, 181, 226, 194, 138, 140, 40, 25, 135, 142, 231, 35, 25, 180, 242, 205, 229, 205,
                        47, 176, 214, 76, 168, 188, 219, 42, 115, 218, 218, 10, 157, 233, 115, 132, 128, 67, 252, 145, 187, 230, 182, 225, 28, 77, 162, 189, 158,
                        182, 109, 244, 215, 163, 179, 28, 47, 60, 206, 242, 29, 254, 53, 86, 7, 120, 27, 58, 228, 236, 142, 198, 120, 109, 50, 46, 94, 53, 223, 15,
                        31, 55, 80, 136, 209, 167, 171, 118, 241, 32, 3, 141, 68, 141, 199, 95, 155, 175, 131, 195, 129, 111, 249, 20, 68, 114, 105, 126, 135, 125,
                        181, 116, 222, 8, 98, 46, 111, 58, 199, 202, 32, 237, 189, 140, 226, 216, 99, 37, 54, 206, 20, 60, 114, 109, 238, 157, 216, 60, 53, 201, 208,
                        252, 18, 255, 98, 56, 136, 22, 248, 56, 1, 207, 49, 226, 92, 114, 35, 123, 36, 86, 67, 206, 154, 44, 245, 187, 2, 193, 109, 99, 29, 107, 197,
                        6, 243, 172, 181, 158, 220, 96, 52, 113, 99, 217, 119, 77, 18, 81, 254, 172, 9, 71, 92, 162, 69, 43, 104, 172, 37, 57, 45, 147, 118, 33, 240,
                        218, 125, 78, 34, 100, 190, 38, 180, 192, 169, 37, 1, 47, 25, 9, 40, 99, 242, 10, 157, 106, 92, 160, 37, 81, 181, 92, 155, 177, 146, 208, 173,
                        66, 4, 232, 220, 40, 220, 80, 68, 159, 55, 154, 221, 26, 115, 179, 37, 125, 178, 246, 173, 217, 8, 185, 34, 216, 182, 40, 217, 64, 132, 106,
                        214, 192, 69, 133, 117, 154, 10, 137, 207, 98, 115, 181, 47, 183, 216, 129, 169, 198, 110, 189, 2, 101, 142, 41, 108, 25, 170, 57, 209, 96, 16,
                        141, 85, 88, 234, 136, 78, 181, 167, 121, 47, 59, 168, 251, 157, 216, 160, 41, 37, 186, 240, 14, 120, 69, 190, 136, 250, 213, 174, 77, 205, 248,
                        177, 161, 161, 165, 181, 51, 251, 124, 249, 241, 183, 235, 247, 239, 201, 20, 239, 254, 249, 61, 180, 217, 9, 218, 197, 30, 13, 183, 242, 164,
                        194, 100, 167, 204, 149, 41, 243, 72, 10, 49, 52, 7, 157, 60, 204, 64, 37, 206, 28, 44, 183, 111, 96, 209, 146, 50, 62, 182, 146, 29, 150, 71,
                        216, 124, 133, 111, 29, 165, 169, 129, 21, 93, 233, 90, 153, 2, 216, 138, 90, 54, 147, 97, 75, 101, 114, 212, 136, 143, 90, 72, 195, 211, 64,
                        49, 197, 156, 155, 36, 35, 219, 209, 195, 159, 168, 129, 163, 33, 35, 62, 112, 214, 100, 57, 126, 67, 7, 213, 199, 27, 140, 164, 157, 156,
                        7, 168, 179, 216, 105, 14, 52, 2, 190, 124, 139, 37, 199, 23, 216, 16, 203, 10, 113, 110, 174, 139, 161, 99, 198, 149, 211, 189, 87, 130,
                        161, 155, 96, 181, 199, 109, 224, 13, 50, 200, 141, 136, 48, 166, 39, 164, 20, 205, 1, 103, 73, 78, 202, 185, 65, 176, 211, 204, 200, 49,
                        188, 88, 89, 253, 203, 109, 209, 18, 28, 34, 197, 6, 51, 57, 55, 47, 185, 28, 23, 23, 19, 99, 89, 127, 248, 62, 35, 109, 163, 84, 29, 21,
                        12, 205, 90, 83, 94, 227, 246, 99, 183, 245, 119, 43, 10, 223, 99, 21, 52, 241, 10, 124, 123, 109, 133, 48, 240, 77, 175, 234, 55, 221, 21,
                        162, 71, 90, 179, 115, 150, 255, 254, 67, 174, 68, 181, 149, 230, 133, 144, 88, 99, 184, 165, 183, 195, 189, 155, 95, 129, 223, 205, 251,
                        230, 18, 96, 254, 159, 240, 31, 231, 139, 68, 30, 95, 16, 0, 0};

uint32_t startCicleTime;
uint32_t maxCicleTime = 0;
uint32_t blinkStartTime = 0;

uint8_t ethernetStatus = 255;
uint8_t ethernetError = 255;

bool isNeedClientSendConnectMessage = true;
bool isNeedClientSendDisconnectMessage = true;

bool isNeedApSendConnectMessage = true;
bool isNeedApSendDisconnectMessage = true;

void setup()
{

  Serial.begin(115200);
  while (!Serial)
  {
  }

  flprog::printConsole(" Тест WebServer - Wifi ");
  pinMode(LED_BUILTIN, OUTPUT);

  WifiInterface.clientOn();
  WifiInterface.mac(0x78, 0xAC, 0xC0, 0x2C, 0x30, 0x45);
  // WifiInterface.localIP(IPAddress(192, 168, 199, 38));
  // WifiInterface.resetDhcp();
  WifiInterface.setClientSsid("yana");
  WifiInterface.setClientPassword("12345678");
  webServer.addHandler("", mainPage);
  webServer.addHandler("counter", counterPage);
  webServer.addHandler("resetcounter", resetCounterPage);
}

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

void mainPage(FLProgWebServer *server)
{
  server->print(headerHTML);
  server->write(body, sizeof(body));
}

void counterPage(FLProgWebServer *server)
{
  server->print(header1HTML);
  server->print(counterHTML);
  server->print(maxCicleTime);
  server->print("</html>");
}

void resetCounterPage(FLProgWebServer *server)
{
  maxCicleTime = 0;
  server->print(header1HTML);
  server->print(resetHTML);
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