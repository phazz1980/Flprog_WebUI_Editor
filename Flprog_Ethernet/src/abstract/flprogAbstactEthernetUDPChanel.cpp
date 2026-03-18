#include "flprogAbstactEthernetUDPChanel.h"

size_t FLProgAbstactEthernetUDPChanel::write(const uint8_t *buffer, size_t size)
{

    if (_sourse->type() == FLPROG_ETHERNET_INTERFACE)
    {
        uint16_t bytes_written = _sourse->bufferDataSoket(_sockindex, _offset, buffer, size);
        _offset += bytes_written;
        return bytes_written;
    }
    return _sourse->writeToSoket(_sockindex, buffer, size);
}

int FLProgAbstactEthernetUDPChanel::available()
{
    if (_sourse->type() == FLPROG_ETHERNET_INTERFACE)
    {
        return _remaining;
    }
    return _sourse->availableSoket(_sockindex);
};

int FLProgAbstactEthernetUDPChanel::parsePacket()
{
    if (_sourse->type() == FLPROG_ETHERNET_INTERFACE)
    {
        while (_remaining)
        {
            readToNull(_remaining);
        }

        if (_sourse->availableSoket(_sockindex) > 0)
        {
            uint8_t tmpBuf[8];
            int ret = 0;
            ret = _sourse->recvSoket(_sockindex, tmpBuf, 8);
            if (ret > 0)
            {
                _remoteIP = tmpBuf;
                _remotePort = tmpBuf[4];
                _remotePort = (_remotePort << 8) + tmpBuf[5];
                _remaining = tmpBuf[6];
                _remaining = (_remaining << 8) + tmpBuf[7];
                ret = _remaining;
            }
            return ret;
        }
        return 0;
    }
    return _sourse->parsePacketSocet(_sockindex);
}

int FLProgAbstactEthernetUDPChanel::read()
{
    if (_sourse->type() == FLPROG_ETHERNET_INTERFACE)
    {
        uint8_t byte;
        if ((_remaining > 0) && (_sourse->recvSoket(_sockindex, &byte, 1) > 0))
        {
            _remaining--;
            return byte;
        }
        return -1;
    }
    return _sourse->readFromSoket(_sockindex);
}

int FLProgAbstactEthernetUDPChanel::read(uint8_t *buffer, size_t len)
{
    if (_sourse->type() == FLPROG_ETHERNET_INTERFACE)
    {

        if (_remaining > 0)
        {
            int got;
            if (_remaining <= len)
            {
                got = _sourse->recvSoket(_sockindex, buffer, _remaining);
            }
            else
            {
                got = _sourse->recvSoket(_sockindex, buffer, len);
            }
            if (got > 0)
            {
                _remaining -= got;
                return got;
            }
        }
        return -1;
    }
    return _sourse->readFromSoket(_sockindex, buffer, len);
}

int FLProgAbstactEthernetUDPChanel::endPacket()
{
    while (_sourse->sendUdpSoket(_sockindex) == FLPROG_WAIT)
    {
    };
    return FLPROG_SUCCESS;
}

int FLProgAbstactEthernetUDPChanel::beginIpPacket(IPAddress ip, uint16_t port)
{
    _offset = 0;
    uint8_t buffer[4];
    flprog::ipToArray(ip, buffer);
    if (_sourse->startUdpSoket(_sockindex, buffer, port))
    {
        _errorCode = FLPROG_NOT_ERROR;
        return FLPROG_SUCCESS;
    }
    _errorCode = FLPROG_ETHERNET_UDP_SOKET_START_ERROR;
    return FLPROG_ERROR;
}

uint8_t FLProgAbstactEthernetUDPChanel::begin(uint16_t port)
{
    if (!_sourse->isInit())
    {
        _status = FLPROG_NOT_REDY_STATUS;
        _errorCode = FLPROG_ETHERNET_INTERFACE_NOT_READY_ERROR;
        return FLPROG_ERROR;
    }
    if (_port == port)
    {
        if (_sockindex < _sourse->maxSoketNum())
        {

            _errorCode = FLPROG_NOT_ERROR;
            return FLPROG_SUCCESS;
        }
    }
    _port = port;
    _sourse->closeSoket(_sockindex);
    _sockindex = _sourse->getUDPSoket(port);
    if (_sockindex >= _sourse->maxSoketNum())
    {

        _errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
        return FLPROG_ERROR;
    }

    _remaining = 0;
    return FLPROG_SUCCESS;
}

int FLProgAbstactEthernetUDPChanel::peek()
{
    if (_sourse->type() == FLPROG_ETHERNET_INTERFACE)
    {
        if (_sockindex >= _sourse->maxSoketNum() || _remaining == 0)
        {
            return -1;
        }
    }
    return _sourse->peekSoket(_sockindex);
}
