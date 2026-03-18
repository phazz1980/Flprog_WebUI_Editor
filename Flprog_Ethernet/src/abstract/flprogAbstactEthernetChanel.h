#pragma once
#include <Arduino.h>
#include "IPAddress.h"
#include "flprogUtilites.h"
#include "flprogAbstractTcpInterface.h"

#define flprogEthernetHtons(x) ((((x) << 8) & 0xFF00) | (((x) >> 8) & 0xFF))
#define flprogEthernetNtohs(x) flprogEthernetHtons(x)

#define flprogEthernetHtonl(x) (((x) << 24 & 0xFF000000UL) | \
                                ((x) << 8 & 0x00FF0000UL) |  \
                                ((x) >> 8 & 0x0000FF00UL) |  \
                                ((x) >> 24 & 0x000000FFUL))
#define flporgEthernetNtohl(x) flprogEthernetHtonl(x)

class FLProgAbstactEthernetChanel : public Print
{
public:
    virtual void setSourse(FLProgAbstractTcpInterface *sourse) { _sourse = sourse; };
    virtual size_t write(uint8_t byte) { return write(&byte, 1); };
    virtual void stop();
    // int read(char *buffer, size_t len) { return read((uint8_t *)buffer, len); };
    uint8_t getStatus() { return _status; };
    uint8_t getError() { return _errorCode; };
    uint8_t getErrorCode() { return _errorCode; };
    FLProgAbstractTcpInterface *getSourse() { return _sourse; };
    void flush() {};

    virtual size_t write(const uint8_t *buf, size_t size) = 0;
    virtual int read() = 0;
    void readToNull(uint16_t count);

    bool getIsChangeStatus() { return _isChangeStatus; };
    bool getIsChangeStatusWithReset();
    void setIsChangeStatus(bool value) { _isChangeStatus = value; };

    bool getIsChangeError() { return _isChangeError; };
    bool getIsChangeErrorWithReset();
    void setIsChangeError(bool value) { _isChangeError = value; };

    uint32_t statusForExt() { return _statusForExt; };

    bool statusForExtGetBit(uint8_t bit) { return bitRead(_statusForExt, bit); };
    void statusForExtResetBit(uint8_t bit) { bitWrite(_statusForExt, bit, 0); };

    bool statusForExtGetBitWithReset(uint8_t bit);
    void statusForExtSetBit(uint8_t bit) { bitWrite(_statusForExt, bit, 1); };
    virtual void setFlags();

protected:
    uint8_t checkReadySourse();
    FLProgAbstractTcpInterface *_sourse = 0;
    uint8_t _errorCode = FLPROG_NOT_ERROR;
    uint8_t _status = FLPROG_NOT_REDY_STATUS;
    uint8_t _sockindex = 255;

    // Флаги изменения параметров
    uint8_t _oldStatus = FLPROG_NOT_REDY_STATUS;
    bool _isChangeStatus = false;
    uint8_t _oldError = FLPROG_NOT_ERROR;
    bool _isChangeError = false;
    uint32_t _statusForExt = 1;
};
