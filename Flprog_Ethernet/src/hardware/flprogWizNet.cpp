#include "flprogWizNet.h"

void FLProgWiznetClass::setPinCs(int pinCs)
{
	if (pinCs == -1)
	{
		_device.cs = RT_HW_Base.getCsETH0();
		return;
	}
	_device.cs = pinCs;
}

void FLProgWiznetClass::setSpiBus(uint8_t bus)
{
	if (bus == 255)
	{
		_device.bus = RT_HW_Base.getBusETH0();
		return;
	}
	_device.bus = bus;
}

uint8_t FLProgWiznetClass::init()
{
	if (_status == FLPROG_READY_STATUS)
	{
		return FLPROG_SUCCESS;
	}
	if (_status == FLPROG_WAIT_ETHERNET_HARDWARE_INIT_STATUS)
	{
		return checkInit();
	}
	_status = FLPROG_WAIT_ETHERNET_HARDWARE_INIT_STATUS;
	_startWhiteInitTime = millis();
	return FLPROG_WAIT;
}

uint8_t FLProgWiznetClass::getServerTCPSoket(uint16_t port)
{
	uint8_t sockindex = socketBegin(FLPROG_WIZNET_SN_MR_TCP, port);
	if (sockindex < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		if (socketListen(sockindex))
		{
			return sockindex;
		}
		else
		{
			socketDisconnect(sockindex);
			return FLPROG_WIZNET_MAX_SOCK_NUM;
		}
	}
	return FLPROG_WIZNET_MAX_SOCK_NUM;
}

uint8_t FLProgWiznetClass::soketConnected(uint8_t soket)
{
	if (soket < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		uint8_t s = socketStatus(soket);
		return !((s == FLPROG_WIZNET_SN_SR_LISTEN) || (s == FLPROG_WIZNET_SN_SR_CLOSED) || (s == FLPROG_WIZNET_SN_SR_FIN_WAIT) ||
				 ((s == FLPROG_WIZNET_SN_SR_CLOSE_WAIT) && !socketRecvAvailable(soket)));
	}
	return 0;
}

int FLProgWiznetClass::readFromSoket(uint8_t soket)
{
	uint8_t b;
	if (soket < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		if (socketRecv(soket, &b, 1) > 0)
		{

			return b;
		}
	}
	return -1;
}

uint8_t FLProgWiznetClass::readFromSoket(uint8_t soket, uint8_t *buf, int16_t len)
{

	if (soket < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		return socketRecv(soket, buf, len);
	}
	return 0;
}

size_t FLProgWiznetClass::writeToSoket(uint8_t soket, const uint8_t *buffer, size_t size)
{
	if (soket < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		if (socketStatus(soket) == FLPROG_WIZNET_SN_SR_ESTABLISHED)
		{
			return socketSend(soket, buffer, size);
		}
	}
	return 0;
}

uint8_t FLProgWiznetClass::isConnectStatusSoket(uint8_t soket)
{
	if (soket < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		uint8_t stat = socketStatus(soket);
		return ((stat == FLPROG_WIZNET_SN_SR_ESTABLISHED) || (stat == FLPROG_WIZNET_SN_SR_CLOSE_WAIT));
	}
	return 0;
}

uint8_t FLProgWiznetClass::isCosedStatusSoket(uint8_t soket)
{
	if (soket < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		return (socketStatus(soket) == FLPROG_WIZNET_SN_SR_CLOSED);
	}
	return 0;
}

uint8_t FLProgWiznetClass::checkInit()
{
	if (!(flprog::isTimer(_startWhiteInitTime, 600)))
	{
		_status = FLPROG_WAIT_ETHERNET_HARDWARE_INIT_STATUS;
		return FLPROG_WAIT;
	}
	_device.speed = SPI_ETHERNET_SPEED;
	RT_HW_Base.spiInitDevice(_device);
	if (getChip() == FLPROG_ETHERNET_NO_HARDWARE)
	{
		return FLPROG_ERROR;
	}
	_status = FLPROG_READY_STATUS;
	_errorCode = FLPROG_NOT_ERROR;
	return FLPROG_SUCCESS;
}

void FLProgWiznetClass::setNetSettings(uint8_t *mac, IPAddress ip)
{
	beginTransaction();
	setMACAddress(mac);
	setIPAddress(ip);
	endTransaction();
}

void FLProgWiznetClass::setNetSettings(IPAddress ip, IPAddress gateway, IPAddress subnet)
{
	beginTransaction();
	setIPAddress(ip);
	setGatewayIp(gateway);
	setSubnetMask(subnet);
	endTransaction();
}

void FLProgWiznetClass::setNetSettings(uint8_t *mac, IPAddress ip, IPAddress gateway, IPAddress subnet)
{
	beginTransaction();
	setMACAddress(mac);
	setIPAddress(ip);
	setGatewayIp(gateway);
	setSubnetMask(subnet);
	endTransaction();
}

