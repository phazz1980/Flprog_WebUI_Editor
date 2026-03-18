#include "flprogOnBoardWifiInterface.h"
#ifdef FLPROG_ONBOARD_WIFI_MODULE

bool FLProgOnBoardWifiInterface::clientIsReady()
{
    if (!_clientWorkStatus)
    {
        return false;
    }
    return WiFi.isConnected();
}

bool FLProgOnBoardWifiInterface::isReady()
{
    if (apIsReady())
    {
        return true;
    }
    if (clientIsReady())
    {
        return true;
    }
    return false;
}

uint8_t FLProgOnBoardWifiInterface::pool()
{
    if (_clientWorkStatus)
    {
        if (_status == FLPROG_WAIT_WIFI_CLIENT_CONNECT)
        {
            if (WiFi.isConnected())
            {
                _ip = WiFi.localIP();
                _subnetIp = WiFi.subnetMask();
                _gatewayIp = WiFi.gatewayIP();
                _dnsIp = WiFi.dnsIP();
                _status = FLPROG_READY_STATUS;
            }
        }
        if (_status == FLPROG_READY_STATUS)
        {
            if (!WiFi.isConnected())
            {
                if (isDhcp())
                {
                    _ip = FLPROG_INADDR_NONE;
                    _subnetIp = FLPROG_INADDR_NONE;
                    _gatewayIp = FLPROG_INADDR_NONE;
                    _dnsIp = FLPROG_INADDR_NONE;
                }
                _status = FLPROG_WAIT_WIFI_CLIENT_CONNECT;
            }
        }
    }
    if (_apIsNeedReconect)
    {
        if (_apWorkStatus)
        {
            apConnect();
        }
        else
        {
            apDisconnect();
        }
    }
    if (_isNeedReconect)
    {
        if (_clientWorkStatus)
        {
            clientConnect();
        }
        else
        {
            clientDisconnect();
        }
    }
    setFlags();
    return 0;
}

void FLProgOnBoardWifiInterface::apConnect()
{
    WiFi.softAPdisconnect();
    if (_apIp == FLPROG_INADDR_NONE)
    {
        _apIp = IPAddress(192, 168, 0, 1);
    }
    if (_apGatewayIp == FLPROG_INADDR_NONE)
    {
        _apGatewayIp = _apIp;
        _apGatewayIp[3] = 1;
    }
    if (_apDnsIp == FLPROG_INADDR_NONE)
    {
        _apDnsIp = _apIp;
        _apDnsIp[3] = 1;
    }
    WiFi.softAPConfig(_apIp, _apGatewayIp, _apSubnetIp);
    if (checkMac(_apMacaddress))
    {
#ifdef RT_HW_CORE_ESP32
        esp_wifi_set_mac(WIFI_IF_AP, _apMacaddress);
#endif
#ifdef RT_HW_CORE_ESP8266
        wifi_set_macaddr(SOFTAP_IF, _apMacaddress);
#endif
#ifdef RT_HW_CORE_RP2040
        WiFi.macAddress(_apMacaddress);
#endif
    }
    _apStatus = WiFi.softAP(_apSsid, _apPassword);
    _apIsNeedReconect = false;
}

void FLProgOnBoardWifiInterface::apDisconnect()
{
    WiFi.softAPdisconnect();
    _apStatus = false;
    _apIsNeedReconect = false;
}
void FLProgOnBoardWifiInterface::clientConnect()
{
    if (WiFi.isConnected())
    {
        WiFi.disconnect();
        delay(100);
    }
    if (isDhcp())
    {
        WiFi.config(FLPROG_INADDR_NONE, FLPROG_INADDR_NONE, FLPROG_INADDR_NONE, FLPROG_INADDR_NONE);
    }
    else
    {
        if (_gatewayIp == FLPROG_INADDR_NONE)
        {
            _gatewayIp = _ip;
            _gatewayIp[3] = 1;
        }
        if (_dnsIp == FLPROG_INADDR_NONE)
        {
            _dnsIp = _ip;
            _dnsIp[3] = 1;
        }
        WiFi.config(_ip, _gatewayIp, _subnetIp, _dnsIp);
    }
    if (checkMac(_macAddress))
    {
#ifdef RT_HW_CORE_ESP32
        esp_wifi_set_mac(WIFI_IF_STA, _macAddress);
#endif
#ifdef RT_HW_CORE_ESP8266
        wifi_set_macaddr(STATION_IF, _macAddress);
#endif
#ifdef RT_HW_CORE_RP2040
        WiFi.macAddress(_macAddress);
#endif
    }
#ifndef RT_HW_CORE_RP2040
    WiFi.setAutoConnect(_autoConnect);
    WiFi.setAutoReconnect(_autoReconnect);
#endif
#ifdef RT_HW_CORE_RP2040
    WiFi.begin(_clientSsid.c_str(), _clientPassword.c_str());
#else
    WiFi.begin(_clientSsid, _clientPassword);
#endif
    _status = FLPROG_WAIT_WIFI_CLIENT_CONNECT;
    _isNeedReconect = false;
}

