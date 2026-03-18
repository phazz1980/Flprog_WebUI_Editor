#include "flprogWebServer.h"

FLProgWebServer::FLProgWebServer(FLProgAbstractTcpInterface *sourse, uint16_t port)
{
    _server.setSourse(sourse);
    _server.setPort(port);
    _status = FLPROG_READY_STATUS;
}

void FLProgWebServer::addHandler(String uri, FLProgWebServerCallback callBack, uint8_t method)
{
    String newUri;
    if (uri.length() == 0)
    {
        newUri = "/" + uri;
    }
    else
    {
        newUri = uri;
    }
    if (newUri[0] != '/')
    {
        newUri = "/" + newUri;
    }

    if (_handlersCount > 0)
    {
        FLProgRequestHandler temp[_handlersCount];

        for (uint16_t i = 0; i < _handlersCount; i++)
        {
            temp[i] = _handlers[i];
        }
        delete[] _handlers;
        _handlers = new FLProgRequestHandler[_handlersCount + 1];

        for (uint16_t i = 0; i < _handlersCount; i++)
        {
            _handlers[i] = temp[i];
        }
    }
    else
    {
        _handlers = new FLProgRequestHandler[1];
    }
    _handlers[_handlersCount].setUri(newUri);
    _handlers[_handlersCount].setMethod(method);
    _handlers[_handlersCount].setCallBack(callBack);
    _handlers[_handlersCount].setServer(this);
    _handlersCount++;
}

String FLProgWebServer::headerKeyAtIndex(uint16_t index)
{
    if (index >= _reqest.headerKeysCount)
    {
        return "";
    }
    return _reqest.headers[index].key;
}

String FLProgWebServer::argumentKeyAtIndex(uint16_t index)
{
    if (index >= _reqest.currentArgCount)
    {
        return "";
    }
    return _reqest.currentArgs[index].key;
}

bool FLProgWebServer::hasHeaderKey(String key)
{
    for (uint16_t i = 0; i < _reqest.headerKeysCount; i++)
    {
        if (key.equalsIgnoreCase(_reqest.headers[i].key))
        {
            return true;
        }
    }
    return false;
}

bool FLProgWebServer::hasArgumentKey(String key)
{
    for (uint16_t i = 0; i < _reqest.currentArgCount; i++)
    {
        if (key.equalsIgnoreCase(_reqest.currentArgs[i].key))
        {
            return true;
        }
    }
    return false;
}

String FLProgWebServer::headerValueAtKey(String key)
{
    for (uint16_t i = 0; i < _reqest.headerKeysCount; i++)
    {
        if (key.equalsIgnoreCase(_reqest.headers[i].key))
        {
            return _reqest.headers[i].value;
        }
    }
    return "";
}

String FLProgWebServer::argumentValueAtKey(String key)
{
    for (uint16_t i = 0; i < _reqest.currentArgCount; i++)
    {
        if (key.equalsIgnoreCase(_reqest.currentArgs[i].key))
        {
            return _reqest.currentArgs[i].value;
        }
    }
    return "";
}

void FLProgWebServer::pool()
{
    if (_eventsCount < _skippingEvents)
    {
        _eventsCount++;
        return;
    }
    _eventsCount = 0;
    if (_server.getSourse() == 0)
    {
        return;
    }
    if (!_server.getSourse()->isReady())
    {
        return;
    }
    if (_status == FLPROG_WAIT_WEB_SERVER_READ_REQEST)
    {
        parseReqest();
        return;
    }
    if (_status == FLPROG_WAIT_WEB_SERVER_SEND_ANSVER)
    {
        sendAnswer();
        return;
    }
    if (!_server.connected())
    {
        return;
    }
    if (!_server.available())
    {
        return;
    }
    parseReqest();
}

