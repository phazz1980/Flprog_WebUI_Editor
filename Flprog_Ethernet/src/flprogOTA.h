#pragma once
#include <Arduino.h>

class FLProgAbstractOTA
{
public:
    String getPasssword() { return _password; };
    String getName() { return _name; };
    bool getWorkStatus() { return _workStatus; };
    virtual void setPassword(String password) { (void)password; };
    virtual void setName(String name) { (void)name; };
    void setWorkStatus(bool workStatus) { _workStatus = workStatus; };

    void pool();

protected:
    virtual void privatePool() {};
    String _password = "";
    String _name = "";
    bool _isInit = false;
    bool _workStatus = true;
};

#if defined(ARDUINO_ARCH_ESP32) || defined(ARDUINO_ARCH_ESP8266)
#include "ota/esp/flprogEspOTA.h"
#else
#include "ota/anon/flprogAnonOTA.h"
#endif