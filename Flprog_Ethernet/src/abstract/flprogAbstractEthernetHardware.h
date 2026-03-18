#pragma once
#include <Arduino.h>
#include "IPAddress.h"
#include "flprogUtilites.h"

class FLProgAbstractEthernetHardware : public AbstractFLProgClass
{
public:
    virtual uint8_t init() = 0;
    virtual bool isInit() = 0;
    virtual uint8_t getLinkStatus() = 0;
    virtual void setGatewayIp(IPAddress addr) = 0;
    virtual IPAddress getGatewayIp() = 0;
    virtual void setSubnetMask(IPAddress addr) = 0;
    virtual IPAddress getSubnetMask() = 0;
    virtual void setMACAddress(const uint8_t *addr) = 0;
    virtual void getMACAddress(uint8_t *addr) = 0;
    virtual void setIPAddress(IPAddress addr) = 0;
    virtual IPAddress getIPAddress() = 0;
    virtual void setRetransmissionTime(uint16_t timeout) = 0;
    virtual void setRetransmissionCount(uint8_t retry) = 0;
    virtual uint8_t getChip() = 0;
    virtual uint8_t maxSoketNum() = 0;

    // утилиты
    virtual void setNetSettings(uint8_t *mac, IPAddress ip) = 0;
    virtual void setNetSettings(IPAddress ip, IPAddress gateway, IPAddress subnet) = 0;
    virtual void setNetSettings(uint8_t *mac, IPAddress ip, IPAddress gateway, IPAddress subnet) = 0;
    virtual void setOnlyMACAddress(const uint8_t *mac_address) = 0;
    virtual void setOnlyLocalIP(const IPAddress local_ip) = 0;
    virtual void setOnlySubnetMask(const IPAddress subnet) = 0;
    virtual void setOnlyGatewayIP(const IPAddress gateway) = 0;
    virtual IPAddress localIP() = 0;
    virtual IPAddress subnetMask() = 0;
    virtual IPAddress gatewayIP() = 0;
    virtual void MACAddress(uint8_t *mac_address) = 0;
};