void FLProgWebServer::parseReqest()
{
    if (_status != FLPROG_WAIT_WEB_SERVER_READ_REQEST)
    {
        _startReadStringTime = millis();
        _readingString = "";
        _writeBufferSize = 0;
        _status = FLPROG_WAIT_WEB_SERVER_READ_REQEST;
        _step = FLPROG_WEB_SERVER_READ_FIRST_LINE_STEP;
    }
    uint8_t result;
    if (_step == FLPROG_WEB_SERVER_READ_FIRST_LINE_STEP)
    {
        result = readStringUntil('\r');
        if (result == FLPROG_WAIT)
        {
            return;
        }
        _reqestString = _readingString;
        _readingString = "";
        _step = FLPROG_WEB_SERVER_READ_SECOND_LINE_STEP;
    }
    if (_step == FLPROG_WEB_SERVER_READ_SECOND_LINE_STEP)
    {
        result = readStringUntil('\n');
        if (result == FLPROG_WAIT)
        {
            return;
        }
        _readingString = "";
        _step = FLPROG_WEB_SERVER_WORK_DATA_STEP_1;
    }

    if (_step == FLPROG_WEB_SERVER_WORK_DATA_STEP_1)
    {
        int addr_start = _reqestString.indexOf(' ');
        int addr_end = _reqestString.indexOf(' ', addr_start + 1);
        _reqest.method = getHttpMethodCode(_reqestString.substring(0, addr_start));
        _reqest.currentUri = _reqestString.substring(addr_start + 1, addr_end);
        _reqest.currentVersion = atoi((_reqestString.substring(addr_end + 8)).c_str());
        _searchStr = "";
        int hasSearch = _reqest.currentUri.indexOf('?');
        if (hasSearch != -1)
        {
            _searchStr = _reqest.currentUri.substring(hasSearch + 1);
            _reqest.currentUri = _reqest.currentUri.substring(0, hasSearch);
        }
        _reqest.chunked = false;
        _reqest.clientContentLength = 0;
        _readingString = "";
        if (_reqest.method == (FLPROG_WEB_SERVER_POST) || (_reqest.method == FLPROG_WEB_SERVER_PUT) || (_reqest.method == FLPROG_WEB_SERVER_PATCH) || (_reqest.method == FLPROG_WEB_SERVER_DELETE))
        {
            _step = FLPROG_WEB_SERVER_PARSE_POST_STEP_1;
        }
        else
        {

            if (_reqest.headers)
            {
                delete[] _reqest.headers;
            }
            _reqest.headerKeysCount = 0;
            _step = FLPROG_WEB_SERVER_PARSE_GET_STEP_1;
        }
    }

    if ((_step == FLPROG_WEB_SERVER_PARSE_POST_STEP_1) || (_step == FLPROG_WEB_SERVER_PARSE_POST_STEP_2))
    {
        _step = FLPROG_WEB_SERVER_INACTION_STEP;
    }

    if ((_step == FLPROG_WEB_SERVER_PARSE_GET_STEP_1) || (_step == FLPROG_WEB_SERVER_PARSE_GET_STEP_2))
    {
        result = parseGetReqest();
        if (result == FLPROG_WAIT)
        {
            return;
        }
    }
    _step = FLPROG_WEB_SERVER_INACTION_STEP;
    sendAnswer();
}

void FLProgWebServer::sendAnswer()
{
    _status = FLPROG_WAIT_WEB_SERVER_SEND_ANSVER;
    for (uint16_t i = 0; i < _handlersCount; i++)
    {
        if (_handlers[i].canHandle(_reqest.method, _reqest.currentUri))
        {
            _handlers[i].handle();
            stopConnection();
            return;
        }
    }
    if (_callBack_404 == 0)
    {
        sendDefault404Page();
        stopConnection();
        return;
    }
    _callBack_404(this);
    stopConnection();
}

void FLProgWebServer::stopConnection()
{
    flush();
    _server.stopConnection();
    _status = FLPROG_READY_STATUS;
}

