#include "flprogAbstactEthernetTCPChanel.h"
int FLProgAbstactEthernetTCPChanel::available()
{
    if (_sourse == 0)
    {
        return 0;
    }
    return _sourse->availableSoket(_sockindex);
}

size_t FLProgAbstactEthernetTCPChanel::write(const uint8_t *buf, size_t size)
{
    if (_sourse == 0)
    {
        return 0;
    }
    return _sourse->writeToSoket(_sockindex, buf, size);
}
