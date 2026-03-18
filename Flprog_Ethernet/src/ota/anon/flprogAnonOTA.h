#pragma once
#include <Arduino.h>

#if !(defined(ARDUINO_ARCH_ESP32) || defined(ARDUINO_ARCH_ESP8266))
#include "../../flprogOTA.h"

class FLProgOTA : public FLProgAbstractOTA
{
};

#endif