#include "flprogWebClient.h"

FLProgWebClient::FLProgWebClient(FLProgAbstractTcpInterface *interface)
{
    _interface = interface;
    _client = new FLProgEthernetClient(_interface);
}

void FLProgWebClient::setHost(String host)
{
    IPAddress temp;
    if (temp.fromString(host))
    {
        setHost(temp);
        return;
    }

    host.toCharArray(_stringHost, FLPROG_HOST_NAME_LENGTH);
    _hostMode = FLPROG_WEB_CLIENT_STRING_HOST_MODE;
}

void FLProgWebClient::setHost(IPAddress host)
{
    _ipHost = host;
    _hostMode = FLPROG_WEB_CLIENT_IP_HOST_MODE;
}

void FLProgWebClient::sendReqest(String reqest)
{
    if (_hostMode == FLPROG_WEB_CLIENT_NOT_SET_HOST_MODE)
    {
        _status = FLPROG_READY_STATUS;
        _client->stop();
        return;
    }
    if (_port == 0)
    {
        _status = FLPROG_READY_STATUS;
        _client->stop();
        return;
    }
    if (!((_status == FLPROG_READY_STATUS) || (_status == FLPROG_WAIT_ETHERNET_CLIENT_CONNECT_STATUS)))
    {
        _client->stop();
        return;
    }
    _errorCode = FLPROG_NOT_ERROR;
    _reqest = reqest;
    _answerString = "";
    _hasAnswer = false;
    uint8_t temp;
    if (_hostMode == FLPROG_WEB_CLIENT_STRING_HOST_MODE)
    {
        temp = _client->connect(_stringHost, _port);
    }
    else
    {
        temp = _client->connect(_ipHost, _port);
    }
    if (temp == FLPROG_WAIT)
    {
        _status = FLPROG_WAIT_ETHERNET_CLIENT_CONNECT_STATUS;
        _errorCode = FLPROG_NOT_ERROR;
        return;
    }
    if (temp == FLPROG_ERROR)
    {
        _status = FLPROG_READY_STATUS;
        _errorCode = _client->getErrorCode();
        return;
    }
    _startSendReqest = millis();
    _client->print(_reqest);
    _status = FLPROG_WAIT_ETHERNET_CLIENT_ANSWER_STATUS;
    _errorCode = FLPROG_NOT_ERROR;
}

void FLProgWebClient::pool()
{
    setFlags();
    _client->setFlags();
    if (!_interface->isReady())
    {
        _client->stop();
        _status = FLPROG_WAIT_ETHERNET_CONNECT_STATUS;
        _errorCode = FLPROG_NOT_ERROR;
        return;
    }
    else
    {
        if (_status == FLPROG_WAIT_ETHERNET_CONNECT_STATUS)
        {
            _status = FLPROG_READY_STATUS;
        }
    }
    if (_status == FLPROG_READY_STATUS)
    {
        return;
    }
    if (_status == FLPROG_WAIT_ETHERNET_CLIENT_CONNECT_STATUS)
    {
        sendReqest(_reqest);
        return;
    }

    if (_status == FLPROG_WAIT_ETHERNET_CLIENT_ANSWER_STATUS)
    {
        ressiveData();
        return;
    }
}

void FLProgWebClient::ressiveData()
{
    if (_status != FLPROG_WAIT_ETHERNET_CLIENT_ANSWER_STATUS)
    {
        return;
    }
    if (flprog::isTimer(_startSendReqest, _reqestTimeout))
    {
        _status = FLPROG_READY_STATUS;
        _errorCode = FLPROG_ETHERNET_CLIENT_ANSWER_TIMEOUT_ERROR;
        return;
    }
    if (_client->available() == 0)
    {
        return;
    }
    while (_client->available())
    {
        uint8_t tempByte = _client->read();
        char ch = static_cast<char>(tempByte);
        if (_callBackForEachByte != 0)
        {
            _callBackForEachByte(tempByte);
        }
        _answerString.concat(ch);
    }
    _status = FLPROG_READY_STATUS;
    _errorCode = FLPROG_NOT_ERROR;
    _hasAnswer = true;
    if (_callBack != 0)
    {
        _callBack();
    }
}