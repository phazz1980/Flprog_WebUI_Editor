#include "flprogNTP.h"

FLProgNTP::FLProgNTP(FLProgAbstractTcpInterface *interface)
{
    _interface = interface;
    _udp = new FLProgUdpClient(_interface);
}

void FLProgNTP::pool()
{
    setFlags();
    if (_isUseAsClock)
    {
        RT_HW_Base.unixUpdateTime(unixID);
    }
    if (_udp != 0)
    {
        _udp->setFlags();
    }
    if (_timeServerMode == FLPROG_NTP_NOT_SET_TIMRSERVER_MODE)
    {
        _isReplyInProcess = false;
        _status = FLPROG_NOT_REDY_STATUS;
        _errorCode = FLPROG_ETHERNET_NTP_NOT_SERVER_ERROR;
        return;
    }
    if (_interface == 0)
    {
        _isReplyInProcess = false;
        _status = FLPROG_NOT_REDY_STATUS;
        _errorCode = FLPROG_ETHERNET_HARDWARE_INIT_ERROR;
        return;
    }
    if (!_interface->isReady())
    {
        _isReplyInProcess = false;
        _status = FLPROG_NOT_REDY_STATUS;
        _errorCode = FLPROG_ETHERNET_INTERFACE_NOT_READY_ERROR;
        return;
    }
    if (_isReplyInProcess)
    {
        processingResponse();
        return;
    }
    sendNTPpacket();
}

void FLProgNTP::sendNTPpacket()
{
    uint8_t result;
    if (!flprog::isTimer(_sendPacadeTime, _reqestPeriod))
    {
        return;
    }
    _udp->begin(_localPort);
    if (
        _timeServerMode == FLPROG_NTP_CHAR_TIMRSERVER_MODE)
    {
        result = _udp->beginPacket(_timeServerChar, 123);
    }
    else
    {
        result = _udp->beginPacket(_timeServerIp, 123);
    }
    _status = FLPROG_WAIT_SEND_UDP_PACAGE;
    _errorCode = FLPROG_NOT_ERROR;
    if (result == FLPROG_WAIT)
    {
        return;
    }
    memset(_packetBuffer, 0, FLPROG_NTP_PACKET_SIZE);
    _packetBuffer[0] = 0b11100011; // LI, Version, Mode
    _packetBuffer[1] = 0;          // Stratum, or type of clock
    _packetBuffer[2] = 6;          // Polling Interval
    _packetBuffer[3] = 0xEC;       // Peer Clock Precision
    _packetBuffer[12] = 49;
    _packetBuffer[13] = 0x4E;
    _packetBuffer[14] = 49;
    _packetBuffer[15] = 52;
    if (result == FLPROG_SUCCESS)
    {
        if (_udp->write(_packetBuffer, FLPROG_NTP_PACKET_SIZE))
        {
            if (_udp->endPacket())
            {
                _isReplyInProcess = true;
                _status = FLPROG_WAIT_UDP_PACAGE_ANSVER;
                _errorCode = FLPROG_NOT_ERROR;
            }
        }
    }
    _sendPacadeTime = millis();
}

void FLProgNTP::timeServer(String timeServerString)
{
    IPAddress temp;
    if (temp.fromString(timeServerString))
    {
        timeServer(temp);
        return;
    }
    timeServerString.toCharArray(_timeServerChar, FLPROG_HOST_NAME_LENGTH);
    _timeServerMode = FLPROG_NTP_CHAR_TIMRSERVER_MODE;
}

void FLProgNTP::timeServer(IPAddress timeServerIp)
{
    _timeServerIp = timeServerIp;
    _timeServerMode = FLPROG_NTP_IP_TIMRSERVER_MODE;
}

void FLProgNTP::processingResponse()
{
    if (flprog::isTimer(_sendPacadeTime, 15000)) // проверяем прошло ли время ожидания ответа
    {
        _isReplyInProcess = false;
        _udp->stop();
        _status = FLPROG_READY_STATUS;
        _errorCode = FLPROG_ETHERNET_UDP_TIMEOUT_ERROR;
        return;
    }
    if (_udp->parsePacket() <= 0)
    {
        return;
    }
    _udp->read(_packetBuffer, FLPROG_NTP_PACKET_SIZE);
    _udp->stop();
    uint16_t highWord = word(_packetBuffer[40], _packetBuffer[41]);
    uint16_t lowWord = word(_packetBuffer[42], _packetBuffer[43]);
    uint32_t secsSince1900 = ((uint32_t)highWord << 16) | lowWord;
    uint32_t _unixTime = secsSince1900 - 2208988800UL;
    RT_HW_Base.unixSetTimeUNIX(unixID, _unixTime);
    _isReplyInProcess = false;
    _status = FLPROG_READY_STATUS;
    _errorCode = FLPROG_NOT_ERROR;
    _counter++;
    if (_callBack != 0)
    {
        _callBack();
    }
}