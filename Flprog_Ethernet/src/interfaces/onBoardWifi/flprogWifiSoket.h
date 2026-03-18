#pragma once
#include "flprogUtilites.h"
#if defined(RT_HW_CORE_ESP32) || defined(RT_HW_CORE_ESP8266) || (defined(RT_HW_CORE_RP2040) && defined(ARDUINO_RASPBERRY_PI_PICO_W))
#define FLPROG_ONBOARD_WIFI_MODULE
#else
#define FLPROG_ANON_ONBOARD_WIFI_MODULE
#endif

#ifdef FLPROG_ONBOARD_WIFI_MODULE

#if defined(RT_HW_CORE_ESP32)
#define CLOSED 0
#define LISTEN 1
#define SYN_SENT 2
#define SYN_RCVD 3
#define ESTABLISHED 4
#define FIN_WAIT_1 5
#define FIN_WAIT_2 6
#define CLOSE_WAIT 7
#define CLOSING 8
#define LAST_ACK 9
#define TIME_WAIT 10
#endif

#ifdef RT_HW_CORE_ESP32

#include "WiFi.h"
#include <esp_wifi.h>
#include <WiFiClient.h>
#include <WiFiAP.h>
#include <WiFiUdp.h>
#endif

#ifdef RT_HW_CORE_ESP8266
#include "ESP8266WiFi.h"
#include <WiFiUdp.h>
#endif

#ifdef RT_HW_CORE_RP2040
#include "WiFi.h"
#include <WiFiUdp.h>
#endif

#define FLPROG_WIFI_NOT_DEFINED_SOKET 0
#define FLPROG_WIFI_SERVER_SOKET 1
#define FLPROG_WIFI_CLIENT_SOKET 2
#define FLPROG_WIFI_UDP_SOKET 3

#define FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM 8

class FLProgWiFiServer : public WiFiServer
{
public:
    FLProgWiFiServer() : WiFiServer(0) {};
};

class FLProgWifiSoket
{
public:
    FLProgWifiSoket() {};
    bool isUsed() { return _isUsed; };
    void disconnect();
    void close();
    void beServerTcp(uint16_t port);
    void beUDP(uint16_t port);
    void beCliendTcp(uint16_t port);
    bool isListen();
    uint8_t connected();
    int available();
    int read();
    int read(uint8_t *buf, int16_t len);
    size_t write(const uint8_t *buffer, size_t len);
    uint8_t peek();
    int beginIpUDPPacket(uint8_t *addr, uint16_t port);
    int endUDPPacket();
    int parsePacket();
    int connect(IPAddress ip, uint16_t port);
    uint8_t status();

private:
    bool _isUsed = false;
    uint8_t _soketType = FLPROG_WIFI_NOT_DEFINED_SOKET;
    WiFiClient _client;
    FLProgWiFiServer _server;
    WiFiUDP _udp;
};
#endif
