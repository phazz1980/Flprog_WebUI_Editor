#include "flprogDhcp.h"

void FLProgDhcp::stop()
{
	_sourse->closeSoket(_sockindex);
	_sockindex = _sourse->maxSoketNum();
}

void FLProgDhcp::setSourse(FLProgAbstractTcpInterface *sourse)
{
	_sourse = sourse;
	_status = FLPROG_READY_STATUS;
}

uint8_t FLProgDhcp::beginWithDHCP(uint32_t timeout, uint32_t responseTimeout)
{
	if (_status == FLPROG_NOT_REDY_STATUS)
	{
		_errorCode = FLPROG_ETHERNET_DHCP_NOT_READY_ERROR;
		return FLPROG_ERROR;
	}
	if (_status == FLPROG_WAIT_ETHERNET_DHCP_STATUS)
	{
		if (flprog::isTimer(_sartFullDhcpReqestTime, timeout))
		{
			_errorCode = FLPROG_ETHERNET_DHCP_TIMEOUT_ERROR;
			_status = FLPROG_READY_STATUS;
			return FLPROG_ERROR;
		}
	}
	if (_status == FLPROG_READY_STATUS)
	{
		_dhcpLeaseTime = 0;
		_dhcpT1 = 0;
		_dhcpT2 = 0;
		_sartFullDhcpReqestTime = millis();
		memset(_dhcpMacAddr, 0, 6);
		reset_DHCP_lease();
		memcpy((void *)_dhcpMacAddr, (void *)_sourse->mac(), 6);
		_dhcp_state = FLPROG_STATE_DHCP_START;
	}
	return request_DHCP_lease(responseTimeout);
}

void FLProgDhcp::reset_DHCP_lease()
{
	memset(_dhcpLocalIp, 0, 20);
}

uint8_t FLProgDhcp::request_DHCP_lease(uint32_t responseTimeout)
{
	if (_status != FLPROG_WAIT_ETHERNET_DHCP_STATUS)
	{
		_status = FLPROG_WAIT_ETHERNET_DHCP_STATUS;
		_dhcpTransactionId = random(1UL, 2000UL);
		_dhcpInitialTransactionId = _dhcpTransactionId;
		stop();
		_dhcpLeaseTime = 0;
		_dhcpT1 = 0;
		_dhcpT2 = 0;
		if ((begin(FLPROG_DHCP_CLIENT_PORT)) != FLPROG_SUCCESS)
		{
			_status = FLPROG_READY_STATUS;
			return FLPROG_ERROR;
		}
	}
	uint8_t result = cheskStateMashine(responseTimeout);
	;
	if (result == FLPROG_WAIT)
	{
		return FLPROG_WAIT;
	}
	stop();
	_dhcpTransactionId++;
	_lastCheckLeaseMillis = millis();
	return result;
}

void FLProgDhcp::sendDiscoverMessage()
{
	_dhcpTransactionId++;
	send_DHCP_MESSAGE(FLPROG_DHCP_DISCOVER);
	_startDhcpReqestTime = millis();
	_lastCheckDhcpReqestTime = flprog::timeBack(100);
	_dhcp_state = FLPROG_STATE_DHCP_DISCOVER;
}

void FLProgDhcp::sendReqestMessage()
{
	_dhcpTransactionId = _respId;
	send_DHCP_MESSAGE(FLPROG_DHCP_REQUEST);
	_startDhcpReqestTime = millis();
	_lastCheckDhcpReqestTime = flprog::timeBack(100);
	_dhcp_state = FLPROG_STATE_DHCP_REQUEST;
}

