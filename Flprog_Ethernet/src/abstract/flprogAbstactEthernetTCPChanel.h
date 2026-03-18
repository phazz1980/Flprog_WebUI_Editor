#pragma once
#include <Arduino.h>
#include "IPAddress.h"
#include "flprogUtilites.h"
#include "flprogAbstactEthernetChanel.h"

class FLProgAbstactEthernetTCPChanel : public FLProgAbstactEthernetChanel
{
public:
    int available();

    virtual size_t write(const uint8_t *buf, size_t size);

    int read() { return _sourse->readFromSoket(_sockindex); };
    int read(uint8_t *buf, size_t size) { return _sourse->readFromSoket(_sockindex, buf, size); };
    int peek() { return _sourse->peekSoket(_sockindex); };

    uint16_t localPort() { return _sourse->localPortSoket(_sockindex); };
    IPAddress remoteIP() { return _sourse->remoteIPSoket(_sockindex); };
    uint16_t remotePort() { return _sourse->remotePortSoket(_sockindex); };
};