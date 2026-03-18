#include "flprogEthernetServer.h"

void FLProgEthernetServer::stop()
{
	_sourse->closeSoket(_sockindex);
	_sockindex = _sourse->maxSoketNum();
	_status = FLPROG_NOT_REDY_STATUS;
	_serverIsConnect = false;
}

FLProgEthernetServer::FLProgEthernetServer(FLProgAbstractTcpInterface *sourse, uint16_t port)
{
	_sourse = sourse;
	_port = port;
}

uint8_t FLProgEthernetServer::setPort(uint16_t port)
{
	if (_port == port)
	{
		return FLPROG_SUCCESS;
	}
	_port = port;
	stop();
	return FLPROG_SUCCESS;
}

uint8_t FLProgEthernetServer::pool()
{
	setFlags();
	if (_sourse == 0)
	{
		_status = FLPROG_NOT_REDY_STATUS;
		_errorCode = FLPROG_ETHERNET_HARDWARE_INIT_ERROR;
		return FLPROG_ERROR;
	}
	if (_callbackFunction == 0)
	{
		_status = FLPROG_NOT_REDY_STATUS;
		_errorCode = FLPROG_ETHERNET_SERVER_NOT_CALLBACK_ERROR;
		return FLPROG_ERROR;
	}
	if (!connected())
	{
		return FLPROG_SUCCESS;
	}
	if (!available())
	{
		return FLPROG_SUCCESS;
	}
	_callbackFunction();
	return FLPROG_SUCCESS;
}

uint8_t FLProgEthernetServer::begin()
{
	if (_sourse == 0)
	{
		_status = FLPROG_NOT_REDY_STATUS;
		_errorCode = FLPROG_ETHERNET_HARDWARE_INIT_ERROR;
		return FLPROG_ERROR;
	}
	if (checkReadySourse() == FLPROG_ERROR)
	{
		_status = FLPROG_NOT_REDY_STATUS;
		if (_sockindex < _sourse->maxSoketNum())
		{
			_sourse->closeSoket(_sockindex);
			_sockindex = _sourse->maxSoketNum();
		}
		return FLPROG_ERROR;
	}
	if (_sockindex < _sourse->maxSoketNum())
	{
		_sourse->closeSoket(_sockindex);
		_sockindex = _sourse->maxSoketNum();
	}
	_sockindex = _sourse->getServerTCPSoket(_port);
	if (_sockindex >= _sourse->maxSoketNum())
	{
		_status = FLPROG_NOT_REDY_STATUS;
		_errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
		return FLPROG_ERROR;
	}
	_status = FLPROG_READY_STATUS;
	_errorCode = FLPROG_NOT_ERROR;
	return FLPROG_SUCCESS;
}

uint8_t FLProgEthernetServer::connected()
{

	if (_sourse == 0)
	{
		_status = FLPROG_NOT_REDY_STATUS;
		_errorCode = FLPROG_ETHERNET_HARDWARE_INIT_ERROR;
		return 0;
	}
	if (checkReadySourse() == FLPROG_ERROR)
	{
		_serverIsConnect = false;
		_status = FLPROG_NOT_REDY_STATUS;
		if (_sockindex < _sourse->maxSoketNum())
		{
			_sourse->closeSoket(_sockindex);
			_sockindex = _sourse->maxSoketNum();
		}
		return 0;
	}
	if (_status == FLPROG_NOT_REDY_STATUS)
	{
		_serverIsConnect = false;
		begin();
		return 0;
	}
	if (_sourse->soketConnected(_sockindex))
	{
		_serverIsConnect = true;
		return 1;
	}
	if (_serverIsConnect)
	{
		stopConnection();
	}
	return 0;
}

void FLProgEthernetServer::stopConnection()
{
	_serverIsConnect = false;
	if (_sourse == 0)
	{
		return;
	}
	_sourse->disconnecSoket(_sockindex);
	if (_sourse->type() != FLPROG_ETHERNET_INTERFACE)
	{
		return;
	}
	_sourse->closeSoket(_sockindex);
	_sockindex = _sourse->maxSoketNum();
	_sockindex = _sourse->getServerTCPSoket(_port);
	if (_sockindex >= _sourse->maxSoketNum())
	{
		_status = FLPROG_NOT_REDY_STATUS;
		_errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
	}
}