uint8_t FLProgDhcp::cheskStateMashine(uint32_t responseTimeout)
{
	uint8_t result;
	if (_dhcp_state == FLPROG_STATE_DHCP_START)
	{
		sendDiscoverMessage();
		return FLPROG_WAIT;
	}
	if (_dhcp_state == FLPROG_STATE_DHCP_DISCOVER)
	{

		result = parseDHCPResponse(responseTimeout);
		if (result == FLPROG_DHCP_TIMEOUT_MESSAGE_TYPE)
		{
			stop();
			if ((begin(FLPROG_DHCP_CLIENT_PORT)) != FLPROG_SUCCESS)
			{
				_status = FLPROG_READY_STATUS;
				return FLPROG_ERROR;
			}
			sendDiscoverMessage();
			return FLPROG_WAIT;
		}
		if (result == FLPROG_DHCP_ERROR_ID_MESSAGE_TYPE)
		{
			_dhcp_state = FLPROG_STATE_DHCP_START;
			_errorCode = FLPROG_ETHERNET_DHCP_DISCOVERY_ERROR_ID_ERROR;
			_status = FLPROG_READY_STATUS;
			return FLPROG_ERROR;
		}

		if (result == FLPROG_DHCP_WITE_CHECK_REQEST_MESSAGE_TYPE)
		{
			return FLPROG_WAIT;
		}

		if (result == FLPROG_DHCP_OFFER)
		{
			sendReqestMessage();
		}
		return FLPROG_WAIT;
	}

	if (_dhcp_state == FLPROG_STATE_DHCP_REREQUEST)
	{
		_dhcpTransactionId++;
		_startDhcpReqestTime = millis();
		send_DHCP_MESSAGE(FLPROG_DHCP_REQUEST);
		_dhcp_state = FLPROG_STATE_DHCP_REQUEST;
		return FLPROG_WAIT;
	}

	if (_dhcp_state == FLPROG_STATE_DHCP_REQUEST)
	{
		result = parseDHCPResponse(responseTimeout);
		if (result == FLPROG_DHCP_WITE_CHECK_REQEST_MESSAGE_TYPE)
		{
			return FLPROG_WAIT;
		}
		if (result == FLPROG_DHCP_TIMEOUT_MESSAGE_TYPE)
		{

			sendReqestMessage();
			return FLPROG_WAIT;
		}

		if (result == FLPROG_DHCP_ERROR_ID_MESSAGE_TYPE)
		{
			_dhcp_state = FLPROG_STATE_DHCP_START;
			_errorCode = FLPROG_ETHERNET_DHCP_REREQUEST_ERROR_ID_ERROR;
			_status = FLPROG_READY_STATUS;
			return FLPROG_ERROR;
		}

		if (result == FLPROG_DHCP_ACK)
		{
			_dhcp_state = FLPROG_STATE_DHCP_START;
			_errorCode = FLPROG_NOT_ERROR;
			_status = FLPROG_READY_STATUS;
			return FLPROG_SUCCESS;
		}
		if (result == FLPROG_DHCP_NAK)
		{
			_errorCode = FLPROG_ETHERNET_DHCP_REREQUEST_NAK_ERROR;
			_dhcp_state = FLPROG_STATE_DHCP_START;
			_status = FLPROG_READY_STATUS;
			return FLPROG_ERROR;
		}
		return FLPROG_WAIT;
	}
	_errorCode = FLPROG_ETHERNET_DHCP_NOT_DEFINED_ERROR;
	_dhcp_state = FLPROG_STATE_DHCP_START;
	_status = FLPROG_READY_STATUS;
	return FLPROG_ERROR;
}

