#include "flprogWiznetInterface.h"

int FLProgWiznetInterface::parsePacketSocet(uint8_t soket)
{
    (void)soket;
    return 0;
}

FLProgWiznetInterface::FLProgWiznetInterface(int pinCs, uint8_t bus)
{
    init(pinCs, bus);
}

FLProgWiznetInterface::FLProgWiznetInterface()
{
    init(-1, 255);
}
void FLProgWiznetInterface::init(int pinCs, uint8_t bus)
{
    _hardware.setPinCs(pinCs);
    _hardware.setSpiBus(bus);
    _dhcp.setSourse(this);
}

uint8_t FLProgWiznetInterface::pool()
{

    if (_eventsCount < _skippingEvents)
    {
        _eventsCount++;
        return FLPROG_SUCCESS;
    }
    _eventsCount = 0;
    setFlags();
    if (pinCs() == -1)
    {
        return FLPROG_ERROR;
    }

    if (!_hardware.isInit())
    {
        return initHarware();
    }

    if (_status == FLPROG_WAIT_ETHERNET_LINK_ON_STATUS)
    {
        return checkHardware();
    }

    if (_isNeedReconect)
    {
        _lastReconnectTime = flprog::timeBack(_reconnectEthernetPeriod);
        _status = FLPROG_WAIT_ETHERNET_CONNECT_STATUS;
        _isNeedReconect = false;
        return connect();
    }

    if (_status != FLPROG_READY_STATUS)
    {
        return connect();
    }

    if (checkHardware() == FLPROG_ERROR)
    {
        return FLPROG_ERROR;
    }

    return maintain();
}

uint8_t FLProgWiznetInterface::initHarware()
{
    _status = FLPROG_WAIT_ETHERNET_HARDWARE_INIT_STATUS;

    uint8_t result = _hardware.init();
    if (result == FLPROG_ERROR)
    {
        _errorCode = _hardware.getError();
        return FLPROG_ERROR;
    }
    if (result == FLPROG_WAIT)
    {
        return FLPROG_WAIT;
    }
    _errorCode = FLPROG_NOT_ERROR;
    _status = FLPROG_WAIT_ETHERNET_LINK_ON_STATUS;
    return FLPROG_SUCCESS;
}

uint8_t FLProgWiznetInterface::connect()
{
    if (isDhcp())
    {
        if (_status != FLPROG_WAIT_ETHERNET_DHCP_STATUS)
        {
            if (!flprog::isTimer(_lastReconnectTime, _reconnectEthernetPeriod))
            {
                return FLPROG_WAIT;
            }
            _hardware.setMACAddress(_macAddress);
            _hardware.setOnlyLocalIP(FLPROG_INADDR_NONE);
        }
        return begin();
    }
    _hardware.setMACAddress(_macAddress);
    if (_dnsIp == FLPROG_INADDR_NONE)
    {
        _dnsIp = _ip;
        _dnsIp[3] = 1;
    }
    if (_gatewayIp == FLPROG_INADDR_NONE)
    {
        _gatewayIp = _ip;
        _gatewayIp[3] = 1;
    }
    return begin(_ip, _dnsIp, _gatewayIp, _subnetIp);
}

uint8_t FLProgWiznetInterface::checkHardware()
{
    if (!(flprog::isTimer(_lastCheckEthernetStatusTime, _checkEthernetStatusPeriod)))
    {
        return FLPROG_SUCCESS;
    }
    _lastCheckEthernetStatusTime = millis();
    if (_hardware.checkHardware() == FLPROG_ERROR)
    {
        _status = FLPROG_WAIT_ETHERNET_HARDWARE_INIT_STATUS;
        _errorCode = _hardware.getError();
        return FLPROG_ERROR;
    }
    return checkHarwareLinkStatus();
}

uint8_t FLProgWiznetInterface::checkHarwareLinkStatus()
{
    if (_hardware.getLinkStatus() == FLPROG_ETHERNET_LINK_ON)
    {
        if (_status != FLPROG_READY_STATUS)
        {
            _status = FLPROG_WAIT_ETHERNET_CONNECT_STATUS;
        }
        _errorCode = FLPROG_NOT_ERROR;
        return FLPROG_SUCCESS;
    }
    _status = FLPROG_WAIT_ETHERNET_LINK_ON_STATUS;
    _isNeedReconect = true;
    if (_status == FLPROG_READY_STATUS)
    {
        _errorCode = FLPROG_ETHERNET_LINK_OFF_ERROR;
    }
    return FLPROG_ERROR;
}