IPAddress FLProgWiznetClass::localIP()
{
	beginTransaction();
	IPAddress result = getIPAddress();
	endTransaction();
	return result;
}

IPAddress FLProgWiznetClass::subnetMask()
{
	beginTransaction();
	IPAddress result = getSubnetMask();
	endTransaction();
	return result;
}

IPAddress FLProgWiznetClass::gatewayIP()
{
	IPAddress ret;
	beginTransaction();
	IPAddress result = getGatewayIp();
	endTransaction();
	return result;
}

void FLProgWiznetClass::setOnlyMACAddress(const uint8_t *mac_address)
{
	beginTransaction();
	setMACAddress(mac_address);
	endTransaction();
}

void FLProgWiznetClass::setOnlyLocalIP(const IPAddress local_ip)
{
	beginTransaction();
	IPAddress ip = local_ip;
	setIPAddress(ip);
	endTransaction();
}

void FLProgWiznetClass::setOnlySubnetMask(const IPAddress subnet)
{
	beginTransaction();
	IPAddress ip = subnet;
	setSubnetMask(ip);
	endTransaction();
}

void FLProgWiznetClass::setOnlyGatewayIP(const IPAddress gateway)
{
	beginTransaction();
	IPAddress ip = gateway;
	setGatewayIp(ip);
	endTransaction();
}

void FLProgWiznetClass::MACAddress(uint8_t *mac_address)
{
	beginTransaction();
	getMACAddress(mac_address);
	endTransaction();
}

uint16_t FLProgWiznetClass::localPort(uint8_t soc)
{
	if (!(soc < FLPROG_WIZNET_MAX_SOCK_NUM))
	{
		return 0;
	}
	uint16_t port;
	beginTransaction();
	port = readSn16(soc, FLPROG_WIZNET_SN_PORT);
	endTransaction();
	return port;
}

IPAddress FLProgWiznetClass::remoteIP(uint8_t soc)
{
	if (soc >= FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		return FLPROG_INADDR_NONE;
	}
	uint8_t buffer[4];
	beginTransaction();
	readSn(soc, FLPROG_WIZNET_SN_DIPR, buffer, 4);
	endTransaction();
	return IPAddress(buffer);
}

uint16_t FLProgWiznetClass::remotePort(uint8_t soc)
{
	if (!(soc < FLPROG_WIZNET_MAX_SOCK_NUM))
	{
		return 0;
	}
	uint16_t port;
	beginTransaction();
	port = readSn16(soc, FLPROG_WIZNET_SN_DPORT);
	endTransaction();
	return port;
}

uint16_t FLProgWiznetClass::SBASE(uint8_t socknum)
{
	if (_chip == FLPROG_ETHERNET_W5100)
	{
		return socknum * SSIZE + 0x4000;
	}
	else
	{
		return socknum * SSIZE + 0x8000;
	}
}

uint16_t FLProgWiznetClass::RBASE(uint8_t socknum)
{
	if (_chip == FLPROG_ETHERNET_W5100)
	{
		return socknum * SSIZE + 0x6000;
	}
	else
	{
		return socknum * SSIZE + 0xC000;
	}
}

bool FLProgWiznetClass::hasOffsetAddressMapping()
{
	if (_chip == FLPROG_ETHERNET_W5500)
	{
		return true;
	}
	return false;
}

void FLProgWiznetClass::setIPAddress(IPAddress addr)
{
	uint8_t buffer[4];
	flprog::ipToArray(addr, buffer);
	write(FLPROG_WIZNET_SIPR, buffer, 4);
}

IPAddress FLProgWiznetClass::getIPAddress()
{
	uint8_t buffer[4];
	read(FLPROG_WIZNET_SIPR, buffer, 4);
	return IPAddress(buffer[0], buffer[1], buffer[2], buffer[3]);
}

void FLProgWiznetClass::setGatewayIp(IPAddress addr)
{
	uint8_t buffer[4];
	flprog::ipToArray(addr, buffer);
	write(FLPROG_WIZNET_GAR, buffer, 4);
}

IPAddress FLProgWiznetClass::getGatewayIp()
{
	uint8_t buffer[4] = {0, 0, 0, 0};
	read(FLPROG_WIZNET_GAR, buffer, 4);
	return IPAddress(buffer[0], buffer[1], buffer[2], buffer[3]);
}

void FLProgWiznetClass::setSubnetMask(IPAddress addr)
{
	uint8_t buffer[4];
	flprog::ipToArray(addr, buffer);
	write(FLPROG_WIZNET_SUBR, buffer, 4);
}

IPAddress FLProgWiznetClass::getSubnetMask()
{
	uint8_t buffer[4] = {0, 0, 0, 0};
	read(FLPROG_WIZNET_SUBR, buffer, 4);
	return IPAddress(buffer[0], buffer[1], buffer[2], buffer[3]);
}

void FLProgWiznetClass::setRetransmissionTime(uint16_t timeout)
{
	if (timeout > 6553)
		timeout = 6553;
	beginTransaction();
	write16(FLPROG_WIZNET_RTR, (timeout * 10));
	endTransaction();
}