void FLProgOnBoardWifiInterface::clientDisconnect()
{
    WiFi.disconnect();
    if (isDhcp())
    {
        _ip = FLPROG_INADDR_NONE;
        _subnetIp = FLPROG_INADDR_NONE;
        _gatewayIp = FLPROG_INADDR_NONE;
        _dnsIp = FLPROG_INADDR_NONE;
    }
    _isNeedReconect = false;
}

void FLProgOnBoardWifiInterface::setApSsid(String ssid)
{
    if (ssid.equals(_apSsid))
    {
        return;
    }
    _apSsid = ssid;
    _apIsNeedReconect = true;
}

void FLProgOnBoardWifiInterface::setApPassword(String password)
{
    if (password.equals(_apPassword))
    {
        return;
    }
    _apPassword = password;
    _apIsNeedReconect = true;
}

void FLProgOnBoardWifiInterface::setClientSsid(String ssid)
{
    if (ssid.equals(_clientSsid))
    {
        return;
    }
    _clientSsid = ssid;
    _isNeedReconect = true;
}

void FLProgOnBoardWifiInterface::setClientPassword(String password)
{
    if (password.equals(_clientPassword))
    {
        return;
    }
    _clientPassword = password;
    _isNeedReconect = true;
}

void FLProgOnBoardWifiInterface::apMac(uint8_t m0, uint8_t m1, uint8_t m2, uint8_t m3, uint8_t m4, uint8_t m5)
{
    if (flprog::applyMac(m0, m1, m2, m3, m4, m5, _apMacaddress))
    {
        _apIsNeedReconect = true;
    }
}

void FLProgOnBoardWifiInterface::apLocalIP(IPAddress ip)
{
    if (ip == _apIp)
    {
        return;
    }
    _apIp = ip;
    _apIsNeedReconect = true;
}

void FLProgOnBoardWifiInterface::apDns(IPAddress ip)
{
    if (ip == _apDnsIp)
    {
        return;
    }
    _apDnsIp = ip;
    _apIsNeedReconect = true;
}

void FLProgOnBoardWifiInterface::apSubnet(IPAddress ip)
{
    if (ip == _apSubnetIp)
    {
        return;
    }
    _apSubnetIp = ip;
    _apIsNeedReconect = true;
}

void FLProgOnBoardWifiInterface::apGateway(IPAddress ip)
{
    if (ip == _apGatewayIp)
    {
        return;
    }
    _apGatewayIp = ip;
    _apIsNeedReconect = true;
}

void FLProgOnBoardWifiInterface::setAutoConnect(bool autoConnect)
{
    if (_autoConnect == autoConnect)
    {
        return;
    }
    _autoConnect = autoConnect;
    _isNeedReconect = true;
}
void FLProgOnBoardWifiInterface::setAutoReconnect(bool autoReconnect)
{
    if (_autoReconnect == autoReconnect)
    {
        return;
    }
    _autoReconnect = autoReconnect;
    _isNeedReconect = true;
}

void FLProgOnBoardWifiInterface::clientOn()
{
    clientMode(true);
}

void FLProgOnBoardWifiInterface::clientOff()
{
    clientMode(false);
}

void FLProgOnBoardWifiInterface::clientMode(bool val)
{
    if (_clientWorkStatus == val)
    {
        return;
    }
    _clientWorkStatus = val;
#ifdef RT_HW_CORE_RP2040
    if (_clientWorkStatus)
    {
        if (_apWorkStatus)
        {
            _apWorkStatus = false;
            apDisconnect();
        }
    }
#endif
    _isNeedReconect = true;
}

