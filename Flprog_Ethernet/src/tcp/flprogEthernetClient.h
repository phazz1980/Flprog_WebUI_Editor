#pragma once
#include <Arduino.h>
#include "flprogUtilites.h"
#include "../abstract/flprogAbstactEthernetTCPChanel.h"
#include "../udp/flprogDns.h"

class FLProgEthernetClient : public FLProgAbstactEthernetTCPChanel
{
public:
    FLProgEthernetClient(){};
    FLProgEthernetClient(FLProgAbstractTcpInterface *sourse);

    virtual void setSourse(FLProgAbstractTcpInterface *sourse) { init(sourse); };
    void init(FLProgAbstractTcpInterface *sourse);
    uint8_t status();
    int connect(IPAddress ip, uint16_t port);
    int connect(const char *host, uint16_t port);

    uint8_t connected();
    uint8_t getSocketNumber() const { return _sockindex; };
    void setConnectionTimeout(uint16_t timeout) { _timeout = timeout; };
    uint16_t getConnectionTimeout() { return _timeout; };
    void setDnsCacheStorageTime(uint32_t time) { _dns.setDnsCacheStorageTime(time); };
    uint32_t getDnsCacheStorageTime() { return _dns.getDnsCacheStorageTime(); };
	virtual void setFlags();
    
protected:

    FLProgDNSClient _dns;
    uint32_t _timeout = 20000;
    uint32_t _startConnectTime;
    bool isInit = false;
};
