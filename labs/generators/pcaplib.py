"""
A tiny, dependency-free PCAP writer.

Enough to synthesise Ethernet/IPv4/TCP frames carrying application payloads
(Modbus, IEC-104) into a classic .pcap file. No scapy required, so the room
artifacts can be regenerated anywhere Python runs. Checksums are computed
correctly so Wireshark dissects the results cleanly.
"""
from __future__ import annotations
import struct
import time


def _checksum(data: bytes) -> int:
    if len(data) % 2:
        data += b"\x00"
    total = 0
    for i in range(0, len(data), 2):
        total += (data[i] << 8) + data[i + 1]
    total = (total >> 16) + (total & 0xFFFF)
    total += total >> 16
    return (~total) & 0xFFFF


def _mac(s: str) -> bytes:
    return bytes(int(b, 16) for b in s.split(":"))


def _ip(s: str) -> bytes:
    return bytes(int(o) for o in s.split("."))


class Host:
    def __init__(self, ip: str, mac: str, port: int):
        self.ip = ip
        self.mac = mac
        self.port = port
        self.seq = 1


class PcapWriter:
    def __init__(self, path: str):
        self.f = open(path, "wb")
        # Global header: magic, version 2.4, snaplen 65535, LINKTYPE_ETHERNET(1)
        self.f.write(struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1))
        self.t = time.time()

    def _frame(self, src: Host, dst: Host, payload: bytes, flags: int = 0x18):
        # TCP header (20 bytes, no options)
        tcp = struct.pack(
            ">HHIIBBHHH",
            src.port, dst.port, src.seq, dst.seq if flags & 0x10 else 0,
            (5 << 4), flags, 8192, 0, 0,
        )
        # TCP checksum over pseudo-header + tcp + payload
        pseudo = _ip(src.ip) + _ip(dst.ip) + struct.pack(">BBH", 0, 6, len(tcp) + len(payload))
        csum = _checksum(pseudo + tcp + payload)
        tcp = tcp[:16] + struct.pack(">H", csum) + tcp[18:]
        src.seq += len(payload)

        total_len = 20 + len(tcp) + len(payload)
        ip_hdr = struct.pack(
            ">BBHHHBBH", 0x45, 0, total_len, 0, 0x4000, 64, 6, 0,
        ) + _ip(src.ip) + _ip(dst.ip)
        ip_hdr = ip_hdr[:10] + struct.pack(">H", _checksum(ip_hdr)) + ip_hdr[12:]

        eth = _mac(dst.mac) + _mac(src.mac) + struct.pack(">H", 0x0800)
        return eth + ip_hdr + tcp + payload

    def write(self, src: Host, dst: Host, payload: bytes, dt: float = 0.05, flags: int = 0x18):
        self.t += dt
        frame = self._frame(src, dst, payload, flags)
        sec = int(self.t)
        usec = int((self.t - sec) * 1e6)
        self.f.write(struct.pack("<IIII", sec, usec, len(frame), len(frame)))
        self.f.write(frame)

    def close(self):
        self.f.close()


def modbus_read_holding(tx: int, unit: int, start: int, count: int) -> bytes:
    """MBAP + FC3 request."""
    pdu = struct.pack(">BHH", 0x03, start, count)
    return struct.pack(">HHHB", tx, 0, len(pdu) + 1, unit) + pdu


def modbus_read_response(tx: int, unit: int, values: list[int]) -> bytes:
    body = b"".join(struct.pack(">H", v & 0xFFFF) for v in values)
    pdu = struct.pack(">BB", 0x03, len(body)) + body
    return struct.pack(">HHHB", tx, 0, len(pdu) + 1, unit) + pdu


def modbus_write_single(tx: int, unit: int, addr: int, value: int) -> bytes:
    """MBAP + FC6 request."""
    pdu = struct.pack(">BHH", 0x06, addr, value & 0xFFFF)
    return struct.pack(">HHHB", tx, 0, len(pdu) + 1, unit) + pdu
