
#include "flprogUdp.h"

FLProgUdpClient::FLProgUdpClient(FLProgAbstractTcpInterface *sourse)
{
	setSourse(sourse);
}

void FLProgUdpClient::stop()
{
	_sourse->closeSoket(_sockindex);
	_sockindex = _sourse->maxSoketNum();
}

void FLProgUdpClient::setSourse(FLProgAbstractTcpInterface *sourse)
{
	_sourse = sourse;
	_dns.setSourse(sourse);
	_status = FLPROG_READY_STATUS;
}

int FLProgUdpClient::beginPacket(const char *host, uint16_t port)
{
	uint8_t remote_addr[4] = {0, 0, 0, 0};
	uint8_t result = _dns.getHostByName(host, remote_addr);
	if (result == FLPROG_WAIT)
	{
		_status = FLPROG_WAIT_ETHERNET_DNS_STATUS;
		return FLPROG_WAIT;
	}
	if (result == FLPROG_ERROR)
	{
		_status = FLPROG_READY_STATUS;
		_errorCode = _dns.getError();
		return FLPROG_ERROR;
	}
	return beginIpPacket(IPAddress(remote_addr[0], remote_addr[1], remote_addr[2], remote_addr[3]), port);
}

uint8_t FLProgUdpClient::beginMulticast(IPAddress ip, uint16_t port)
{
	if (_sockindex < _sourse->maxSoketNum())
	{
		_sourse->closeSoket(_sockindex);
	}
	_sockindex = _sourse->beginMulticastSoket(ip, port);
	if (_sockindex >= _sourse->maxSoketNum())
	{
		return 0;
	}
	_port = port;
	_remaining = 0;
	return 1;
}

void FLProgUdpClient::setFlags()
{
	FLProgAbstactEthernetChanel::setFlags();
	_dns.setFlags();
}