void FLProgWebServer::sendDefault404Page()
{
    _server.println("HTTP/1.1 404 Not Found");
    _server.println("Content-Type: text/html");
    _server.println("Connection: close");
    _server.println();
}

void FLProgWebServer::sendDefault200Page()
{
    _server.println("HTTP/1.1 200 OK");
    _server.println("Content-Type: text/html");
    _server.println("Connection: close");
    _server.println();
}

void FLProgWebServer::sendJson(String value)
{
    _server.println("HTTP/1.1 200 OK");
    _server.println("Content-Type: text/json");
    _server.println("Connection: close");
    _server.println();
    _server.print(value);
    _server.println();
}

void FLProgWebServer::send403Page(String value)
{
    _server.println("HTTP/1.1 403 Forbidden");
    _server.println("Content-Type: text/htm");
    _server.println("Connection: close");
    _server.println();
    _server.print(value);
    _server.println();
}

uint8_t FLProgWebServer::parseGetReqest()
{
    uint8_t result;
    if (_step == FLPROG_WEB_SERVER_PARSE_GET_STEP_1)
    {
        result = readStringUntil('\r');
        if (result == FLPROG_WAIT)
        {
            return FLPROG_WAIT;
        }
        _reqestString = _readingString;
        _readingString = "";
        _step = FLPROG_WEB_SERVER_PARSE_GET_STEP_2;
    }
    if (_step == FLPROG_WEB_SERVER_PARSE_GET_STEP_2)
    {
        result = readStringUntil('\n');
        if (result == FLPROG_WAIT)
        {
            return FLPROG_WAIT;
        }
        _readingString = "";
        if (_reqestString == "")
        {
            parseArguments(_searchStr);
            return FLPROG_SUCCESS;
        }
    }
    String headerName;
    String headerValue;
    int headerDiv = _reqestString.indexOf(':');
    if (headerDiv == -1)
    {
        parseArguments(_searchStr);
        return FLPROG_SUCCESS;
    }
    headerName = _reqestString.substring(0, headerDiv);
    headerValue = _reqestString.substring(headerDiv + 2);
    if (headerName.equalsIgnoreCase("Host"))
    {
        _reqest.hostHeader = headerValue;
    }
    addHeader(headerName, headerValue);
    _step = FLPROG_WEB_SERVER_PARSE_GET_STEP_1;
    return FLPROG_WAIT;
}

void FLProgWebServer::addHeader(String headerName, String headerValue)
{
    if (_reqest.headerKeysCount > 0)
    {
        FLProgWebServerRequestArgument temp[_reqest.headerKeysCount];

        for (uint16_t i = 0; i < _reqest.headerKeysCount; i++)
        {
            temp[i].key = _reqest.headers[i].key;
            temp[i].value = _reqest.headers[i].value;
        }
        delete[] _reqest.headers;
        _reqest.headers = new FLProgWebServerRequestArgument[_reqest.headerKeysCount + 1];
        for (uint16_t i = 0; i < _reqest.headerKeysCount; i++)
        {
            _reqest.headers[i].key = temp[i].key;
            _reqest.headers[i].value = temp[i].value;
        }
    }
    else
    {
        _reqest.headers = new FLProgWebServerRequestArgument[1];
    }
    _reqest.headers[_reqest.headerKeysCount].key = headerName;
    _reqest.headers[_reqest.headerKeysCount].value = headerValue;
    _reqest.headerKeysCount++;
}