void FLProgDhcp::send_DHCP_MESSAGE(uint8_t messageType)
{
	uint8_t buffer[32];
	memset(buffer, 0, 32);
	IPAddress dest_addr(255, 255, 255, 255); // Broadcast address
	if ((beginIpPacket(dest_addr, FLPROG_DHCP_SERVER_PORT)) != FLPROG_SUCCESS)
	{
		return;
	}
	buffer[0] = FLPROG_DHCP_BOOTREQUEST;  // op
	buffer[1] = FLPROG_DHCP_HTYPE10MB;	  // htype
	buffer[2] = FLPROG_DHCP_HLENETHERNET; // hlen
	buffer[3] = FLPROG_DHCP_HOPS;		  // hops
	unsigned long xid = flprogEthernetHtonl(_dhcpTransactionId);
	memcpy(buffer + 4, &(xid), 4);
	/*
	buffer[8] = ((secondsElapsed & 0xff00) >> 8);
	buffer[9] = (secondsElapsed & 0x00ff);
	*/
	unsigned short flags = flprogEthernetHtons(FLPROG_DHCP_FLAGSBROADCAST);
	memcpy(buffer + 10, &(flags), 2);
	write(buffer, 28);
	memset(buffer, 0, 32);			 // clear local buffer
	memcpy(buffer, _dhcpMacAddr, 6); // chaddr
	write(buffer, 16);
	memset(buffer, 0, 32); // clear local buffer
	for (int i = 0; i < 6; i++)
	{
		write(buffer, 32);
	}
	buffer[0] = (uint8_t)((FLPROG_MAGIC_COOKIE >> 24) & 0xFF);
	buffer[1] = (uint8_t)((FLPROG_MAGIC_COOKIE >> 16) & 0xFF);
	buffer[2] = (uint8_t)((FLPROG_MAGIC_COOKIE >> 8) & 0xFF);
	buffer[3] = (uint8_t)(FLPROG_MAGIC_COOKIE & 0xFF);
	buffer[4] = FLPROG_DHCP_MESSAGE_TYPE_OPTION;
	buffer[5] = 0x01;
	buffer[6] = messageType; // DHCP_REQUEST;
	buffer[7] = FLPROG_DHCP_CLIENT_IDENTIFIER_OPTION;
	buffer[8] = 0x07;
	buffer[9] = 0x01;
	memcpy(buffer + 10, _dhcpMacAddr, 6);
	buffer[16] = FLPROG_DHCP_HOST_NAME_OPTION;
	buffer[17] = strlen(FLPROG_HOST_NAME) + 6; // length of hostname + last 3 bytes of mac address
	strcpy((char *)&(buffer[18]), FLPROG_HOST_NAME);
	printByte((char *)&(buffer[24]), _dhcpMacAddr[3]);
	printByte((char *)&(buffer[26]), _dhcpMacAddr[4]);
	printByte((char *)&(buffer[28]), _dhcpMacAddr[5]);
	write(buffer, 30);
	if (messageType == FLPROG_DHCP_REQUEST)
	{
		buffer[0] = FLPROG_DHCP_REQESTED_IP_ADDR_OPTION;
		buffer[1] = 0x04;
		buffer[2] = _dhcpLocalIp[0];
		buffer[3] = _dhcpLocalIp[1];
		buffer[4] = _dhcpLocalIp[2];
		buffer[5] = _dhcpLocalIp[3];

		buffer[6] = FLPROG_DHCP_SERVER_IDENTIFIER_OPTION;
		buffer[7] = 0x04;
		buffer[8] = _dhcpDhcpServerIp[0];
		buffer[9] = _dhcpDhcpServerIp[1];
		buffer[10] = _dhcpDhcpServerIp[2];
		buffer[11] = _dhcpDhcpServerIp[3];
		write(buffer, 12);
	}
	buffer[0] = FLPROG_DHCP_PARAM_REQUEST_OPTION;
	buffer[1] = 0x06;
	buffer[2] = FLPROG_DHCP_SUBNET_MASK_OPTION;
	buffer[3] = FLPROG_DHCP_ROUTERS_ON_SUBNET_MASK_OPTION;
	buffer[4] = FLPROG_DHCP_DNS_OPTION;
	buffer[5] = FLPROG_DHCP_DOMAIN_NAME_OPTION;
	buffer[6] = FLPROG_DHCP_T1_VALUE_OPTION;
	buffer[7] = FLPROG_DHCP_T2_VALUE_OPTION;
	buffer[8] = FLPROG_DHCP_END_OPTION;
	write(buffer, 9);
	endPacket();
}

