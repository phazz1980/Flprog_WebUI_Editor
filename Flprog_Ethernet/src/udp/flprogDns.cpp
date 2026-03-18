#include "flprogDns.h"

void FLProgDNSClient::setSourse(FLProgAbstractTcpInterface *sourse)
{
	_sourse = sourse;
	_status = FLPROG_READY_STATUS;
}

void FLProgDNSClient::stop()
{
	_sourse->closeSoket(_sockindex);
	_sockindex = _sourse->maxSoketNum();
	_status = FLPROG_NOT_REDY_STATUS;
}

bool FLProgDNSClient::checkCach(const char *aHostname, uint8_t *aResult)
{
	if (flprog::isTimer(_startCachTime, _cacheStorageTime))
	{
		_cachedHost = "";
		_cachedIP = FLPROG_INADDR_NONE;
		return false;
	}
	if (!(_cachedHost.equals(String(aHostname))))
	{
		_cachedHost = "";
		_cachedIP = FLPROG_INADDR_NONE;
		return false;
	}
	if (_cachedIP == FLPROG_INADDR_NONE)
	{
		_cachedHost = "";
		return false;
	}
	flprog::ipToArray(_cachedIP, aResult);
	return true;
}

int FLProgDNSClient::getHostByName(const char *aHostname, uint8_t *aResult, uint16_t timeout)
{
	uint8_t result;
	if (!_sourse->isReadyForDNS())
	{

		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_NOT_ERROR;
		return FLPROG_WAIT;
	}
	if (checkCach(aHostname, aResult))
	{
		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_NOT_ERROR;
		return FLPROG_SUCCESS;
	}
	if (_status == FLPROG_READY_STATUS)
	{
		IPAddress temp(aResult[0], aResult[1], aResult[2], aResult[3]);
		if (flprog::inet_aton_1(aHostname, temp))
		{
			aResult[0] = temp[0];
			aResult[1] = temp[1];
			aResult[2] = temp[2];
			aResult[3] = temp[3];
			_cachedIP = temp;
			_startCachTime = millis();
			_cachedHost = String(aHostname);
			_wait_retries = 0;
			_errorCode = FLPROG_NOT_ERROR;
			return FLPROG_SUCCESS;
		}
		if (_sourse->dns() == FLPROG_INADDR_NONE)
		{
			_wait_retries = 0;
			_status = FLPROG_NOT_REDY_STATUS;
			_errorCode = FLPROG_ETHERNET_DNS_INVALID_SERVER;
			return FLPROG_ERROR;
		}
		if (begin(1024 + (millis() & 0xF)) != FLPROG_SUCCESS)
		{
			stop();
			_wait_retries = 0;
			return FLPROG_ERROR;
		}
		if (beginIpPacket(_sourse->dns(), FLPROG_DNS_PORT) != FLPROG_SUCCESS)
		{
			stop();
			_wait_retries = 0;
			_errorCode = FLPROG_ETHERNET_UDP_SOKET_START_ERROR;
			return FLPROG_ERROR;
		}
		buildRequest(aHostname);
		_status = FLPROG_WAIT_SEND_UDP_PACAGE;
	}
	if (_status == FLPROG_WAIT_SEND_UDP_PACAGE)
	{
		result = _sourse->sendUdpSoket(_sockindex);
		if (result == FLPROG_ERROR)
		{
			_wait_retries = 0;
			_errorCode = FLPROG_ETHERNET_UDP_SOKET_START_ERROR;
			return FLPROG_ERROR;
		}
		if (result == FLPROG_WAIT)
		{
			return FLPROG_WAIT;
		}
		_startTime = millis();
		_reqestStartTime = millis();
		_status = FLPROG_WAIT_ETHERNET_UDP_STATUS;
		_errorCode = FLPROG_NOT_ERROR;
		return FLPROG_WAIT;
	}
	result = processResponse(timeout, aHostname, aResult);
	if (result == FLPROG_WAIT)
	{
		return FLPROG_WAIT;
	}
	stop();
	_wait_retries = 0;
	_status = FLPROG_READY_STATUS;
	return result;
}

uint16_t FLProgDNSClient::buildRequest(const char *aName)
{
	_iRequestId = millis();
	uint16_t twoByteBuffer;
	write((uint8_t *)&_iRequestId, sizeof(_iRequestId));
	twoByteBuffer = flprogEthernetHtons((int32_t)(FLPROG_DNS_QUERY_FLAG | FLPROG_DNS_OPCODE_STANDARD_QUERY | FLPROG_DNS_RECURSION_DESIRED_FLAG));
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	twoByteBuffer = flprogEthernetHtons(1);
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	twoByteBuffer = 0;
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	const char *start = aName;
	const char *end = start;
	uint8_t len;
	while (*end)
	{
		end = start;
		while (*end && (*end != '.'))
		{
			end++;
		}
		if (end - start > 0)
		{
			len = end - start;
			write(&len, sizeof(len));
			write((uint8_t *)start, end - start);
		}
		start = end + 1;
	}
	len = 0;
	write(&len, sizeof(len));
	twoByteBuffer = flprogEthernetHtons(FLPROG_DNS_TYPE_A);
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	twoByteBuffer = flprogEthernetHtons(FLPROG_DNS_CLASS_IN);
	write((uint8_t *)&twoByteBuffer, sizeof(twoByteBuffer));
	return FLPROG_SUCCESS;
}

