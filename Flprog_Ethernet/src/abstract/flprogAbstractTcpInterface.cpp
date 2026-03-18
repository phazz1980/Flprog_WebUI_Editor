#include "flprogAbstractTcpInterface.h"

void FLProgAbstractTcpInterface::setDhcp()
{
    if (_isDhcp)
    {
        return;
    }
    _isDhcp = true;
    _isNeedReconect = true;
}

void FLProgAbstractTcpInterface::resetDhcp()
{
    if (!_isDhcp)
    {
        return;
    }
    _isDhcp = false;
    _isNeedReconect = true;
}

void FLProgAbstractTcpInterface::dhcpMode(bool val)
{
    if (_isDhcp == val)
    {
        return;
    }
    _isDhcp = val;
    _isNeedReconect = true;
}

bool FLProgAbstractTcpInterface::isDhcp()
{
    if (_isDhcp)
    {
        return true;
    }
    if (_ip == FLPROG_INADDR_NONE)
    {
        return true;
    }
    return false;
};

void FLProgAbstractTcpInterface::localIP(IPAddress ip)
{
    if (_ip == ip)
    {
        return;
    }
    _ip = ip;
    _isNeedReconect = true;
}

void FLProgAbstractTcpInterface::dns(IPAddress ip)
{
    if (_dnsIp == ip)
    {
        return;
    }
    _dnsIp = ip;
    _isNeedReconect = true;
}

void FLProgAbstractTcpInterface::subnet(IPAddress ip)
{
    if (_subnetIp == ip)
    {
        return;
    }
    _subnetIp = ip;
    _isNeedReconect = true;
}

void FLProgAbstractTcpInterface::gateway(IPAddress ip)
{
    if (_gatewayIp == ip)
    {
        return;
    }
    _gatewayIp = ip;
    _isNeedReconect = true;
}

void FLProgAbstractTcpInterface::mac(uint8_t m0, uint8_t m1, uint8_t m2, uint8_t m3, uint8_t m4, uint8_t m5)
{
    if (flprog::applyMac(m0, m1, m2, m3, m4, m5, _macAddress))
    {
        _isNeedReconect = true;
    }
}

void FLProgAbstractTcpInterface::mac(uint8_t *mac_address)
{
    for (uint8_t i = 0; i < 6; i++)
    {
        _macAddress[i] = mac_address[i];
    }
}

bool FLProgAbstractTcpInterface::checkMac(uint8_t *mac)
{
    for (uint8_t i = 0; i < 6; i++)
    {
        if (mac[i] > 0)
        {
            return true;
        }
    }
    return false;
}

void FLProgAbstractTcpInterface::setFlags()
{
    AbstractFLProgClass::setFlags();
    if (isReady())
    {
        if (!_oldIsReady)
        {
            _isChangeIsIsReady = true;
            _oldIsReady = true;
            bitWrite(_statusForExt, 4, 1);
        }
    }
    else
    {
        if (_oldIsReady)
        {
            _isChangeIsIsReady = true;
            _oldIsReady = false;
            bitWrite(_statusForExt, 5, 1);
        }
    }
}

bool FLProgAbstractTcpInterface::getIsChangeIsReadyWithReset()
{
    bool temp = _isChangeIsIsReady;
    _isChangeIsIsReady = false;
    return temp;
}