void FLProgWiznetClass::setRetransmissionCount(uint8_t retry)
{
	beginTransaction();
	write(FLPROG_WIZNET_RCR, retry);
	endTransaction();
}

uint8_t FLProgWiznetClass::read(uint16_t addr)
{
	uint8_t data;
	read(addr, &data, 1);
	return data;
}

uint16_t FLProgWiznetClass::readSn16(uint8_t _s, uint16_t address)
{
	uint8_t buf[2];
	readSn(_s, address, buf, 2);
	return (buf[0] << 8) | buf[1];
}

void FLProgWiznetClass::writeSn16(uint8_t _s, uint16_t address, uint16_t _data)
{
	uint8_t buf[2];
	buf[0] = _data >> 8;
	buf[1] = _data & 0xFF;
	writeSn(_s, address, buf, 2);
}

void FLProgWiznetClass::write16(uint16_t address, uint16_t _data)
{
	uint8_t buf[2];
	buf[0] = _data >> 8;
	buf[1] = _data & 0xFF;
	write(address, buf, 2);
}

uint8_t FLProgWiznetClass::softReset(void)
{
	uint16_t count = 0;
	write(FLPROG_WIZNET_MR, 0x80);
	do
	{
		uint8_t mr = read(FLPROG_WIZNET_MR);

		if (mr == 0)
			return 1;
		delay(1);
	} while (++count < 20);
	return 0;
}

uint8_t FLProgWiznetClass::checkHardware()
{
	if (_chip == FLPROG_ETHERNET_W5100)
	{
		return FLPROG_SUCCESS;
	}
	int ver;
	if (_chip == FLPROG_ETHERNET_W5200)
	{
		ver = read(FLPROG_WIZNET_VERSIONR_W5200);
		if (ver == 3)
		{
			return FLPROG_SUCCESS;
		}
	}
	if (_chip == FLPROG_ETHERNET_W5500)
	{
		ver = read(FLPROG_WIZNET_VERSIONR_W5500);
		if (ver == 4)
		{
			return FLPROG_SUCCESS;
		}
	}
	_status = FLPROG_NOT_REDY_STATUS;
	_errorCode = FLPROG_ETHERNET_HARDWARE_INIT_ERROR;
	return FLPROG_ERROR;
}

uint8_t FLProgWiznetClass::isW5100(void)
{
	_chip = FLPROG_ETHERNET_W5100;
	if (!softReset())
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x10);
	if (read(FLPROG_WIZNET_MR) != 0x10)
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x12);
	if (read(FLPROG_WIZNET_MR) != 0x12)
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x00);
	if (read(FLPROG_WIZNET_MR) != 0x00)
	{
		return 0;
	}
	return 1;
}

uint8_t FLProgWiznetClass::isW5200(void)
{
	_chip = FLPROG_ETHERNET_W5200;
	if (!softReset())
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x08);
	if (read(FLPROG_WIZNET_MR) != 0x08)
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x10);
	if (read(FLPROG_WIZNET_MR) != 0x10)
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x00);
	if (read(FLPROG_WIZNET_MR) != 0x00)
	{
		return 0;
	}
	int ver = read(FLPROG_WIZNET_VERSIONR_W5200);
	if (ver != 3)
	{
		return 0;
	}
	return 1;
}

uint8_t FLProgWiznetClass::isW5500(void)
{
	_chip = FLPROG_ETHERNET_W5500;
	if (!softReset())
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x08);
	if (read(FLPROG_WIZNET_MR) != 0x08)
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x10);
	if (read(FLPROG_WIZNET_MR) != 0x10)
	{
		return 0;
	}
	write(FLPROG_WIZNET_MR, 0x00);
	if (read(FLPROG_WIZNET_MR) != 0x00)
		return 0;
	int ver = read(FLPROG_WIZNET_VERSIONR_W5500);
	if (ver != 4)
	{
		return 0;
	}
	return 1;
}

uint8_t FLProgWiznetClass::getLinkStatus()
{
	uint8_t phystatus;
	if (!isInit())
	{
		return FLPROG_ETHERNET_LINK_UNKNOWN;
	}
	if (_chip == FLPROG_ETHERNET_W5100)
	{
		return FLPROG_ETHERNET_LINK_ON;
	}
	if (_chip == FLPROG_ETHERNET_W5200)
	{
		beginTransaction();
		phystatus = read(FLPROG_WIZNET_PSTATUS_W5200);
		endTransaction();
		if (phystatus & 0x20)
		{
			return FLPROG_ETHERNET_LINK_ON;
		}
		return FLPROG_ETHERNET_LINK_OFF;
	}

	if (_chip == FLPROG_ETHERNET_W5500)
	{
		beginTransaction();
		phystatus = read(FLPROG_WIZNET_PHYCFGR_W5500);
		endTransaction();
		if (phystatus & 0x01)
		{
			return FLPROG_ETHERNET_LINK_ON;
		}
		return FLPROG_ETHERNET_LINK_OFF;
	}
	return FLPROG_ETHERNET_LINK_UNKNOWN;
}

