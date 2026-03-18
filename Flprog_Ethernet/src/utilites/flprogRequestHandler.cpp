#include "flprogRequestHandler.h"

bool FLProgRequestHandler::canHandle(uint8_t method, String uri)
{
    if (method != _method)
    {
        return false;
    }
    if (!uri.equalsIgnoreCase(_uri))
    {
        return false;
    }
    if (_callBack == 0)
    {
        return false;
    }
    return true;
}

void FLProgRequestHandler::handle()
{
    if (_callBack == 0)
    {
        return;
    }
    _callBack(_server);
}