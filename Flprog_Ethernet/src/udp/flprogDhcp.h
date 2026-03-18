#pragma once
#include <Arduino.h>
#include "flprogUtilites.h"
#include "../abstract/flprogAbstactEthernetUDPChanel.h"

/* DHCP state machine. */
#define FLPROG_STATE_DHCP_START 0
#define FLPROG_STATE_DHCP_DISCOVER 1

#define FLPROG_STATE_DHCP_REQUEST 3
#define FLPROG_STATE_DHCP_LEASED 4
#define FLPROG_STATE_DHCP_REREQUEST 5
#define FLPROG_STATE_DHCP_RELEASE 6

#define FLPROG_DHCP_FLAGSBROADCAST 0x8000

/* UDP port numbers for DHCP */
#define FLPROG_DHCP_SERVER_PORT 67 /* from server to client */
#define FLPROG_DHCP_CLIENT_PORT 68 /* from client to server */

/* DHCP message OP code */
#define FLPROG_DHCP_BOOTREQUEST 1
#define FLPROG_DHCP_BOOTREPLY 2
#define FLPROG_DHCP_HTYPE10MB 1
#define FLPROG_DHCP_HTYPE100MB 2
#define FLPROG_DHCP_HLENETHERNET 6
#define FLPROG_DHCP_HOPS 0
#define FLPROG_DHCP_SECS 0
#define FLPROG_MAGIC_COOKIE 0x63825363
#define FLPROG_MAX_DHCP_OPT 16
#define FLPROG_HOST_NAME "WizNet"
#define FLPROG_DEFAULT_LEASE 900 // default lease time in seconds
#define FLPROG_DHCP_CHECK_NONE 0
#define FLPROG_DHCP_CHECK_RENEW_FAIL 1
#define FLPROG_DHCP_CHECK_RENEW_OK 2
#define FLPROG_DHCP_CHECK_REBIND_FAIL 3
#define FLPROG_DHCP_CHECK_REBIND_OK 4

// типы сообщений при ответе сервера
#define FLPROG_DHCP_DISCOVER 1
#define FLPROG_DHCP_OFFER 2
#define FLPROG_DHCP_REQUEST 3
#define FLPROG_DHCP_DECLINE 4
#define FLPROG_DHCP_ACK 5
#define FLPROG_DHCP_NAK 6
#define FLPROG_DHCP_RELEASE 7
#define FLPROG_DHCP_INFORM 8
#define FLPROG_DHCP_WITE_CHECK_REQEST_MESSAGE_TYPE 254
#define FLPROG_DHCP_TIMEOUT_MESSAGE_TYPE 255
#define FLPROG_DHCP_ERROR_ID_MESSAGE_TYPE 253

// Опции DHCP
#define FLPROG_DHCP_PAD_OPTION 0
#define FLPROG_DHCP_SUBNET_MASK_OPTION 1
#define FLPROG_DHCP_TIMER_OFFSET_MASK_OPTION 2
#define FLPROG_DHCP_ROUTERS_ON_SUBNET_MASK_OPTION 3
#define FLPROG_DHCP_DNS_OPTION 6
#define FLPROG_DHCP_HOST_NAME_OPTION 12
#define FLPROG_DHCP_DOMAIN_NAME_OPTION 15
#define FLPROG_DHCP_REQESTED_IP_ADDR_OPTION 50
#define FLPROG_DHCP_IP_ADDR_LEASE_TIME_OPTION 51
#define FLPROG_DHCP_MESSAGE_TYPE_OPTION 53
#define FLPROG_DHCP_SERVER_IDENTIFIER_OPTION 54
#define FLPROG_DHCP_PARAM_REQUEST_OPTION 55
#define FLPROG_DHCP_T1_VALUE_OPTION 58
#define FLPROG_DHCP_T2_VALUE_OPTION 59
#define FLPROG_DHCP_CLIENT_IDENTIFIER_OPTION 61
#define FLPROG_DHCP_END_OPTION 255

typedef struct _FLPROG_RIP_MSG_FIXED
{
	uint8_t op;
	uint8_t htype;
	uint8_t hlen;
	uint8_t hops;
	uint32_t xid;
	uint16_t secs;
	uint16_t flags;
	uint8_t ciaddr[4];
	uint8_t yiaddr[4];
	uint8_t siaddr[4];
	uint8_t giaddr[4];
	uint8_t chaddr[6];
} FLPROG_RIP_MSG_FIXED;

class FLProgDhcp : public FLProgAbstactEthernetUDPChanel
{
public:
	virtual void setSourse(FLProgAbstractTcpInterface *sourse);
	IPAddress getLocalIp();
	IPAddress getSubnetMask();
	IPAddress getGatewayIp();
	IPAddress getDhcpServerIp();
	IPAddress getDnsServerIp();
	uint8_t beginWithDHCP(uint32_t timeout = 20000, uint32_t responseTimeout = 4000);
	virtual void stop();

private:
	uint8_t request_DHCP_lease(uint32_t responseTimeout);
	void reset_DHCP_lease();

	void send_DHCP_MESSAGE(uint8_t messageType);
	void printByte(char *buffer, uint8_t size);
	uint8_t parseDHCPResponse(uint32_t responseTimeout);

	// state mashine
	uint8_t cheskStateMashine(uint32_t responseTimeout);
	void sendDiscoverMessage();
	void sendReqestMessage();

	uint32_t _dhcpInitialTransactionId;
	uint32_t _dhcpTransactionId;
	uint8_t _dhcpMacAddr[6];

	uint8_t _dhcpLocalIp[4];
	uint8_t _dhcpSubnetMask[4];
	uint8_t _dhcpGatewayIp[4];
	uint8_t _dhcpDhcpServerIp[4];
	uint8_t _dhcpDnsServerIp[4];

	uint32_t _dhcpLeaseTime;
	uint32_t _dhcpT1, _dhcpT2;
	uint32_t _renewInSec;
	uint32_t _rebindInSec;
	uint32_t _lastCheckLeaseMillis;
	uint8_t _dhcp_state;

	uint32_t _startDhcpReqestTime;
	uint32_t _sartFullDhcpReqestTime;
	uint32_t _lastCheckDhcpReqestTime;
	uint32_t _respId;
};
