#pragma once
#include <Arduino.h>
#include "flprogUtilites.h"
#include "../abstract/flprogAbstactEthernetTCPChanel.h"

class FLProgEthernetServer : public FLProgAbstactEthernetTCPChanel
{
public:
    FLProgEthernetServer() {};
    FLProgEthernetServer(FLProgAbstractTcpInterface *sourse, uint16_t port = 80);
    uint8_t pool();
    uint8_t begin();
    uint8_t setPort(uint16_t port);
    uint8_t connected();
    void stopConnection();
    void setCallback(void (*func)(void)) { _callbackFunction = func; };

    virtual void stop();

private:
    uint16_t _port = 0;
    void (*_callbackFunction)(void) = 0;
    bool _serverIsConnect = false;
};