uint8_t FLProgWiznetInterface::begin()
{
    _status = FLPROG_WAIT_ETHERNET_DHCP_STATUS;
    uint8_t result = _dhcp.beginWithDHCP(_timeout, _responseTimeout);
    if (result == FLPROG_ERROR)
    {
        _status = FLPROG_WAIT_ETHERNET_CONNECT_STATUS;
        _errorCode = _dhcp.getError();
        return FLPROG_ERROR;
    }
    if (result == FLPROG_WAIT)
    {
        return FLPROG_WAIT;
    }
    if ((_dhcp.getLocalIp()) == FLPROG_INADDR_NONE)
    {
        _status = FLPROG_WAIT_ETHERNET_CONNECT_STATUS;
        _errorCode = FLPROG_ETHERNET_DHCP_NOT_CORRECT_RESULT_ERROR;
        return FLPROG_ERROR;
    }
    _ip = _dhcp.getLocalIp();
    _gatewayIp = _dhcp.getGatewayIp();
    _subnetIp = _dhcp.getSubnetMask();
    _dnsIp = _dhcp.getDnsServerIp();
    _hardware.setNetSettings(_ip, _gatewayIp, _subnetIp);
    _hardware.socketPortRand(micros());
    _isNeedReconect = false;
    _startMaintainTime = millis();
    _lastReconnectTime = millis();
    _lastCheckEthernetStatusTime = millis();
    _status = FLPROG_READY_STATUS;
    _errorCode = FLPROG_NOT_ERROR;
    return FLPROG_SUCCESS;
}

uint8_t FLProgWiznetInterface::maintain()
{
    if (!isDhcp())
    {
        return FLPROG_SUCCESS;
    }
    if (!_isMaintainMode)
    {
        if (!flprog::isTimer(_startMaintainTime, _maintainPeriod))
        {
            return FLPROG_SUCCESS;
        }
    }
    _isMaintainMode = true;
    uint8_t result = _dhcp.beginWithDHCP(_timeout, _responseTimeout);
    if (result == FLPROG_ERROR)
    {
        _isMaintainMode = false;
        _errorCode = _dhcp.getError();
        _startMaintainTime = millis();
        return FLPROG_ERROR;
    }
    if (result == FLPROG_WAIT)
    {
        return FLPROG_SUCCESS;
    }
    _startMaintainTime = millis();
    _isMaintainMode = false;
    if ((_dhcp.getLocalIp()) != FLPROG_INADDR_NONE)
    {
        _ip = _dhcp.getLocalIp();
        _gatewayIp = _dhcp.getGatewayIp();
        _subnetIp = _dhcp.getSubnetMask();
        _dnsIp = _dhcp.getDnsServerIp();
        _hardware.setNetSettings(_ip, _gatewayIp, _subnetIp);
        _hardware.socketPortRand(micros());
        return FLPROG_SUCCESS;
    }
    _errorCode = FLPROG_ETHERNET_DHCP_NOT_CORRECT_RESULT_ERROR;
    return FLPROG_ERROR;
}

uint8_t FLProgWiznetInterface::begin(IPAddress ip)
{
    IPAddress dns = ip;
    dns[3] = 1;
    return begin(ip, dns);
}

uint8_t FLProgWiznetInterface::begin(IPAddress ip, IPAddress dns)
{
    IPAddress gateway = ip;
    gateway[3] = 1;
    return begin(ip, dns, gateway);
}

uint8_t FLProgWiznetInterface::begin(IPAddress ip, IPAddress dns, IPAddress gateway)
{
    IPAddress subnet(255, 255, 255, 0);
    return begin(ip, dns, gateway, subnet);
}

uint8_t FLProgWiznetInterface::begin(IPAddress ip, IPAddress dns, IPAddress gateway, IPAddress subnet)
{
    _ip = ip;
    _dnsIp = dns;
    _subnetIp = subnet;
    _gatewayIp = gateway;
    _hardware.setNetSettings(_macAddress, _ip, _gatewayIp, _subnetIp);
    _hardware.socketPortRand(micros());
    _isNeedReconect = false;
    _lastReconnectTime = millis();
    _lastCheckEthernetStatusTime = millis();
    _startMaintainTime = millis();
    _status = FLPROG_READY_STATUS;
    _errorCode = FLPROG_NOT_ERROR;
    return FLPROG_SUCCESS;
}

uint8_t FLProgWiznetInterface::hardwareStatus()
{
    return _hardware.getChip();
}

void FLProgWiznetInterface::setFlags()
{
    FLProgAbstractTcpInterface::setFlags();
    if (isInit())
    {
        if (!_oldIsInit)
        {
            _oldIsInit = true;
            bitWrite(_statusForExt, 2, 1);
        }
    }
    else
    {
        if (_oldIsInit)
        {
            _oldIsInit = false;
            bitWrite(_statusForExt, 3, 1);
        }
    }
    _hardware.setFlags();
}