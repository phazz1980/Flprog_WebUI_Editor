#include "flprogOTA.h"

void FLProgAbstractOTA::pool()
{
    if (!_workStatus)
    {
        return;
    }
    privatePool();
}