uint16_t FLProgWiznetClass::write(uint16_t addr, const uint8_t *buf, uint16_t len)
{
	uint8_t cmd[8];
	if (_chip == FLPROG_ETHERNET_W5100)
	{
		for (uint16_t i = 0; i < len; i++)
		{
			setCs();
			spiTransfer(0xF0);
			spiTransfer(addr >> 8);
			spiTransfer(addr & 0xFF);
			addr++;
			spiTransfer(buf[i]);
			resetCs();
		}
	}
	else if (_chip == FLPROG_ETHERNET_W5200)
	{
		setCs();
		cmd[0] = addr >> 8;
		cmd[1] = addr & 0xFF;
		cmd[2] = ((len >> 8) & 0x7F) | 0x80;
		cmd[3] = len & 0xFF;
		for (uint8_t i = 0; i < 4; i++)
		{
			spiTransfer(cmd[i]);
		}
		for (uint16_t i = 0; i < len; i++)
		{
			spiTransfer((buf[i]));
		}
		resetCs();
	}
	else
	{ // _chip == FLPROG_ETHERNET_W5500
		setCs();
		if (addr < 0x100)
		{
			cmd[0] = 0;
			cmd[1] = addr & 0xFF;
			cmd[2] = 0x04;
		}
		else if (addr < 0x8000)
		{
			cmd[0] = 0;
			cmd[1] = addr & 0xFF;
			cmd[2] = ((addr >> 3) & 0xE0) | 0x0C;
		}
		else if (addr < 0xC000)
		{
			cmd[0] = addr >> 8;
			cmd[1] = addr & 0xFF;
			cmd[2] = ((addr >> 6) & 0xE0) | 0x14; // 2K buffers
		}
		else
		{
			cmd[0] = addr >> 8;
			cmd[1] = addr & 0xFF;
			cmd[2] = ((addr >> 6) & 0xE0) | 0x1C; // 2K buffers
		}
		if (len <= 5)
		{
			for (uint8_t i = 0; i < len; i++)
			{
				cmd[i + 3] = buf[i];
			}
			for (uint16_t i = 0; i < (len + 3); i++)
			{
				spiTransfer(cmd[i]);
			}
		}
		else
		{
			for (uint8_t i = 0; i < 3; i++)
			{
				spiTransfer(cmd[i]);
			}
			for (uint16_t i = 0; i < len; i++)
			{
				spiTransfer(buf[i]);
			}
		}
		resetCs();
	}
	return len;
}

uint16_t FLProgWiznetClass::read(uint16_t addr, uint8_t *buf, uint16_t len)
{
	uint8_t cmd[4];
	if (_chip == FLPROG_ETHERNET_W5100)
	{
		for (uint16_t i = 0; i < len; i++)
		{
			setCs();
			spiTransfer(0x0F);
			spiTransfer(addr >> 8);
			spiTransfer(addr & 0xFF);
			addr++;
			buf[i] = spiTransfer(0);
			resetCs();
		}
	}
	else if (_chip == FLPROG_ETHERNET_W5200)
	{
		setCs();
		cmd[0] = addr >> 8;
		cmd[1] = addr & 0xFF;
		cmd[2] = (len >> 8) & 0x7F;
		cmd[3] = len & 0xFF;
		for (uint8_t i = 0; i < 4; i++)
		{
			spiTransfer(cmd[i]);
		}
		for (uint16_t i = 0; i < len; i++)
		{
			buf[i] = spiTransfer(0);
		}
		resetCs();
	}
	else
	{ // _chip == FLPROG_ETHERNET_W5500
		setCs();
		if (addr < 0x100)
		{
			cmd[0] = 0;
			cmd[1] = addr & 0xFF;
			cmd[2] = 0x00;
		}
		else if (addr < 0x8000)
		{
			cmd[0] = 0;
			cmd[1] = addr & 0xFF;
			cmd[2] = ((addr >> 3) & 0xE0) | 0x08;
		}
		else if (addr < 0xC000)
		{
			cmd[0] = addr >> 8;
			cmd[1] = addr & 0xFF;
			cmd[2] = ((addr >> 6) & 0xE0) | 0x10; // 2K buffers
		}
		else
		{
			cmd[0] = addr >> 8;
			cmd[1] = addr & 0xFF;
			cmd[2] = ((addr >> 6) & 0xE0) | 0x18; // 2K buffers
		}
		for (uint8_t i = 0; i < 3; i++)
		{
			spiTransfer(cmd[i]);
		}
		for (uint16_t i = 0; i < len; i++)
		{
			buf[i] = spiTransfer(0);
		}
		resetCs();
	}
	return len;
}