void FLProgWebServer::parseArguments(String data)
{
    if (_reqest.currentArgs)
    {
        delete[] _reqest.currentArgs;
    }
    _reqest.currentArgs = 0;
    if (data.length() == 0)
    {
        _reqest.currentArgCount = 0;
        _reqest.currentArgs = new FLProgWebServerRequestArgument[1];
        return;
    }
    _reqest.currentArgCount = 1;
    for (int16_t i = 0; i < (int16_t)data.length();)
    {
        i = data.indexOf('&', i);
        if (i == -1)
            break;
        ++i;
        ++_reqest.currentArgCount;
    }
    _reqest.currentArgs = new FLProgWebServerRequestArgument[_reqest.currentArgCount + 1];
    int16_t pos = 0;
    int16_t iarg;
    for (iarg = 0; iarg < (int16_t)_reqest.currentArgCount;)
    {
        int16_t equal_sign_index = data.indexOf('=', pos);
        int16_t next_arg_index = data.indexOf('&', pos);
        if ((equal_sign_index == -1) || ((equal_sign_index > next_arg_index) && (next_arg_index != -1)))
        {
            if (next_arg_index == -1)
                break;
            pos = next_arg_index + 1;
            continue;
        }
        FLProgWebServerRequestArgument &arg = _reqest.currentArgs[iarg];
        arg.key = urlDecode(data.substring(pos, equal_sign_index));
        arg.value = urlDecode(data.substring(equal_sign_index + 1, next_arg_index));
        ++iarg;
        if (next_arg_index == -1)
            break;
        pos = next_arg_index + 1;
    }
    _reqest.currentArgCount = iarg;
}

String FLProgWebServer::urlDecode(const String &text)
{
    String decoded = "";
    char temp[] = "0x00";
    uint16_t len = text.length();
    uint16_t i = 0;
    while (i < len)
    {
        char decodedChar;
        char encodedChar = text.charAt(i++);
        if ((encodedChar == '%') && (i + 1 < len))
        {
            temp[2] = text.charAt(i++);
            temp[3] = text.charAt(i++);

            decodedChar = strtol(temp, NULL, 16);
        }
        else
        {
            if (encodedChar == '+')
            {
                decodedChar = ' ';
            }
            else
            {
                decodedChar = encodedChar;
            }
        }
        decoded += decodedChar;
    }
    return decoded;
}

uint8_t FLProgWebServer::readStringUntil(char terminator)
{
    if (flprog::isTimer(_startReadStringTime, 10))
    {
        return FLPROG_SUCCESS;
    }
    int16_t readChar;
    while (_server.available())
    {
        _startReadStringTime = millis();
        readChar = _server.read();
        if (readChar == terminator)
        {
            return FLPROG_SUCCESS;
        }
        else
        {
            _readingString += (char)readChar;
        }
    }
    return FLPROG_WAIT;
}

