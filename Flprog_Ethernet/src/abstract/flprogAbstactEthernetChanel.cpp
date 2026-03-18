#include "flprogAbstactEthernetChanel.h"

void FLProgAbstactEthernetChanel::stop()
{
    _sourse->closeSoket(_sockindex);
    _sockindex = _sourse->maxSoketNum();
    _status = FLPROG_NOT_REDY_STATUS;
}

uint8_t FLProgAbstactEthernetChanel::checkReadySourse()
{
    if (_sourse->isReady())
    {
        return FLPROG_SUCCESS;
    }
    _errorCode = FLPROG_ETHERNET_INTERFACE_NOT_READY_ERROR;
    _status = FLPROG_NOT_REDY_STATUS;
    return FLPROG_ERROR;
}

void FLProgAbstactEthernetChanel::readToNull(uint16_t count)
{
    for (uint16_t i = 0; i < count; i++)
    {
        read();
    }
}
void FLProgAbstactEthernetChanel::setFlags()
{
    if (_oldStatus != _status)
    {
        _isChangeStatus = true;
        _oldStatus = _status;
    }
    if (_oldError != _errorCode)
    {
        _isChangeError = true;
        _oldError = _errorCode;
    }
    
}

bool FLProgAbstactEthernetChanel::getIsChangeStatusWithReset()
{
    bool temp = _isChangeStatus;
    _isChangeStatus = false;
    return temp;
}

bool FLProgAbstactEthernetChanel::getIsChangeErrorWithReset()
{
    bool temp = _isChangeError;
    _isChangeError = false;
    return temp;
}



bool FLProgAbstactEthernetChanel::statusForExtGetBitWithReset(uint8_t bit)
{
    bool temp = bitRead(_statusForExt, bit);
    bitWrite(_statusForExt, bit, 0);
    return temp;
}
