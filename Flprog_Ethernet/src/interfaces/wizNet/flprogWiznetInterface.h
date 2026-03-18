#pragma once
#include "flprogUtilites.h"
#include "../../abstract/flprogAbstractTcpInterface.h"
#include "../../hardware/flprogWizNet.h"
#include "../../udp/flprogDhcp.h"

class FLProgWiznetInterface : public FLProgAbstractTcpInterface
{
public:
  // Основные методы для пользователей
  FLProgWiznetInterface();
  FLProgWiznetInterface(int pinCs, uint8_t bus = 255);

  void setPinCs(int pinCs) { _hardware.setPinCs(pinCs); };
  virtual int pinCs() { return _hardware.pinCs(); }

  void setSpiBus(uint8_t bus) { _hardware.setSpiBus(bus); };
  uint8_t spiBus() { return _hardware.spiBus(); };
  uint8_t getSpiBus() { return spiBus(); };

  void setReconnectionPeriod(uint32_t period) { _reconnectEthernetPeriod = period; };
  uint32_t reconnectionPeriod() { return _reconnectEthernetPeriod; };

  void setCheckStatusPeriod(uint32_t period) { _checkEthernetStatusPeriod = period; };
  uint32_t checkStatusPeriod() { return _checkEthernetStatusPeriod; };

  void setResponseDhcpTimeout(uint32_t period) { _responseTimeout = period; };
  uint32_t responseDhcpTimeout() { return _responseTimeout; };

  void setDhcpTimeout(uint32_t period) { _timeout = period; };
  uint32_t dhcpTimeout() { return _timeout; };

  void setMaintainPeriod(uint32_t period) { _maintainPeriod = period; };
  uint32_t maintainPeriod() { return _maintainPeriod; };

  virtual uint8_t busNumber() { return spiBus(); };

  virtual uint8_t pool();

  // Внутрение методы библиотеки
  virtual uint8_t soketConnected(uint8_t soket) { return _hardware.soketConnected(soket); };
  virtual int readFromSoket(uint8_t soket) { return _hardware.readFromSoket(soket); };
  virtual int readFromSoket(uint8_t soket, uint8_t *buf, int16_t len) { return _hardware.readFromSoket(soket, buf, len); };
  virtual size_t writeToSoket(uint8_t soket, const uint8_t *buffer, size_t size) { return _hardware.writeToSoket(soket, buffer, size); };
  virtual int availableSoket(uint8_t soket) { return _hardware.socketRecvAvailable(soket); };
  virtual void disconnecSoket(uint8_t soket) { _hardware.socketDisconnect(soket); };
  virtual uint8_t getClientTCPSoket(uint16_t port) { return _hardware.getClientTCPSoket(port); };
  virtual uint8_t getServerTCPSoket(uint16_t port) { return _hardware.getServerTCPSoket(port); };
  virtual uint8_t getUDPSoket(uint16_t port) { return _hardware.getUDPSoket(port); };
  virtual bool isListenSoket(uint8_t soket) { return (_hardware.socketListen(soket) == FLPROG_SUCCESS); };

  virtual void closeSoket(uint8_t soket) { _hardware.socketClose(soket); };
  virtual uint8_t sendUdpSoket(uint8_t soket) { return _hardware.socketSendUDP(soket); };
  virtual uint8_t startUdpSoket(uint8_t soket, uint8_t *addr, uint16_t port) { return _hardware.socketStartUDP(soket, addr, port); };
  virtual uint16_t bufferDataSoket(uint8_t soket, uint16_t offset, const uint8_t *buf, uint16_t len) { return _hardware.socketBufferData(soket, offset, buf, len); };
  virtual int recvSoket(uint8_t soket, uint8_t *buf, int16_t len) { return _hardware.socketRecv(soket, buf, len); };
  virtual uint8_t peekSoket(uint8_t soket) { return _hardware.socketPeek(soket); };
  virtual uint8_t beginMulticastSoket(IPAddress ip, uint16_t port) { return _hardware.beginMulticastSoket(ip, port); };
  virtual uint8_t connectSoket(uint8_t soket, IPAddress ip, uint16_t port) { return _hardware.socketConnect(soket, ip, port); };
  virtual uint8_t isConnectStatusSoket(uint8_t soket) { return _hardware.isConnectStatusSoket(soket); };
  virtual uint8_t isCosedStatusSoket(uint8_t soket) { return _hardware.isCosedStatusSoket(soket); };

  virtual uint8_t statusSoket(uint8_t soket) { return _hardware.socketStatus(soket); };
  virtual uint16_t localPortSoket(uint8_t soket) { return _hardware.localPort(soket); };
  virtual IPAddress remoteIPSoket(uint8_t soket) { return _hardware.remoteIP(soket); };
  virtual uint16_t remotePortSoket(uint8_t soket) { return _hardware.remotePort(soket); };
  virtual uint8_t chipCode() { return _hardware.chipCode(); };
  virtual int parsePacketSocet(uint8_t soket);

  uint8_t begin(IPAddress ip);
  uint8_t begin(IPAddress ip, IPAddress dns);
  uint8_t begin(IPAddress ip, IPAddress dns, IPAddress gateway);
  uint8_t begin(IPAddress ip, IPAddress dns, IPAddress gateway, IPAddress subnet);
  uint8_t begin();
  uint8_t maintain();
  uint8_t linkStatus() { return _hardware.getLinkStatus(); };
  uint8_t hardwareStatus();
  void setRetransmissionTimeout(uint16_t milliseconds) { _hardware.setRetransmissionTime(milliseconds); };
  void setRetransmissionCount(uint8_t num) { _hardware.setRetransmissionCount(num); };
  void init(int pinCs, uint8_t bus);
  virtual bool isImitation() { return false; }
  virtual uint8_t type() { return FLPROG_ETHERNET_INTERFACE; }
  virtual uint8_t maxSoketNum() { return _hardware.maxSoketNum(); };
  virtual bool isInit() { return _hardware.isInit(); };
  uint8_t initHarware();
  uint8_t connect();
  virtual void setFlags();

protected:
  uint8_t checkHarwareLinkStatus();
  uint8_t checkHardware();

  FLProgWiznetClass _hardware;
  FLProgDhcp _dhcp;

  uint32_t _maintainPeriod = 1800000;
  uint32_t _startMaintainTime;
  bool _isMaintainMode = false;

  uint32_t _timeout = 20000;
  uint32_t _responseTimeout = 6000;

  uint32_t _checkEthernetStatusPeriod = 1000;
  uint32_t _lastCheckEthernetStatusTime = flprog::timeBack(_checkEthernetStatusPeriod);
  uint32_t _reconnectEthernetPeriod = 5000;
  uint32_t _lastReconnectTime = flprog::timeBack(_reconnectEthernetPeriod);
  bool _oldIsInit = false;
};