void FLProgWiznetClass::execCmdSn(uint8_t s, uint8_t _cmd)
{
	writeSn(s, FLPROG_WIZNET_SN_CR, _cmd);
	while (readSn(s, FLPROG_WIZNET_SN_CR))
		;
}

/*****************************************/
/*          Socket management            */
/*****************************************/

void FLProgWiznetClass::socketPortRand(uint16_t n)
{
	n &= 0x3FFF;
	_local_port ^= n;
}

uint8_t FLProgWiznetClass::socketBegin(uint8_t protocol, uint16_t port)
{
	uint8_t s, status[FLPROG_WIZNET_MAX_SOCK_NUM], maxindex = FLPROG_WIZNET_MAX_SOCK_NUM;
	if (_chip == FLPROG_ETHERNET_NO_HARDWARE)
	{
		return FLPROG_WIZNET_MAX_SOCK_NUM; // immediate error if no hardware detected
	}
#if FLPROG_WIZNET_MAX_SOCK_NUM > 4
	if (_chip == FLPROG_ETHERNET_W5100)
		maxindex = 4; // W5100 _chip never supports more than 4 sockets
#endif
	beginTransaction();
	for (s = 0; s < maxindex; s++)
	{
		status[s] = readSn(s, FLPROG_WIZNET_SN_SR);
		if (status[s] == FLPROG_WIZNET_SN_SR_CLOSED)
		{
			privateMaceSoket(s, protocol, port);
			endTransaction();
			return s;
		}
	}
	for (s = 0; s < maxindex; s++)
	{
		if ((status[s] == FLPROG_WIZNET_SN_SR_LAST_ACK) || (status[s] == FLPROG_WIZNET_SN_SR_TIME_WAIT) || (status[s] == FLPROG_WIZNET_SN_SR_CLOSING))
		{
			execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_CLOSE);
			privateMaceSoket(s, protocol, port);
			endTransaction();
			return s;
		}
	}
	endTransaction();
	return FLPROG_WIZNET_MAX_SOCK_NUM; // all sockets are in use
}

void FLProgWiznetClass::privateMaceSoket(uint8_t soc, uint8_t protocol, uint16_t port)
{
	delayMicroseconds(250); // TODO: is this needed??
	writeSn(soc, FLPROG_WIZNET_SN_MR, protocol);
	writeSn(soc, FLPROG_WIZNET_SN_IR, 0xFF);
	if (port > 0)
	{
		writeSn16(soc, FLPROG_WIZNET_SN_PORT, port);
	}
	else
	{
		if (++_local_port < 49152)
			_local_port = 49152;
		writeSn16(soc, FLPROG_WIZNET_SN_PORT, _local_port);
	}
	execCmdSn(soc, FLPROG_WIZNET_SOCK_CMD_OPEN);
	_state[soc].RX_RSR = 0;
	_state[soc].RX_RD = readSn16(soc, FLPROG_WIZNET_SN_RX_RD); // always zero?
	_state[soc].RX_inc = 0;
	_state[soc].TX_FSR = 0;
}

uint8_t FLProgWiznetClass::socketBeginMulticast(uint8_t protocol, IPAddress ip, uint16_t port)
{
	uint8_t s, status[FLPROG_WIZNET_MAX_SOCK_NUM], maxindex = FLPROG_WIZNET_MAX_SOCK_NUM;
	if (_chip == FLPROG_ETHERNET_NO_HARDWARE)
		return FLPROG_WIZNET_MAX_SOCK_NUM;
#if FLPROG_WIZNET_MAX_SOCK_NUM > 4
	if (_chip == FLPROG_ETHERNET_W5100)
		maxindex = 4;
#endif
	beginTransaction();
	for (s = 0; s < maxindex; s++)
	{
		status[s] = readSn(s, FLPROG_WIZNET_SN_SR);
		if (status[s] == FLPROG_WIZNET_SN_SR_CLOSED)
		{
			privateMaceSoketMulticast(s, protocol, ip, port);
			endTransaction();
			return s;
		}
	}
	for (s = 0; s < maxindex; s++)
	{
		if ((status[s] == FLPROG_WIZNET_SN_SR_LAST_ACK) || (status[s] == FLPROG_WIZNET_SN_SR_TIME_WAIT) || (status[s] == FLPROG_WIZNET_SN_SR_CLOSING))
		{
			execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_CLOSE);
			privateMaceSoketMulticast(s, protocol, ip, port);
			endTransaction();
			return s;
		}
	}
	endTransaction();
	return FLPROG_WIZNET_MAX_SOCK_NUM;
}

