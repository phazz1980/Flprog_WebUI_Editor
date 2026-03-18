#pragma once
#include <Arduino.h>

#if defined(ARDUINO_ARCH_ESP32) || defined(ARDUINO_ARCH_ESP8266)
#if defined(ARDUINO_ARCH_ESP32)
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#endif

#if defined(ARDUINO_ARCH_ESP8266)
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <WiFiUdp.h>
#endif

#include <ArduinoOTA.h>
#include "../../flprogOTA.h"

class FLProgOTA : public FLProgAbstractOTA
{
public:
    virtual void setPassword(String password);
    virtual void setName(String name);

protected:
    virtual void privatePool();
    void init();
};

#endif