void FLProgOnBoardWifiInterface::apOn()
{
    apMode(true);
}

void FLProgOnBoardWifiInterface::apOff()
{
    apMode(false);
}

void FLProgOnBoardWifiInterface::apMode(bool val)
{
    if (_apWorkStatus == val)
    {
        return;
    }
    _apWorkStatus = val;
#ifdef RT_HW_CORE_RP2040
    if (_apWorkStatus)
    {
        if (_clientWorkStatus)
        {
            _clientWorkStatus = false;
            clientDisconnect();
        }
    }
#endif
    _apIsNeedReconect = true;
}

uint8_t FLProgOnBoardWifiInterface::type()
{
#ifdef RT_HW_CORE_ESP8266
    return FLPROG_ETHERNET_ON_BOARD_WIFI_ESP8266;
#else
#ifdef RT_HW_CORE_ESP32
    return FLPROG_ETHERNET_ON_BOARD_WIFI_ESP32;
#else
#ifdef RT_HW_CORE_RP2040
    return FLPROG_ETHERNET_ON_BOARD_WIFI_RP2040;
#else
    return FLPROG_ETHERNET_ON_BOARD_WIFI_ANON;
#endif
#endif
#endif
}

void FLProgOnBoardWifiInterface::disconnecSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return;
    }
    _sokets[soket].disconnect();
}

void FLProgOnBoardWifiInterface::closeSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return;
    }
    _sokets[soket].close();
}

uint8_t FLProgOnBoardWifiInterface::getServerTCPSoket(uint16_t port)
{
    if (!isReady())
    {
        return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
    }
    uint8_t result = getFreeSoketIndex();
    if (result >= FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM)
    {
        return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
    }
    _sokets[result].beServerTcp(port);
    return result;
}

uint8_t FLProgOnBoardWifiInterface::getClientTCPSoket(uint16_t port)
{
    if (!isReady())
    {
        return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
    }
    uint8_t result = getFreeSoketIndex();
    if (result >= FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM)
    {
        return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
    }
    _sokets[result].beCliendTcp(port);
    return result;
}

bool FLProgOnBoardWifiInterface::isListenSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return false;
    }
    return _sokets[soket].isListen();
}

uint8_t FLProgOnBoardWifiInterface::soketConnected(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].connected();
}

uint8_t FLProgOnBoardWifiInterface::connectSoket(uint8_t soket, IPAddress ip, uint16_t port)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }

    return _sokets[soket].connect(ip, port);
}

uint8_t FLProgOnBoardWifiInterface::isConnectStatusSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return false;
    }
    uint8_t status = _sokets[soket].status();
    if (status == ESTABLISHED)
    {
        return true;
    }
    if (status == CLOSE_WAIT)
    {
        return true;
    }
    return false;
}

uint8_t FLProgOnBoardWifiInterface::isCosedStatusSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return true;
    }
    return ((_sokets[soket].status()) == CLOSED);
}

uint8_t FLProgOnBoardWifiInterface::statusSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return CLOSED;
    }
    return _sokets[soket].status();
}

int FLProgOnBoardWifiInterface::availableSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].available();
}

int FLProgOnBoardWifiInterface::readFromSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return -1;
    }
    return _sokets[soket].read();
}

int FLProgOnBoardWifiInterface::readFromSoket(uint8_t soket, uint8_t *buf, int16_t len)
{
    if (!checkOnUseSoket(soket))
    {
        return -1;
    }
    return _sokets[soket].read(buf, len);
}

size_t FLProgOnBoardWifiInterface::writeToSoket(uint8_t soket, const uint8_t *buf, size_t size)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].write(buf, size);
}

uint8_t FLProgOnBoardWifiInterface::peekSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].peek();
}

uint8_t FLProgOnBoardWifiInterface::getUDPSoket(uint16_t port)
{

    if (!isReady())
    {
        return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
    }
    uint8_t result = getFreeSoketIndex();
    if (result >= FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM)
    {
        return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
    }
    _sokets[result].beUDP(port);
    return result;
}

