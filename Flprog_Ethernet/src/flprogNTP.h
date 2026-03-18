#pragma once
#include "flprogEthernet.h"

#define FLPROG_NTP_NOT_SET_TIMRSERVER_MODE 0
#define FLPROG_NTP_CHAR_TIMRSERVER_MODE 1
#define FLPROG_NTP_IP_TIMRSERVER_MODE 2

#define FLPROG_NTP_PACKET_SIZE 48

typedef void (*FLProgNTPCallback)();

class FLProgNTP : public AbstractFLProgClass
{
public:
    FLProgNTP(FLProgAbstractTcpInterface *interface);
    void pool();
    void reqestPeriod(bool value) { _reqestPeriod = value * 1000; };
    uint16_t reqestPeriod() { return ((uint16_t)(_reqestPeriod / 1000)); };

    void isUseAsClock(bool value) { _isUseAsClock = value; };
    bool isUseAsClock() { return _isUseAsClock; };

    void localPort(uint32_t value) { _localPort = value; };
    uint32_t localPort() { return _localPort; };
    void timeServer(String timeServerString);
    void timeServer(IPAddress timeServerIp);
    FLProgUdpClient *udp() { return _udp; };

    uint8_t getStatus() { return _status; };
    uint8_t getError() { return _errorCode; };

    void setCallBack(FLProgNTPCallback func) { _callBack = func; };

    uint32_t getUnixTime() { return unixID.timeUNIX; };
    uint8_t getSecond() { return unixID.seconds; };
    uint8_t getMinutes() { return unixID.minutes; };
    uint8_t getHours() { return unixID.hours; };
    uint8_t getDay() { return unixID.day; };
    uint8_t getMonth() { return unixID.month; };
    uint16_t getYear() { return unixID.year; };

    uint32_t getCounter() { return _counter; };
     
    RT_HW_STRUCT_UNIX_ID unixID;

protected:
    void sendNTPpacket();
    void processingResponse();

    FLProgAbstractTcpInterface *_interface = 0;
    FLProgUdpClient *_udp = 0;
    bool _isReplyInProcess = false;
    uint32_t _sendPacadeTime = flprog::timeBack(3600000);
    uint32_t _reqestPeriod = 3600000;
    uint32_t _localPort = 8888;
    char _timeServerChar[FLPROG_HOST_NAME_LENGTH];
    IPAddress _timeServerIp;
    uint8_t _timeServerMode = FLPROG_NTP_NOT_SET_TIMRSERVER_MODE;
    uint8_t _packetBuffer[FLPROG_NTP_PACKET_SIZE];
    FLProgNTPCallback _callBack = 0;
    bool _isUseAsClock = true;
    uint32_t _counter = 0;
};
