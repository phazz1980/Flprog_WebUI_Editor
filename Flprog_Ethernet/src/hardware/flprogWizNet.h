#pragma once
#include "flprogUtilites.h"
#include "../abstract/flprogAbstractEthernetHardware.h"

#if defined(RAMEND) && defined(RAMSTART) && ((RAMEND - RAMSTART) <= 2048)
#define FLPROG_WIZNET_MAX_SOCK_NUM 4
#else
#define FLPROG_WIZNET_MAX_SOCK_NUM 8
#endif

#define SPI_ETHERNET_SPEED 14000000

#if defined(ARDUINO_ARCH_ARC32)
#undef SPI_ETHERNET_SPEED
#define SPI_ETHERNET_SPEED 8000000
#endif

#if defined(__SAMD21G18A__)
#undef SPI_ETHERNET_SPEED
#define SPI_ETHERNET_SPEED 8000000
#endif

#define FLPROG_WIZNET_SN_MR_CLOSE 0x00
#define FLPROG_WIZNET_SN_MR_TCP 0x21
#define FLPROG_WIZNET_SN_MR_UDP 0x02
#define FLPROG_WIZNET_SN_MR_MULTI 0x80

#define FLPROG_WIZNET_SOCK_CMD_OPEN 0x01
#define FLPROG_WIZNET_SOCK_CMD_CLOSE 0x10
#define FLPROG_WIZNET_SOCK_CMD_LISTEN 0x02
#define FLPROG_WIZNET_SOCK_CMD_CONNECT 0x04
#define FLPROG_WIZNET_SOCK_CMD_DISCON 0x08
#define FLPROG_WIZNET_SOCK_CMD_RECV 0x40
#define FLPROG_WIZNET_SOCK_CMD_SEND 0x20

#define FLPROG_WIZNET_SN_IR_SEND_OK 0x10
#define FLPROG_WIZNET_SN_IR_TIMEOUT 0x08

#define FLPROG_WIZNET_SN_SR_ESTABLISHED 0x17
#define FLPROG_WIZNET_SN_SR_CLOSE_WAIT 0x1C
#define FLPROG_WIZNET_SN_SR_LISTEN 0x14
#define FLPROG_WIZNET_SN_SR_CLOSED 0x00
#define FLPROG_WIZNET_SN_SR_FIN_WAIT 0x18
#define FLPROG_WIZNET_SN_SR_LAST_ACK 0x1D
#define FLPROG_WIZNET_SN_SR_TIME_WAIT 0x1B
#define FLPROG_WIZNET_SN_SR_FIN_WAIT 0x18
#define FLPROG_WIZNET_SN_SR_CLOSING 0x1A
#define FLPROG_WIZNET_SN_SR_INIT 0x13

#define FLPROG_WIZNET_GAR 0x0001            // Gateway IP address
#define FLPROG_WIZNET_SUBR 0x0005           // Subnet mask address
#define FLPROG_WIZNET_SHAR 0x0009           // Source MAC address
#define FLPROG_WIZNET_SIPR 0x000F           // Source IP address
#define FLPROG_WIZNET_RTR 0x0017            // Timeout address
#define FLPROG_WIZNET_RCR 0x0019            // Retry count
#define FLPROG_WIZNET_RMSR 0x001A           // Receive memory size (W5100 only)
#define FLPROG_WIZNET_TMSR 0x001B           // Transmit memory size (W5100 only)
#define FLPROG_WIZNET_MR 0x0000             // Mode
#define FLPROG_WIZNET_VERSIONR_W5200 0x001F // Chip Version Register (W5200 only)
#define FLPROG_WIZNET_VERSIONR_W5500 0x0039 // Chip Version Register (W5500 only)
#define FLPROG_WIZNET_PSTATUS_W5200 0x0035  // PHY Status
#define FLPROG_WIZNET_PHYCFGR_W5500 0x002E  // PHY Configuration register, default: 10111xxx