void FLProgWiznetClass::privateMaceSoketMulticast(uint8_t soc, uint8_t protocol, IPAddress ip, uint16_t port)
{
	delayMicroseconds(250); // TODO: is this needed??
	writeSn(soc, FLPROG_WIZNET_SN_MR, protocol);
	writeSn(soc, FLPROG_WIZNET_SN_IR, 0xFF);
	if (port > 0)
	{
		writeSn16(soc, FLPROG_WIZNET_SN_PORT, port);
	}
	else
	{
		if (++_local_port < 49152)
			_local_port = 49152;
		writeSn16(soc, FLPROG_WIZNET_SN_PORT, _local_port);
	}
	byte mac[] = {0x01, 0x00, 0x5E, 0x00, 0x00, 0x00};
	mac[3] = ip[1] & 0x7F;
	mac[4] = ip[2];
	mac[5] = ip[3];
	uint8_t buf1[4];
	buf1[0] = ip[0];
	buf1[1] = ip[1];
	buf1[2] = ip[2];
	buf1[3] = ip[3];
	writeSn(soc, FLPROG_WIZNET_SN_DIPR, buf1, 4); // 239.255.0.1
	writeSn16(soc, FLPROG_WIZNET_SN_DPORT, port);
	writeSn(soc, FLPROG_WIZNET_SN_DHAR, mac, 6);
	execCmdSn(soc, FLPROG_WIZNET_SOCK_CMD_OPEN);
	_state[soc].RX_RSR = 0;
	_state[soc].RX_RD = readSn16(soc, FLPROG_WIZNET_SN_RX_RD); // always zero?
	_state[soc].RX_inc = 0;
	_state[soc].TX_FSR = 0;
}

uint8_t FLProgWiznetClass::socketStatus(uint8_t s)
{
	if (s < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		beginTransaction();
		uint8_t status = readSn(s, FLPROG_WIZNET_SN_SR);
		endTransaction();
		return status;
	}
	return 0;
}

void FLProgWiznetClass::socketClose(uint8_t s)
{
	if (s < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		beginTransaction();
		execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_CLOSE);
		endTransaction();
	}
}

uint8_t FLProgWiznetClass::socketListen(uint8_t s)
{
	if (s < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		beginTransaction();
		if (readSn(s, FLPROG_WIZNET_SN_SR) != FLPROG_WIZNET_SN_SR_INIT)
		{
			endTransaction();
			_errorCode = FLPROG_ETHERNET_SOKET_NOT_INIT_ERROR;
			return FLPROG_ERROR;
		}
		execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_LISTEN);
		endTransaction();
		_errorCode = FLPROG_NOT_ERROR;
		return FLPROG_SUCCESS;
	}
	_errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
	return FLPROG_ERROR;
}

uint8_t FLProgWiznetClass::socketConnect(uint8_t s, IPAddress ip, uint16_t port)
{
	if (s < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		uint8_t buffer[4];
		flprog::ipToArray(ip, buffer);
		beginTransaction();
		writeSn(s, FLPROG_WIZNET_SN_DIPR, buffer, 4);
		writeSn16(s, FLPROG_WIZNET_SN_DPORT, port);
		execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_CONNECT);
		endTransaction();
		return FLPROG_SUCCESS;
	}
	_errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
	return FLPROG_ERROR;
}

uint8_t FLProgWiznetClass::socketDisconnect(uint8_t s)
{
	if (s < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		beginTransaction();
		execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_DISCON);
		endTransaction();
	}

	return FLPROG_SUCCESS;
}

/*****************************************/
/*    Socket Data Receive Functions      */
/*****************************************/

uint16_t FLProgWiznetClass::getSnRX_RSR(uint8_t s)
{
	uint16_t val, prev;
	prev = readSn16(s, FLPROG_WIZNET_SN_RX_RSR);
	while (1)
	{
		val = readSn16(s, FLPROG_WIZNET_SN_RX_RSR);
		if (val == prev)
		{
			return val;
		}
		prev = val;
	}
}

void FLProgWiznetClass::read_data(uint8_t s, uint16_t src, uint8_t *dst, uint16_t len)
{
	uint16_t size;
	uint16_t src_mask;
	uint16_t src_ptr;
	src_mask = ((uint16_t)src) & SMASK;
	src_ptr = RBASE(s) + src_mask;
	if (hasOffsetAddressMapping() || src_mask + len <= SSIZE)
	{
		read(src_ptr, dst, len);
	}
	else
	{
		size = SSIZE - src_mask;
		read(src_ptr, dst, size);
		dst += size;
		read(RBASE(s), dst, len - size);
	}
}

int FLProgWiznetClass::socketRecv(uint8_t s, uint8_t *buf, int16_t len)
{
	int ret = _state[s].RX_RSR;
	beginTransaction();
	if (ret < len)
	{
		uint16_t rsr = getSnRX_RSR(s);
		ret = rsr - _state[s].RX_inc;
		_state[s].RX_RSR = ret;
	}
	if (ret == 0)
	{
		uint8_t status = readSn(s, FLPROG_WIZNET_SN_CR);
		if ((status == FLPROG_WIZNET_SN_SR_LISTEN) || (status == FLPROG_WIZNET_SN_SR_CLOSED) ||
			(status == FLPROG_WIZNET_SN_SR_CLOSE_WAIT))
		{
			ret = 0;
		}
		else
		{
			ret = -1;
		}
	}
	else
	{
		if (ret > len)
			ret = len;
		uint16_t ptr = _state[s].RX_RD;
		if (buf)
			read_data(s, ptr, buf, ret);
		ptr += ret;
		_state[s].RX_RD = ptr;
		_state[s].RX_RSR -= ret;
		uint16_t inc = _state[s].RX_inc + ret;
		if (inc >= 250 || _state[s].RX_RSR == 0)
		{
			_state[s].RX_inc = 0;
			writeSn16(s, FLPROG_WIZNET_SN_RX_RD, ptr);
			execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_RECV);
		}
		else
		{
			_state[s].RX_inc = inc;
		}
	}
	endTransaction();
	return ret;
}