uint8_t FLProgOnBoardWifiInterface::startUdpSoket(uint8_t soket, uint8_t *addr, uint16_t port)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].beginIpUDPPacket(addr, port);
}

uint8_t FLProgOnBoardWifiInterface::sendUdpSoket(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].endUDPPacket();
}

int FLProgOnBoardWifiInterface::parsePacketSocet(uint8_t soket)
{
    if (!checkOnUseSoket(soket))
    {
        return 0;
    }
    return _sokets[soket].parsePacket();
}

int FLProgOnBoardWifiInterface::recvSoket(uint8_t soket, uint8_t *buf, int16_t len)
{
    return readFromSoket(soket, buf, len);
}

uint8_t FLProgOnBoardWifiInterface::getFreeSoketIndex()
{
    for (uint8_t i = 0; i < FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM; i++)
    {
        if (!_sokets[i].isUsed())
        {
            return i;
        }
    }
    return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM;
}

bool FLProgOnBoardWifiInterface::checkOnUseSoket(uint8_t soket)
{
    if (soket >= FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM)
    {
        return false;
    }
    return _sokets[soket].isUsed();
}

uint8_t FLProgOnBoardWifiInterface::resetToVoidVar(uint8_t soket)
{
    (void)soket;
    return 0;
}

uint16_t FLProgOnBoardWifiInterface::bufferDataSoket(uint8_t soket, uint16_t offset, const uint8_t *buf, uint16_t len)
{
    (void)soket;
    (void)offset;
    (void)buf;
    (void)len;
    return 0;
}

uint8_t FLProgOnBoardWifiInterface::beginMulticastSoket(IPAddress ip, uint16_t port)
{
    (void)port;
    (void)ip;
    return 0;
}

IPAddress FLProgOnBoardWifiInterface::remoteIPSoket(uint8_t soket)
{
    (void)soket;
    return FLPROG_INADDR_NONE;
}

#endif

#ifdef FLPROG_ANON_ONBOARD_WIFI_MODULE
void FLProgOnBoardWifiInterface::apMac(uint8_t m0, uint8_t m1, uint8_t m2, uint8_t m3, uint8_t m4, uint8_t m5)
{
    (void)m0;
    (void)m1;
    (void)m2;
    (void)m3;
    (void)m4;
    (void)m5;
}
int FLProgOnBoardWifiInterface::parsePacketSocet(uint8_t soket)
{
    (void)soket;
    return 0;
}
uint8_t FLProgOnBoardWifiInterface::resetToVoidVar(uint8_t soket)
{
    (void)soket;
    return 0;
}

int FLProgOnBoardWifiInterface::readFromSoket(uint8_t soket, uint8_t *buf, int16_t len)
{
    (void)soket;
    (void)buf;
    (void)len;
    return -1;
}

size_t FLProgOnBoardWifiInterface::writeToSoket(uint8_t soket, const uint8_t *buffer, size_t size)
{
    (void)soket;
    (void)buffer;
    (void)size;
    return 0;
}

uint8_t FLProgOnBoardWifiInterface::startUdpSoket(uint8_t soket, uint8_t *addr, uint16_t port)
{
    (void)soket;
    (void)addr;
    (void)port;
    return 0;
}

uint16_t FLProgOnBoardWifiInterface::bufferDataSoket(uint8_t soket, uint16_t offset, const uint8_t *buf, uint16_t len)
{
    (void)soket;
    (void)offset;
    (void)buf;
    (void)len;
    return 0;
}

int FLProgOnBoardWifiInterface::recvSoket(uint8_t soket, uint8_t *buf, int16_t len)
{
    (void)soket;
    (void)buf;
    (void)len;
    return -1;
}

uint8_t FLProgOnBoardWifiInterface::beginMulticastSoket(IPAddress ip, uint16_t port)
{
    (void)port;
    (void)ip;
    return 0;
}

uint8_t FLProgOnBoardWifiInterface::connectSoket(uint8_t soket, IPAddress ip, uint16_t port)
{
    (void)soket;
    (void)port;
    (void)ip;
    return 0;
}

IPAddress FLProgOnBoardWifiInterface::remoteIPSoket(uint8_t soket)
{
    (void)soket;
    return FLPROG_INADDR_NONE;
}
#endif