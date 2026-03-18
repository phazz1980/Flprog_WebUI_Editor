#pragma once
#include "flprogUtilites.h"
#include "../../abstract/flprogAbstractTcpInterface.h"
#include "flprogWifiSoket.h"

#ifdef FLPROG_ONBOARD_WIFI_MODULE
class FLProgOnBoardWifiInterface : public FLProgAbstractTcpInterface
{
public:
    virtual uint8_t pool();
    virtual bool isImitation() { return false; };
    virtual bool isReady();

    void setApSsid(String ssid);
    void setApPassword(String password);
    String apSsid() { return _apSsid; };
    String apPassworid() { return _apPassword; };
    void setClientSsid(String ssid);
    void setClientPassword(String password);
    String clientSsid() { return _clientSsid; };
    String clientPassword() { return _clientPassword; };

    void apMac(uint8_t m0, uint8_t m1, uint8_t m2, uint8_t m3, uint8_t m4, uint8_t m5);
    void apMac(uint8_t *mac) { apMac(mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]); };
    uint8_t *apMac() { return _apMacaddress; };
    void apLocalIP(IPAddress ip);
    void apLocalIP(uint32_t ip) { apLocalIP(flprog::numberToIp(ip)); };
    void apLocalIP(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apLocalIP(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apLocalIP() { return _apIp; };
    void apDns(IPAddress ip);
    void apDns(uint32_t ip) { apDns(flprog::numberToIp(ip)); };
    void apDns(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apDns(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apDns() { return _apDnsIp; };
    void apSubnet(IPAddress ip);
    void apSubnet(uint32_t ip) { apSubnet(flprog::numberToIp(ip)); };
    void apSubnet(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apSubnet(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apSubnet() { return _apSubnetIp; };
    void apGateway(IPAddress ip);
    void apGateway(uint32_t ip) { apGateway(flprog::numberToIp(ip)); };
    void apGateway(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apGateway(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apGateway() { return _apGatewayIp; };

    virtual void clientOn();
    void clientOff();
    void clientMode(bool val);
    bool clientMode() { return _clientWorkStatus; };
    virtual bool clientIsReady();
    virtual bool isReadyForDNS() { return clientIsReady(); };
    virtual bool apIsReady() { return _apStatus; };

    void setAutoConnect(bool autoConnect);
    void setAutoReconnect(bool autoReconnect);

    bool getAutoConnect() { return _autoConnect; };
    bool getAutoReconnect() { return _autoReconnect; };

    virtual void apOn();
    void apOff();
    void apMode(bool val);
    bool apMode() { return _apWorkStatus; };

    virtual uint8_t type();
    virtual void disconnecSoket(uint8_t soket);
    virtual uint8_t getServerTCPSoket(uint16_t port);
    virtual bool isListenSoket(uint8_t soket);
    virtual void closeSoket(uint8_t soket);
    uint8_t soketConnected(uint8_t soket);
    virtual int availableSoket(uint8_t soket);
    virtual int readFromSoket(uint8_t soket);
    virtual int readFromSoket(uint8_t soket, uint8_t *buf, int16_t len);
    virtual size_t writeToSoket(uint8_t soket, const uint8_t *buffer, size_t size);
    virtual uint8_t peekSoket(uint8_t soket);
    virtual uint8_t getUDPSoket(uint16_t port);
    virtual uint8_t startUdpSoket(uint8_t soket, uint8_t *addr, uint16_t port);
    virtual uint8_t sendUdpSoket(uint8_t soket);
    int parsePacketSocet(uint8_t soket);
    virtual uint8_t getClientTCPSoket(uint16_t port);
    virtual uint8_t connectSoket(uint8_t soket, IPAddress ip, uint16_t port);
    virtual uint8_t statusSoket(uint8_t soket);
    virtual uint8_t isConnectStatusSoket(uint8_t soket);
    virtual uint8_t isCosedStatusSoket(uint8_t soket);

    virtual uint8_t maxSoketNum() { return FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM; };
    virtual bool isInit() { return true; };

    // Необходимые заглушки
    virtual uint16_t bufferDataSoket(uint8_t soket, uint16_t offset, const uint8_t *buf, uint16_t len);
    virtual int recvSoket(uint8_t soket, uint8_t *buf, int16_t len);

    // Заглушки которые надо допилить.....
    virtual uint8_t beginMulticastSoket(IPAddress ip, uint16_t port);
    virtual uint16_t localPortSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual IPAddress remoteIPSoket(uint8_t soket);
    virtual uint16_t remotePortSoket(uint8_t soket) { return resetToVoidVar(soket); };

protected:
    void apConnect();
    void apDisconnect();
    void clientConnect();
    void clientDisconnect();

    uint8_t getFreeSoketIndex();
    bool checkOnUseSoket(uint8_t soket);

    uint8_t resetToVoidVar(uint8_t soket);

    uint8_t _apMacaddress[6] = {0, 0, 0, 0, 0, 0};
    String _apSsid = "";
    String _apPassword = "";
    String _clientSsid = "";
    String _clientPassword = "";

    IPAddress _apIp = FLPROG_INADDR_NONE;
    IPAddress _apDnsIp = FLPROG_INADDR_NONE;
    IPAddress _apSubnetIp = IPAddress(255, 255, 255, 0);
    IPAddress _apGatewayIp = FLPROG_INADDR_NONE;

    bool _apIsNeedReconect = true;
    bool _apWorkStatus = false;
    bool _apStatus = false;
    bool _clientWorkStatus = false;
    bool _clientStatus = false;
    bool _needUpdateClientData = false;
    bool _isCanStartServer = false;

    FLProgWifiSoket _sokets[FLPROG_ON_BOARD_WIFI_MAX_SOCK_NUM];

    bool _autoConnect = true;
    bool _autoReconnect = true;
};

#endif

#ifdef FLPROG_ANON_ONBOARD_WIFI_MODULE
class FLProgOnBoardWifiInterface : public FLProgAbstractTcpInterface
{
public:
    virtual uint8_t pool() {return 0;};
    virtual bool isImitation() { return true; };
    virtual bool isReady();

    void setApSsid(String ssid) { (void)ssid; };
    void setApPassword(String password) { (void)password; };
    String apSsid() { return ""; };
    String apPassworid() { return ""; };
    void setClientSsid(String ssid) { (void)ssid; };
    void setClientPassword(String password) { (void)password; };
    String clientSsid() { return ""; };
    String clientPassword() { return ""; };

    void apMac(uint8_t m0, uint8_t m1, uint8_t m2, uint8_t m3, uint8_t m4, uint8_t m5);
    void apMac(uint8_t *mac) { apMac(mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]); };
    uint8_t *apMac() { return _apMacaddress; };
    void apLocalIP(IPAddress ip) { (void)ip; };
    void apLocalIP(uint32_t ip) { apLocalIP(flprog::numberToIp(ip)); };
    void apLocalIP(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apLocalIP(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apLocalIP() { return FLPROG_INADDR_NONE; };
    void apDns(IPAddress ip) { (void)ip; };
    void apDns(uint32_t ip) { apDns(flprog::numberToIp(ip)); };
    void apDns(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apDns(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apDns() { return FLPROG_INADDR_NONE; };
    void apSubnet(IPAddress ip) { (void)ip; };
    void apSubnet(uint32_t ip) { (void)ip; };
    void apSubnet(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apSubnet(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apSubnet() { return FLPROG_INADDR_NONE; };
    void apGateway(IPAddress ip) { (void)ip; };
    void apGateway(uint32_t ip) { (void)ip; };
    void apGateway(uint8_t ip0, uint8_t ip1, uint8_t ip2, uint8_t ip3) { apGateway(IPAddress(ip0, ip1, ip2, ip3)); };
    IPAddress apGateway() { return FLPROG_INADDR_NONE; };

    virtual void clientOn() {};
    void clientOff() {};
    void clientMode(bool val) { (void)val; };
    bool clientMode() { return false; };
    virtual bool clientIsReady() { return false; };
    virtual bool isReadyForDNS() { return clientIsReady(); };

    void setAutoConnect(bool autoConnect) { (void)autoConnect; };
    void setAutoReconnect(bool autoReconnect) { (void)autoReconnect; };

    bool getAutoConnect() { return false; };
    bool getAutoReconnect() { return false; };

    virtual bool apIsReady() { return false; };
    virtual void apOn() {};
    void apOff() {};
    void apMode(bool val) { (void)val; };
    bool apMode() { return false; };

    virtual uint8_t type() { return FLPROG_ETHERNET_ON_BOARD_WIFI_ANON; };

    virtual uint8_t soketConnected(uint8_t soket) { return resetToVoidVar(soket); };

    int parsePacketSocet(uint8_t soket);
    virtual int readFromSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual int readFromSoket(uint8_t soket, uint8_t *buf, int16_t len);
    virtual size_t writeToSoket(uint8_t soket, const uint8_t *buffer, size_t size);
    virtual int availableSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual void disconnecSoket(uint8_t soket) { (void)soket; };
    virtual uint8_t getClientTCPSoket(uint16_t port) { return resetToVoidVar(port); };
    virtual uint8_t getServerTCPSoket(uint16_t port) { return resetToVoidVar(port); };
    virtual uint8_t getUDPSoket(uint16_t port) { return resetToVoidVar(port); };
    virtual bool isListenSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual void closeSoket(uint8_t soket) { (void)soket; };
    virtual uint8_t startUdpSoket(uint8_t soket, uint8_t *addr, uint16_t port);
    virtual uint8_t sendUdpSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual uint16_t bufferDataSoket(uint8_t soket, uint16_t offset, const uint8_t *buf, uint16_t len);
    virtual int recvSoket(uint8_t soket, uint8_t *buf, int16_t len);
    virtual uint8_t peekSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual uint8_t beginMulticastSoket(IPAddress ip, uint16_t port);
    virtual uint8_t connectSoket(uint8_t soket, IPAddress ip, uint16_t port);
    virtual uint8_t isConnectStatusSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual uint8_t isCosedStatusSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual uint8_t statusSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual uint16_t localPortSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual IPAddress remoteIPSoket(uint8_t soket);
    virtual uint16_t remotePortSoket(uint8_t soket) { return resetToVoidVar(soket); };
    virtual uint8_t maxSoketNum() { return 0; };
    virtual bool isInit() { return false; };

protected:
    uint8_t resetToVoidVar(uint8_t soket);
    uint8_t _apMacaddress[6] = {0, 0, 0, 0, 0, 0};
};
#endif