#pragma once
#include <Arduino.h>
#include "flprogEthernet.h"

/* Request Methods */
#define FLPROG_WEB_SERVER_DELETE 0
#define FLPROG_WEB_SERVER_GET 1
#define FLPROG_WEB_SERVER_HEAD 2
#define FLPROG_WEB_SERVER_POST 3
#define FLPROG_WEB_SERVER_PUT 4
/* pathological */
#define FLPROG_WEB_SERVER_CONNECT 5
#define FLPROG_WEB_SERVER_OPTIONS 6
#define FLPROG_WEB_SERVER_TRACE 7
/* WebDAV */
#define FLPROG_WEB_SERVER_COPY 8
#define FLPROG_WEB_SERVER_LOCK 9
#define FLPROG_WEB_SERVER_MKCOL 10
#define FLPROG_WEB_SERVER_MOVE 11
#define FLPROG_WEB_SERVER_PROPFIND 12
#define FLPROG_WEB_SERVER_PROPPATCH 13
#define FLPROG_WEB_SERVER_SEARCH 14
#define FLPROG_WEB_SERVER_UNLOCK 15
#define FLPROG_WEB_SERVER_BIND 16
#define FLPROG_WEB_SERVER_REBIND 17
#define FLPROG_WEB_SERVER_UNBIND 18
#define FLPROG_WEB_SERVER_ACL 19
/* subversion */
#define FLPROG_WEB_SERVER_REPORT 20
#define FLPROG_WEB_SERVER_MKACTIVITY 21
#define FLPROG_WEB_SERVER_CHECKOUT 22
#define FLPROG_WEB_SERVER_MERGE 23
/* upnp */
#define FLPROG_WEB_SERVER_MSEARCH 24
#define FLPROG_WEB_SERVER_NOTIFY 25
#define FLPROG_WEB_SERVER_SUBSCRIBE 26
#define FLPROG_WEB_SERVER_UNSUBSCRIBE 27
/* RFC-5789 */
#define FLPROG_WEB_SERVER_PATCH 28
#define FLPROG_WEB_SERVER_PURGE 29
/* CalDAV */
#define FLPROG_WEB_SERVER_MKCALENDAR 30
/* RFC-2068, section 19.6.1.2 */
#define FLPROG_WEB_SERVER_LINK 31
#define FLPROG_WEB_SERVER_UNLINK 33

class FLProgWebServer;

typedef void (*FLProgWebServerCallback)(FLProgWebServer *);

class FLProgRequestHandler
{
public:
    FLProgRequestHandler(){};

    void setServer(FLProgWebServer *server) { _server = server; };
    void setMethod(uint8_t method) { _method = method; };
    void setUri(String uri) { _uri = uri; };
    void setCallBack(FLProgWebServerCallback func) { _callBack = func; };

    bool canHandle(uint8_t method, String uri);
    void handle();

private:
    FLProgWebServerCallback _callBack = 0;
    FLProgWebServer *_server;
    uint8_t _method = FLPROG_WEB_SERVER_GET;
    String _uri = "/";
};