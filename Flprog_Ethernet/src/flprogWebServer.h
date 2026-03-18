#pragma once
#include <Arduino.h>
#include "flprogEthernet.h"
#include "utilites/flprogRequestHandler.h"

#define FLPROG_WEB_SERVER_INACTION_STEP 0
#define FLPROG_WEB_SERVER_READ_FIRST_LINE_STEP 1
#define FLPROG_WEB_SERVER_READ_SECOND_LINE_STEP 2

#define FLPROG_WEB_SERVER_WORK_DATA_STEP_1 3

#define FLPROG_WEB_SERVER_PARSE_POST_STEP_1 4
#define FLPROG_WEB_SERVER_PARSE_POST_STEP_2 5

#define FLPROG_WEB_SERVER_PARSE_GET_STEP_1 6
#define FLPROG_WEB_SERVER_PARSE_GET_STEP_2 7
#define FLPROG_WEB_SERVER_PARSE_GET_STEP_3 8

#define FLPROG_WEB_SERVER_SENDING_SIZE 50

struct FLProgWebServerRequestArgument
{
    String key;
    String value;
};

struct FLProgWebServerReqest
{
    uint8_t currentVersion;
    String currentUri;
    bool chunked;
    int clientContentLength;
    uint8_t method;
    String hostHeader;
    FLProgWebServerRequestArgument *headers;
    uint16_t headerKeysCount = 0;
    FLProgWebServerRequestArgument *currentArgs;
    uint16_t currentArgCount;
};

class FLProgWebServer : public Print
{
public:
    FLProgWebServer(FLProgAbstractTcpInterface *sourse, uint16_t port = 80);

    void addHandler(String uri, FLProgWebServerCallback callBack, uint8_t method);
    void addHandler(String uri, FLProgWebServerCallback callBack, String method) { addHandler(uri, callBack, (getHttpMethodCode(method))); };
    void addHandler(String uri, FLProgWebServerCallback callBack) { addHandler(uri, callBack, FLPROG_WEB_SERVER_GET); };
    void add404Page(FLProgWebServerCallback callBack) { _callBack_404 = callBack; };

    void pool();

    uint8_t method() { return _reqest.method; };
    String uri() { return _reqest.currentUri; };
    uint8_t methodVersion() { return _reqest.currentVersion; };
    String host() { return _reqest.hostHeader; };

    uint16_t headersCount() { return _reqest.headerKeysCount; };
    String headerKeyAtIndex(uint16_t index);
    bool hasHeaderKey(String key);
    String headerValueAtKey(String key);

    uint16_t argumentsCount() { return _reqest.currentArgCount; };
    String argumentKeyAtIndex(uint16_t index);
    bool hasArgumentKey(String key);
    String argumentValueAtKey(String key);

    uint8_t getStatus() { return _status; };
    uint8_t getError() { return _errorCode; };

    void sendDefault200Page();
    void sendDefault404Page();
    void send403Page(String value);
    void sendJson(String value);

    virtual size_t write(const uint8_t *buf, size_t size);
    virtual size_t write(uint8_t byte) { return _server.write(&byte, 1); };

    uint16_t getSkippingEvents() { return _skippingEvents; };
    void setSkippingEvents(uint16_t value) { _skippingEvents = value; };

private:
    void parseReqest();
    uint8_t readStringUntil(char terminator);
    uint8_t parseGetReqest();
    void parseArguments(String data);
    String urlDecode(const String &text);
    void addHeader(String headerName, String headerValue);
    uint8_t getHttpMethodCode(String method);
    void sendAnswer();
    void stopConnection();

    void flush();

    uint8_t _errorCode = FLPROG_NOT_ERROR;
    uint8_t _status = FLPROG_NOT_REDY_STATUS;
    FLProgEthernetServer _server;
    uint32_t _startReadStringTime;
    uint8_t _step = FLPROG_WEB_SERVER_INACTION_STEP;
    String _readingString = "";
    FLProgWebServerReqest _reqest;
    String _reqestString;
    String _searchStr;
    FLProgRequestHandler *_handlers;
    uint16_t _handlersCount = 0;
    FLProgWebServerCallback _callBack_404 = 0;
    uint16_t _writeBufferSize = 0;
    uint8_t _writeBuffer[FLPROG_WRITE_BUFFER_SIZE];
    uint16_t _skippingEvents = 0;
    uint16_t _eventsCount = 0;
};