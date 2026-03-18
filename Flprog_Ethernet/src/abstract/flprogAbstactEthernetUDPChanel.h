#pragma once
#include <Arduino.h>
#include "IPAddress.h"
#include "flprogUtilites.h"
#include "flprogAbstactEthernetChanel.h"

class FLProgAbstactEthernetUDPChanel : public FLProgAbstactEthernetChanel
{
public:
    virtual size_t write(const uint8_t *buffer, size_t size);

    virtual int read();
    int read(uint8_t *buffer, size_t len);
    virtual int available();
    IPAddress remoteIP() { return _remoteIP; };
    uint16_t remotePort() { return _remotePort; };
    uint16_t localPort() { return _port; }
    uint8_t begin(uint16_t port);
    int beginIpPacket(IPAddress ip, uint16_t port);
    int parsePacket();
    int endPacket();

    int peek();

protected:
    uint16_t _offset;
    uint16_t _remaining;
    IPAddress _remoteIP;
    uint16_t _remotePort;
    uint16_t _port;
};