uint16_t FLProgDNSClient::processResponse(uint16_t aTimeout, const char *aHostname, uint8_t *aAddress)
{

	if (flprog::isTimer(_startTime, aTimeout))
	{
		if (_wait_retries > 2)
		{
			_wait_retries = 0;
			_status = FLPROG_READY_STATUS;
			_errorCode = FLPROG_ETHERNET_UDP_TIMEOUT_ERROR;
			return FLPROG_ERROR;
		}
		_wait_retries++;
		_startTime = millis();
		stop();
		_status = FLPROG_READY_STATUS;
		return FLPROG_WAIT;
	}
	if (!(flprog::isTimer(_reqestStartTime, 50)))
	{
		return FLPROG_WAIT;
	}
	_reqestStartTime = millis();
	if (parsePacket() <= 0)
	{
		return FLPROG_WAIT;
	}
	union
	{
		uint8_t byte[FLPROG_DNS_HEADER_SIZE];
		uint16_t word[FLPROG_DNS_HEADER_SIZE / 2];
	} header;

	if (available() < FLPROG_DNS_HEADER_SIZE)
	{
		_errorCode = FLPROG_ETHERNET_DNS_TRUNCATED;
		_status = FLPROG_READY_STATUS;
		return FLPROG_ERROR;
	}
	read(header.byte, FLPROG_DNS_HEADER_SIZE);
	uint16_t header_flags = flprogEthernetHtons(header.word[1]);
	if ((_iRequestId != (header.word[0])) ||
		((header_flags & FLPROG_DNS_QUERY_RESPONSE_MASK) != (uint16_t)FLPROG_DNS_RESPONSE_FLAG))
	{
		_errorCode = FLPROG_ETHERNET_DNS_INVALID_RESPONSE;
		_status = FLPROG_READY_STATUS;
		return FLPROG_ERROR;
	}
	if ((header_flags & FLPROG_DNS_TRUNCATION_FLAG) || (header_flags & FLPROG_DNS_RESP_MASK))
	{
		_errorCode = FLPROG_ETHERNET_DNS_INVALID_RESPONSE;
		_status = FLPROG_READY_STATUS;
		return FLPROG_ERROR;
	}
	uint16_t answerCount = flprogEthernetHtons(header.word[3]);
	if (answerCount == 0)
	{
		_errorCode = FLPROG_ETHERNET_DNS_INVALID_RESPONSE;
		_status = FLPROG_READY_STATUS;
		return FLPROG_ERROR;
	}
	uint8_t tempRead;
	for (uint16_t i = 0; i < flprogEthernetHtons(header.word[2]); i++)
	{
		do
		{
			tempRead = read();

		} while (tempRead != 0);
		readToNull(4);
	}
	for (uint16_t i = 0; i < answerCount; i++)
	{
		tempRead = read();
		if ((tempRead & FLPROG_DNS_LABEL_COMPRESSION_MASK) == 0)
		{
			do
			{
				tempRead = read();

			} while (tempRead != 0);
		}
		else
		{
			read();
		}
		uint16_t answerType;
		uint16_t answerClass;
		read((uint8_t *)&answerType, sizeof(answerType));
		read((uint8_t *)&answerClass, sizeof(answerClass));

		readToNull(FLPROG_DNS_TTL_SIZE); // don't care about the returned bytes
		read((uint8_t *)&header_flags, sizeof(header_flags));
		if ((flprogEthernetHtons(answerType) == FLPROG_DNS_TYPE_A) && (flprogEthernetHtons(answerClass) == FLPROG_DNS_CLASS_IN))
		{
			if (flprogEthernetHtons(header_flags) != 4)
			{
				_errorCode = FLPROG_ETHERNET_DNS_INVALID_RESPONSE;
				_status = FLPROG_READY_STATUS;
				return FLPROG_ERROR;
			}
			read(aAddress, 4);
			_startCachTime = millis();
			_cachedHost = String(aHostname);
			_cachedIP = IPAddress(aAddress[0], aAddress[1], aAddress[2], aAddress[3]);
			return FLPROG_SUCCESS;
		}
		else
		{
			readToNull(flprogEthernetHtons(header_flags));
		}
	}
	_errorCode = FLPROG_ETHERNET_DNS_INVALID_RESPONSE;
	_status = FLPROG_READY_STATUS;
	return FLPROG_ERROR;
}