uint8_t FLProgDhcp::parseDHCPResponse(uint32_t responseTimeout)
{

	if (flprog::isTimer(_startDhcpReqestTime, responseTimeout))
	{
		return FLPROG_DHCP_TIMEOUT_MESSAGE_TYPE;
	}
	if (!(flprog::isTimer(_lastCheckDhcpReqestTime, 50)))
	{
		return FLPROG_DHCP_WITE_CHECK_REQEST_MESSAGE_TYPE;
	}
	if (parsePacket() <= 0)
	{
		_lastCheckDhcpReqestTime = millis();
		return FLPROG_DHCP_WITE_CHECK_REQEST_MESSAGE_TYPE;
	}

	uint8_t type = 0;
	uint8_t opt_len = 0;
	FLPROG_RIP_MSG_FIXED fixedMsg;
	read((uint8_t *)&fixedMsg, sizeof(FLPROG_RIP_MSG_FIXED));
	if (fixedMsg.op == FLPROG_DHCP_BOOTREPLY && remotePort() == FLPROG_DHCP_SERVER_PORT)
	{
		_respId = flporgEthernetNtohl(fixedMsg.xid);
		if (memcmp(fixedMsg.chaddr, _dhcpMacAddr, 6) != 0 ||
			(_respId < _dhcpInitialTransactionId) ||
			(_respId > _dhcpTransactionId))
		{
			flush(); // FIXME
			return FLPROG_DHCP_ERROR_ID_MESSAGE_TYPE;
		}
		memcpy(_dhcpLocalIp, fixedMsg.yiaddr, 4);
		readToNull(240 - (int)sizeof(FLPROG_RIP_MSG_FIXED));
		while (available() > 0)
		{
			switch (read())
			{
			case FLPROG_DHCP_END_OPTION:
				break;

			case FLPROG_DHCP_PAD_OPTION:
				break;

			case FLPROG_DHCP_MESSAGE_TYPE_OPTION:
				opt_len = read();
				type = read();
				break;

			case FLPROG_DHCP_SUBNET_MASK_OPTION:
				opt_len = read();
				read(_dhcpSubnetMask, 4);
				break;

			case FLPROG_DHCP_ROUTERS_ON_SUBNET_MASK_OPTION:
				opt_len = read();
				read(_dhcpGatewayIp, 4);
				readToNull(opt_len - 4);
				break;

			case FLPROG_DHCP_DNS_OPTION:
				opt_len = read();
				read(_dhcpDnsServerIp, 4);
				readToNull(opt_len - 4);
				break;

			case FLPROG_DHCP_SERVER_IDENTIFIER_OPTION:
				opt_len = read();
				if (IPAddress(_dhcpDhcpServerIp) == IPAddress((uint32_t)0) ||
					IPAddress(_dhcpDhcpServerIp) == remoteIP())
				{
					read(_dhcpDhcpServerIp, sizeof(_dhcpDhcpServerIp));
				}
				else
				{
					readToNull(opt_len);
				}
				break;

			case FLPROG_DHCP_T1_VALUE_OPTION:
				opt_len = read();
				read((uint8_t *)&_dhcpT1, sizeof(_dhcpT1));
				_dhcpT1 = flporgEthernetNtohl(_dhcpT1);
				break;

			case FLPROG_DHCP_T2_VALUE_OPTION:
				opt_len = read();
				read((uint8_t *)&_dhcpT2, sizeof(_dhcpT2));
				_dhcpT2 = flporgEthernetNtohl(_dhcpT2);
				break;

			case FLPROG_DHCP_IP_ADDR_LEASE_TIME_OPTION:
				opt_len = read();
				read((uint8_t *)&_dhcpLeaseTime, sizeof(_dhcpLeaseTime));
				_dhcpLeaseTime = flporgEthernetNtohl(_dhcpLeaseTime);
				_renewInSec = _dhcpLeaseTime;
				break;

			default:
				opt_len = read();
				readToNull(opt_len);
				break;
			}
		}
	}
	flush();
	return type;
}

IPAddress FLProgDhcp::getLocalIp()
{
	return IPAddress(_dhcpLocalIp);
}

IPAddress FLProgDhcp::getSubnetMask()
{
	return IPAddress(_dhcpSubnetMask);
}

IPAddress FLProgDhcp::getGatewayIp()
{
	return IPAddress(_dhcpGatewayIp);
}

IPAddress FLProgDhcp::getDhcpServerIp()
{
	return IPAddress(_dhcpDhcpServerIp);
}

IPAddress FLProgDhcp::getDnsServerIp()
{
	return IPAddress(_dhcpDnsServerIp);
}

void FLProgDhcp::printByte(char *buffer, uint8_t size)
{
	char *str = &buffer[1];
	buffer[0] = '0';
	do
	{
		unsigned long m = size;
		size /= 16;
		char c = m - 16 * size;
		*str-- = c < 10 ? c + '0' : c + 'A' - 10;
	} while (size);
}