uint16_t FLProgWiznetClass::socketRecvAvailable(uint8_t s)
{
	uint16_t ret = _state[s].RX_RSR;
	if (ret == 0)
	{
		beginTransaction();
		uint16_t rsr = getSnRX_RSR(s);
		endTransaction();
		ret = rsr - _state[s].RX_inc;
		_state[s].RX_RSR = ret;
	}
	return ret;
}

uint8_t FLProgWiznetClass::socketPeek(uint8_t s)
{
	if (s < FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		uint8_t b;
		beginTransaction();
		uint16_t ptr = _state[s].RX_RD;
		read((ptr & SMASK) + RBASE(s), &b, 1);
		endTransaction();
		return b;
	}
	return 0;
}

/*****************************************/
/*    Socket Data Transmit Functions     */
/*****************************************/

uint16_t FLProgWiznetClass::getSnTX_FSR(uint8_t s)
{
	uint16_t val, prev;
	prev = readSn16(s, FLPROG_WIZNET_SN_TX_FSR);
	while (1)
	{
		val = readSn16(s, FLPROG_WIZNET_SN_TX_FSR);
		if (val == prev)
		{
			_state[s].TX_FSR = val;
			return val;
		}
		prev = val;
	}
}

void FLProgWiznetClass::write_data(uint8_t s, uint16_t data_offset, const uint8_t *data, uint16_t len)
{
	uint16_t ptr = readSn16(s, FLPROG_WIZNET_SN_TX_WR);
	ptr += data_offset;
	uint16_t offset = ptr & SMASK;
	uint16_t dstAddr = offset + SBASE(s);

	if (hasOffsetAddressMapping() || offset + len <= SSIZE)
	{
		write(dstAddr, data, len);
	}
	else
	{
		uint16_t size = SSIZE - offset;
		write(dstAddr, data, size);
		write(SBASE(s), data + size, len - size);
	}
	ptr += len;
	writeSn16(s, FLPROG_WIZNET_SN_TX_WR, ptr);
}

uint16_t FLProgWiznetClass::socketSend(uint8_t s, const uint8_t *buf, uint16_t len)
{
	uint8_t status = 0;
	uint16_t ret = 0;
	uint16_t freesize = 0;
	if (len > SSIZE)
	{
		ret = SSIZE; // check size not to exceed MAX size.
	}
	else
	{
		ret = len;
	}
	do
	{
		beginTransaction();
		freesize = getSnTX_FSR(s);
		status = readSn(s, FLPROG_WIZNET_SN_SR);
		endTransaction();
		if ((status != FLPROG_WIZNET_SN_SR_ESTABLISHED) && (status != FLPROG_WIZNET_SN_SR_CLOSE_WAIT))
		{
			ret = 0;
			break;
		}
		yield();
	} while (freesize < ret);
	beginTransaction();
	write_data(s, 0, (uint8_t *)buf, ret);
	execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_SEND);
	while ((readSn(s, FLPROG_WIZNET_SN_IR) & FLPROG_WIZNET_SN_IR_SEND_OK) != FLPROG_WIZNET_SN_IR_SEND_OK)
	{
		if (readSn(s, FLPROG_WIZNET_SN_SR) == FLPROG_WIZNET_SN_SR_CLOSED)
		{
			endTransaction();
			return 0;
		}
		endTransaction();
		beginTransaction();
	}
	writeSn(s, FLPROG_WIZNET_SN_IR, FLPROG_WIZNET_SN_IR_SEND_OK);
	endTransaction();
	return ret;
}

uint16_t FLProgWiznetClass::socketSendAvailable(uint8_t s)
{
	uint8_t status = 0;
	uint16_t freesize = 0;
	beginTransaction();
	freesize = getSnTX_FSR(s);
	status = readSn(s, FLPROG_WIZNET_SN_SR);
	endTransaction();
	if ((status == FLPROG_WIZNET_SN_SR_ESTABLISHED) || (status == FLPROG_WIZNET_SN_SR_CLOSE_WAIT))
	{
		return freesize;
	}
	return 0;
}