#define FLPROG_WIZNET_SN_CR 0x0001      // Command
#define FLPROG_WIZNET_SN_SR 0x0003      // Status
#define FLPROG_WIZNET_SN_MR 0x0000      // Mode
#define FLPROG_WIZNET_SN_IR 0x0002      // Interrupt
#define FLPROG_WIZNET_SN_PORT 0x0004    // Source Port
#define FLPROG_WIZNET_SN_RX_RD 0x0028   // RX Read Pointer
#define FLPROG_WIZNET_SN_RX_SIZE 0x001E // RX Memory Size (W5200 only)
#define FLPROG_WIZNET_SN_RX_RSR 0x0026  // RX Free Size
#define FLPROG_WIZNET_SN_TX_SIZE 0x001F // RX Memory Size (W5200 only)
#define FLPROG_WIZNET_SN_TX_FSR 0x0020  // TX Free Size
#define FLPROG_WIZNET_SN_TX_WR 0x0024   // TX Write Pointer
#define FLPROG_WIZNET_SN_DIPR 0x000C    // Destination IP Addr
#define FLPROG_WIZNET_SN_DPORT 0x0010   // Destination Port
#define FLPROG_WIZNET_SN_DHAR 0x0006    // Destination Hardw Addr

typedef struct
{
  uint16_t RX_RSR; // Number of bytes received
  uint16_t RX_RD;  // Address to read
  uint16_t TX_FSR; // Free space ready for transmit
  uint8_t RX_inc;  // how much have we advanced RX_RD
} wizNetSocketState_t;

class FLProgWiznetClass : public FLProgAbstractEthernetHardware
{
public:
  virtual uint8_t init();
  virtual bool isInit() { return ((_status == FLPROG_READY_STATUS) || (_status == FLPROG_WAIT_SEND_UDP_PACAGE)); };
  int pinCs() { return _device.cs; };
  uint8_t spiBus() { return _device.bus; };

  void setPinCs(int pinCs);
  void setSpiBus(uint8_t bus);

  virtual uint8_t getLinkStatus();
  virtual uint8_t getChip();
  uint8_t checkHardware();

  uint8_t soketConnected(uint8_t soket);
  int readFromSoket(uint8_t soket);
  uint8_t readFromSoket(uint8_t soket, uint8_t *buf, int16_t len);
  size_t writeToSoket(uint8_t soket, const uint8_t *buffer, size_t size);
  uint8_t isConnectStatusSoket(uint8_t soket);
  uint8_t isCosedStatusSoket(uint8_t soket);

  virtual void setGatewayIp(IPAddress addr);
  virtual IPAddress getGatewayIp();
  virtual void setSubnetMask(IPAddress addr);
  virtual IPAddress getSubnetMask();
  virtual void setMACAddress(const uint8_t *addr);
  virtual void getMACAddress(uint8_t *addr) { read(FLPROG_WIZNET_SHAR, addr, 6); };
  virtual void setIPAddress(IPAddress addr);
  virtual IPAddress getIPAddress();
  virtual void setRetransmissionTime(uint16_t timeout);
  virtual void setRetransmissionCount(uint8_t retry);
  virtual void execCmdSn(uint8_t s, uint8_t _cmd);
  virtual uint16_t _CH_SIZE() { return CH_SIZE; };
  virtual uint16_t _SSIZE() { return SSIZE; };

  // W5100 Registers
  virtual uint16_t write(uint16_t addr, const uint8_t *buf, uint16_t len);
  virtual uint8_t write(uint16_t addr, uint8_t data) { return write(addr, &data, 1); };
  virtual void write16(uint16_t address, uint16_t _data);
  virtual uint16_t read(uint16_t addr, uint8_t *buf, uint16_t len);
  virtual uint8_t read(uint16_t addr);
  virtual uint16_t CH_BASE() { return _CH_BASE_MSB << 8; };
  uint8_t _CH_BASE_MSB; // 1 redundant byte, saves ~80 bytes code on AVR

  // W5100 uint8_t registers
  virtual uint8_t readSn(uint8_t s, uint16_t addr) { return read(CH_BASE() + s * CH_SIZE + addr); };
  virtual uint8_t writeSn(uint8_t s, uint16_t addr, uint8_t data) { return write(CH_BASE() + s * CH_SIZE + addr, data); };
  virtual uint16_t readSn(uint8_t s, uint16_t addr, uint8_t *buf, uint16_t len) { return read(CH_BASE() + s * CH_SIZE + addr, buf, len); };
  virtual uint16_t writeSn(uint8_t s, uint16_t addr, uint8_t *buf, uint16_t len) { return write(CH_BASE() + s * CH_SIZE + addr, buf, len); };
  virtual uint16_t readSn16(uint8_t _s, uint16_t address);
  virtual void writeSn16(uint8_t _s, uint16_t address, uint16_t _data);

#ifdef ETHERNET_LARGE_BUFFERS
  uint16_t SSIZE;
  uint16_t SMASK;
#else
  const uint16_t SSIZE = 2048;
  const uint16_t SMASK = 0x07FF;
#endif
  virtual uint16_t SBASE(uint8_t socknum);
  virtual uint16_t RBASE(uint8_t socknum);
  virtual bool hasOffsetAddressMapping(void);

