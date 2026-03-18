#pragma once
#include <Arduino.h>
#include "flprogEthernet.h"

#define FLPROG_WEB_CLIENT_NOT_SET_HOST_MODE 0
#define FLPROG_WEB_CLIENT_IP_HOST_MODE 1
#define FLPROG_WEB_CLIENT_STRING_HOST_MODE 2

typedef void (*FLProgWebClientCallBack)();
typedef void (*FLProgWebClientCallBackForEachByte)(uint8_t);

class FLProgWebClient : public AbstractFLProgClass
{
public:
    FLProgWebClient(FLProgAbstractTcpInterface *interface);
    void pool();

    void setHost(String host);
    void setHost(IPAddress host);

    void setPort(uint16_t port) { _port = port; };
    void setReqestTimeout(uint32_t reqestTimeout) { _reqestTimeout = reqestTimeout; };

    String getAnswerString() { return _answerString; };
    bool hasAnswer() { return _hasAnswer; };
    void setDnsCacheStorageTime(uint32_t value) { _client->setDnsCacheStorageTime(value); };

    void setCallBack(FLProgWebClientCallBack func) { _callBack = func; };
    void setCallBackForEachByte(FLProgWebClientCallBackForEachByte func) { _callBackForEachByte = func; };

    void sendReqest(String reqest);

protected:
    void ressiveData();
    FLProgWebClientCallBack _callBack = 0;
    FLProgWebClientCallBackForEachByte _callBackForEachByte = 0;
    FLProgAbstractTcpInterface *_interface = 0;
    FLProgEthernetClient *_client = 0;
    uint8_t _hostMode = FLPROG_WEB_CLIENT_NOT_SET_HOST_MODE;
    char _stringHost[FLPROG_HOST_NAME_LENGTH] = "";
    IPAddress _ipHost = FLPROG_INADDR_NONE;
    uint16_t _port = 0;
    String _reqest = "";
    uint32_t _startSendReqest;
    uint32_t _reqestTimeout = 5000;
    String _answerString = "";
    bool _hasAnswer = false;
};