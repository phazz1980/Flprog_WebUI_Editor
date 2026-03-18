#include "flprogEthernetClient.h"

FLProgEthernetClient::FLProgEthernetClient(FLProgAbstractTcpInterface *sourse)
{
	init(sourse);
}

void FLProgEthernetClient::init(FLProgAbstractTcpInterface *sourse)
{
	if (isInit)
	{
		return;
	}
	_sourse = sourse;
	_dns.setSourse(sourse);
	_status = FLPROG_READY_STATUS;
	isInit = true;
}

int FLProgEthernetClient::connect(const char *host, uint16_t port)
{
	if (!_sourse->isReady())
	{
		stop();
		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_ETHERNET_INTERFACE_NOT_READY_ERROR;
		return FLPROG_ERROR;
	}
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
	return connect(IPAddress(remote_addr[0], remote_addr[1], remote_addr[2], remote_addr[3]), port);
}

int FLProgEthernetClient::connect(IPAddress ip, uint16_t port)
{
	if (!_sourse->isReady())
	{
		_sourse->closeSoket(_sockindex);
		_sockindex = _sourse->maxSoketNum();
		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_ETHERNET_INTERFACE_NOT_READY_ERROR;
		return FLPROG_ERROR;
	}
	if (_status == FLPROG_WAIT_ETHERNET_START_CLIENT_CONNECT_STATUS)
	{
		if (flprog::isTimer(_startConnectTime, 50))
		{
			_status = FLPROG_WAIT_ETHERNET_CLIENT_CONNECT_STATUS;
		}
		return FLPROG_WAIT;
	}
	if (_status == FLPROG_WAIT_ETHERNET_CLIENT_CONNECT_STATUS)
	{
		if (flprog::isTimer(_startConnectTime, (_timeout + 50)))
		{
			_status = FLPROG_READY_STATUS;
			_errorCode = FLPROG_ETHERNET_CLIENT_CONNECT_TIMEOUT_ERROR;
			_sourse->closeSoket(_sockindex);
			_sockindex = _sourse->maxSoketNum();
			return FLPROG_ERROR;
		}
		if (_sourse->soketConnected(_sockindex))
		{
			_status = FLPROG_READY_STATUS;
			_errorCode = FLPROG_NOT_ERROR;
			return FLPROG_SUCCESS;
		}
		return FLPROG_WAIT;
	}
	if (_sockindex < _sourse->maxSoketNum())
	{
		_sourse->closeSoket(_sockindex);
		_sockindex = _sourse->maxSoketNum();
	}
	_sockindex = _sourse->getClientTCPSoket(0);
	if (_sockindex >= _sourse->maxSoketNum())
	{
		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_ETHERNET_CLIENT_SOKET_START_ERROR;
		return FLPROG_ERROR;
	}
	_sourse->connectSoket(_sockindex, ip, port);
	_startConnectTime = millis();
	_status = FLPROG_WAIT_ETHERNET_START_CLIENT_CONNECT_STATUS;
	return FLPROG_WAIT;
}

uint8_t FLProgEthernetClient::connected()
{
	if (!_sourse->isReady())
	{
		return 0;
	}
	if (_status != FLPROG_READY_STATUS)
	{
		return 0;
	}
	return _sourse->soketConnected(_sockindex);
}

uint8_t FLProgEthernetClient::status()
{
	return _sourse->statusSoket(_sockindex);
}

void FLProgEthernetClient::setFlags()
{
	FLProgAbstactEthernetChanel::setFlags();
	_dns.setFlags();
}