  // утилиты
  virtual void setNetSettings(uint8_t *mac, IPAddress ip);
  virtual void setNetSettings(IPAddress ip, IPAddress gateway, IPAddress subnet);
  virtual void setNetSettings(uint8_t *mac, IPAddress ip, IPAddress gateway, IPAddress subnet);
  virtual void setOnlyMACAddress(const uint8_t *mac_address);
  virtual void setOnlyLocalIP(const IPAddress local_ip);
  virtual void setOnlySubnetMask(const IPAddress subnet);
  virtual void setOnlyGatewayIP(const IPAddress gateway);

  virtual IPAddress localIP();
  virtual IPAddress subnetMask();
  virtual IPAddress gatewayIP();
  virtual void MACAddress(uint8_t *mac_address);
  virtual uint16_t localPort(uint8_t soc);
  virtual IPAddress remoteIP(uint8_t soc);
  virtual uint16_t remotePort(uint8_t soc);

  // Сокет
  virtual void socketPortRand(uint16_t n);
  virtual uint8_t socketBegin(uint8_t protocol, uint16_t port);
  virtual uint8_t socketBeginMulticast(uint8_t protocol, IPAddress ip, uint16_t port);
  virtual uint8_t socketStatus(uint8_t s);
  virtual void socketClose(uint8_t s);
  virtual uint8_t socketListen(uint8_t s);
  virtual uint8_t socketConnect(uint8_t s, IPAddress ip, uint16_t port);
  virtual uint8_t socketDisconnect(uint8_t s);
  virtual uint16_t getSnRX_RSR(uint8_t s);
  virtual void read_data(uint8_t s, uint16_t src, uint8_t *dst, uint16_t len);
  virtual int socketRecv(uint8_t s, uint8_t *buf, int16_t len);
  virtual uint16_t socketRecvAvailable(uint8_t s);
  virtual uint8_t socketPeek(uint8_t s);
  virtual uint16_t getSnTX_FSR(uint8_t s);
  virtual void write_data(uint8_t s, uint16_t data_offset, const uint8_t *data, uint16_t len);
  virtual uint16_t socketSend(uint8_t s, const uint8_t *buf, uint16_t len);
  virtual uint16_t socketSendAvailable(uint8_t s);
  virtual uint16_t socketBufferData(uint8_t s, uint16_t offset, const uint8_t *buf, uint16_t len);
  virtual uint8_t socketStartUDP(uint8_t s, uint8_t *addr, uint16_t port);
  virtual uint8_t socketSendUDP(uint8_t s);
  virtual uint8_t maxSoketNum() { return FLPROG_WIZNET_MAX_SOCK_NUM; };
  uint8_t getClientTCPSoket(uint16_t port) { return getTCPSoket(port); };
  uint8_t getServerTCPSoket(uint16_t port);
  virtual uint8_t getUDPSoket(uint16_t port) { return socketBegin(FLPROG_WIZNET_SN_MR_UDP, port); };
  virtual uint8_t beginMulticastSoket(IPAddress ip, uint16_t port) { return socketBeginMulticast((FLPROG_WIZNET_SN_MR_UDP | FLPROG_WIZNET_SN_MR_MULTI), ip, port); };
  uint8_t chipCode() { return _chip; };

private:
  uint8_t getTCPSoket(uint16_t port) { return socketBegin(FLPROG_WIZNET_SN_MR_TCP, port); };
  uint8_t checkInit();
  uint8_t softReset(void);
  uint8_t isW5100(void);
  uint8_t isW5200(void);
  uint8_t isW5500(void);

  void setCs() { RT_HW_Base.spiBeginCS(_device); };
  void resetCs() { RT_HW_Base.spiEndCS(_device); };
  void privateMaceSoket(uint8_t soc, uint8_t protocol, uint16_t port);
  void privateMaceSoketMulticast(uint8_t soc, uint8_t protocol, IPAddress ip, uint16_t port);
  void beginTransaction();
  void endTransaction();
  uint8_t spiTransfer(uint8_t);
  RT_HW_STRUCT_SPI_DEV _device;
  uint8_t _chip = 0;
  uint32_t _startWhiteInitTime;
  uint16_t _local_port = 49152; // 49152 to 65535 TODO: randomize this when not using DHCP, but how?
  const uint16_t CH_SIZE = 0x0100;
  wizNetSocketState_t _state[FLPROG_WIZNET_MAX_SOCK_NUM];
};