uint16_t FLProgWiznetClass::socketBufferData(uint8_t s, uint16_t offset, const uint8_t *buf, uint16_t len)
{
	uint16_t ret = 0;
	beginTransaction();
	uint16_t txfree = getSnTX_FSR(s);
	if (len > txfree)
	{
		ret = txfree;
	}
	else
	{
		ret = len;
	}
	write_data(s, offset, buf, ret);
	endTransaction();
	return ret;
}

void FLProgWiznetClass::setMACAddress(const uint8_t *addr)
{
	write(FLPROG_WIZNET_SHAR, addr, 6);
	_status = FLPROG_READY_STATUS;
}

uint8_t FLProgWiznetClass::socketStartUDP(uint8_t s, uint8_t *addr, uint16_t port)
{
	if (s >= FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		_errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
		return FLPROG_ERROR;
	}
	if (((addr[0] == 0x00) && (addr[1] == 0x00) && (addr[2] == 0x00) && (addr[3] == 0x00)) ||
		((port == 0x00)))
	{
		_errorCode = FLPROG_ETHERNET_SOKET_UDP_NOT_CORRECT_DATA_ERROR;
		return FLPROG_ERROR;
	}
	beginTransaction();
	writeSn(s, FLPROG_WIZNET_SN_DIPR, addr, 4);
	writeSn16(s, FLPROG_WIZNET_SN_DPORT, port);
	endTransaction();
	_errorCode = FLPROG_NOT_ERROR;
	return FLPROG_SUCCESS;
}

uint8_t FLProgWiznetClass::socketSendUDP(uint8_t s)
{
	if (s >= FLPROG_WIZNET_MAX_SOCK_NUM)
	{
		_errorCode = FLPROG_ETHERNET_SOKET_INDEX_ERROR;
		return FLPROG_ERROR;
	}
	if (_status != FLPROG_WAIT_SEND_UDP_PACAGE)
	{
		beginTransaction();
		execCmdSn(s, FLPROG_WIZNET_SOCK_CMD_SEND);
		endTransaction();
		_status = FLPROG_WAIT_SEND_UDP_PACAGE;
	}

	beginTransaction();
	uint8_t result = readSn(s, FLPROG_WIZNET_SN_IR);
	if ((result & FLPROG_WIZNET_SN_IR_SEND_OK) == FLPROG_WIZNET_SN_IR_SEND_OK)
	{
		writeSn(s, FLPROG_WIZNET_SN_IR, FLPROG_WIZNET_SN_IR_SEND_OK);
		endTransaction();
		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_NOT_ERROR;
		return FLPROG_SUCCESS;
	}
	if (result & FLPROG_WIZNET_SN_IR_TIMEOUT)
	{
		writeSn(s, FLPROG_WIZNET_SN_IR, (FLPROG_WIZNET_SN_IR_SEND_OK | FLPROG_WIZNET_SN_IR_TIMEOUT));
		endTransaction();
		_status = FLPROG_READY_STATUS;
		_errorCode = FLPROG_ETHERNET_SOKET_SEND_TIMEOUT_ERROR;
		return FLPROG_ERROR;
	}
	endTransaction();
	_errorCode = FLPROG_NOT_ERROR;
	return FLPROG_WAIT;
}

uint8_t FLProgWiznetClass::getChip()
{
	beginTransaction();
	if (isW5200())
	{
		_CH_BASE_MSB = 0x40;
		for (uint8_t i = 0; i < 8; i++)
		{
			if (i < FLPROG_WIZNET_MAX_SOCK_NUM)
			{
				writeSn(i, FLPROG_WIZNET_SN_RX_SIZE, SSIZE >> 10);
				writeSn(i, FLPROG_WIZNET_SN_TX_SIZE, SSIZE >> 10);
			}
			else
			{
				writeSn(i, FLPROG_WIZNET_SN_RX_SIZE, 0);
				writeSn(i, FLPROG_WIZNET_SN_TX_SIZE, 0);
			}
		}
		endTransaction();
		return FLPROG_ETHERNET_W5200;
	}
	if (isW5500())
	{
		_CH_BASE_MSB = 0x10;
		endTransaction();
		return FLPROG_ETHERNET_W5500;
	}
	if (isW5100())
	{
		_CH_BASE_MSB = 0x04;
		endTransaction();
		return FLPROG_ETHERNET_W5100;
	}
	endTransaction();
	_chip = FLPROG_ETHERNET_NO_HARDWARE;
	_status = FLPROG_NOT_REDY_STATUS;
	_errorCode = FLPROG_ETHERNET_HARDWARE_INIT_ERROR;
	return _chip;
}

void FLProgWiznetClass::beginTransaction()
{
	RT_HW_Base.spiSetBusy(spiBus());
	RT_HW_Base.spiBeginTransaction(_device);
}

void FLProgWiznetClass::endTransaction()
{
	RT_HW_Base.spiEndTransaction(_device);
	RT_HW_Base.spiClearBusy(spiBus());
}

uint8_t FLProgWiznetClass::spiTransfer(uint8_t data)
{
	return RT_HW_Base.spiTransfer(data, spiBus());
}