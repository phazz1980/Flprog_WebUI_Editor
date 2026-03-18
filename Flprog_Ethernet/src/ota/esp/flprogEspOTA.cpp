#include "flprogEspOTA.h"
#if defined(ARDUINO_ARCH_ESP32) || defined(ARDUINO_ARCH_ESP8266)

void FLProgOTA::setPassword(String password)
{
    if (_password.equals(password))
    {
        return;
    }
    _password = password;
    if (_isInit)
    {
        ArduinoOTA.end();
    }
    _isInit = false;
}

void FLProgOTA::setName(String name)
{
    if (_name.equals(name))
    {
        return;
    }
    _name = name;
    if (_isInit)
    {
        ArduinoOTA.end();
    }
    _isInit = false;
}

void FLProgOTA::privatePool()
{
    if (!_isInit)
    {
        init();
        return;
    }
    ArduinoOTA.handle();
}

void FLProgOTA::init()
{
    if (_name.length())
    {
        ArduinoOTA.setHostname(_name.c_str());
    }
    if (_password.length())
    {
        ArduinoOTA.setPassword(_password.c_str());
    }
    ArduinoOTA.begin();
    _isInit = true;
}

#endif