uint8_t FLProgWebServer::getHttpMethodCode(String method)
{
    /* Request Methods */
    if (method.equalsIgnoreCase("DELETE"))
    {
        return FLPROG_WEB_SERVER_DELETE;
    }
    if (method.equalsIgnoreCase("GET"))
    {
        return FLPROG_WEB_SERVER_GET;
    }
    if (method.equalsIgnoreCase("HEAD"))
    {
        return FLPROG_WEB_SERVER_HEAD;
    }
    if (method.equalsIgnoreCase("POST"))
    {
        return FLPROG_WEB_SERVER_POST;
    }
    if (method.equalsIgnoreCase("PUT"))
    {
        return FLPROG_WEB_SERVER_PUT;
    }
    /* pathological */
    if (method.equalsIgnoreCase("CONNECT"))
    {
        return FLPROG_WEB_SERVER_CONNECT;
    }
    if (method.equalsIgnoreCase("OPTIONS"))
    {
        return FLPROG_WEB_SERVER_OPTIONS;
    }
    if (method.equalsIgnoreCase("TRACE"))
    {
        return FLPROG_WEB_SERVER_TRACE;
    }
    /* WebDAV */
    if (method.equalsIgnoreCase("COPY"))
    {
        return FLPROG_WEB_SERVER_COPY;
    }
    if (method.equalsIgnoreCase("LOCK"))
    {
        return FLPROG_WEB_SERVER_LOCK;
    }
    if (method.equalsIgnoreCase("MKCOL"))
    {
        return FLPROG_WEB_SERVER_MKCOL;
    }
    if (method.equalsIgnoreCase("MOVE"))
    {
        return FLPROG_WEB_SERVER_MOVE;
    }
    if (method.equalsIgnoreCase("PROPFIND"))
    {
        return FLPROG_WEB_SERVER_PROPFIND;
    }
    if (method.equalsIgnoreCase("PROPPATCH"))
    {
        return FLPROG_WEB_SERVER_PROPPATCH;
    }
    if (method.equalsIgnoreCase("SEARCH"))
    {
        return FLPROG_WEB_SERVER_SEARCH;
    }
    if (method.equalsIgnoreCase("UNLOCK"))
    {
        return FLPROG_WEB_SERVER_UNLOCK;
    }
    if (method.equalsIgnoreCase("BIND"))
    {
        return FLPROG_WEB_SERVER_BIND;
    }
    if (method.equalsIgnoreCase("REBIND"))
    {
        return FLPROG_WEB_SERVER_REBIND;
    }
    if (method.equalsIgnoreCase("UNBIND"))
    {
        return FLPROG_WEB_SERVER_UNBIND;
    }
    if (method.equalsIgnoreCase("ACL"))
    {
        return FLPROG_WEB_SERVER_ACL;
    }
    /* subversion */
    if (method.equalsIgnoreCase("REPORT"))
    {
        return FLPROG_WEB_SERVER_REPORT;
    }
    if (method.equalsIgnoreCase("MKACTIVITY"))
    {
        return FLPROG_WEB_SERVER_MKACTIVITY;
    }
    if (method.equalsIgnoreCase("CHECKOU"))
    {
        return FLPROG_WEB_SERVER_CHECKOUT;
    }
    if (method.equalsIgnoreCase("MERGE"))
    {
        return FLPROG_WEB_SERVER_MERGE;
    }
    /* upnp */
    if (method.equalsIgnoreCase("MSEARCH"))
    {
        return FLPROG_WEB_SERVER_MSEARCH;
    }
    if (method.equalsIgnoreCase("NOTIFY"))
    {
        return FLPROG_WEB_SERVER_NOTIFY;
    }
    if (method.equalsIgnoreCase("SUBSCRIBE"))
    {
        return FLPROG_WEB_SERVER_SUBSCRIBE;
    }
    if (method.equalsIgnoreCase("UNSUBSCRIBE"))
    {
        return FLPROG_WEB_SERVER_UNSUBSCRIBE;
    }
    /* RFC-5789 */
    if (method.equalsIgnoreCase("PATCH"))
    {
        return FLPROG_WEB_SERVER_PATCH;
    }
    if (method.equalsIgnoreCase("PURGE"))
    {
        return FLPROG_WEB_SERVER_PURGE;
    }
    /* CalDAV */
    if (method.equalsIgnoreCase("MKCALENDAR"))
    {
        return FLPROG_WEB_SERVER_MKCALENDAR;
    }
    /* RFC-2068, section 19.6.1.2 */
    if (method.equalsIgnoreCase("LINK"))
    {
        return FLPROG_WEB_SERVER_LINK;
    }
    if (method.equalsIgnoreCase("UNLINK"))
    {
        return FLPROG_WEB_SERVER_UNLINK;
    }
    return FLPROG_WEB_SERVER_GET;
}

size_t FLProgWebServer::write(const uint8_t *buf, size_t size)
{
    if ((_writeBufferSize + size) >= FLPROG_WRITE_BUFFER_SIZE)
    {
        if (_writeBufferSize > 0)
        {
            flush();
        }
        if (size > FLPROG_WRITE_BUFFER_SIZE)
        {
            _server.write(buf, size);
            return size;
        }
    }
    for (size_t i = 0; i < size; i++)
    {
        _writeBuffer[_writeBufferSize] = buf[i];
        _writeBufferSize++;
    }
    return size;
}

void FLProgWebServer::flush()
{
    if (_writeBufferSize > 0)
    {
        _server.write(_writeBuffer, _writeBufferSize);
        _writeBufferSize = 0;
    }
}