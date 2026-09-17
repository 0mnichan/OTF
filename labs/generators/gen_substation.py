"""
Generate substation-incident.pcap for Silent Substation.

A long baseline of legitimate IEC-104 polling from the real control centre,
then a rogue master that connects late, skips all monitoring, and issues a
single command (C_SC_NA_1, TypeID 45) to the breaker's IOA - opening it.
"""
import sys, os, struct
sys.path.insert(0, os.path.dirname(__file__))
from pcaplib import PcapWriter, Host

OUT = sys.argv[1] if len(sys.argv) > 1 else "substation-incident.pcap"

def apci_i(ssn, rsn, asdu=b""):
    """IEC-104 I-format APDU: start 0x68, len, control fields, ASDU."""
    ctrl = struct.pack("<HH", (ssn << 1) & 0xFFFF, (rsn << 1) & 0xFFFF)
    body = ctrl + asdu
    return struct.pack("BB", 0x68, len(body)) + body

def asdu(typ, cot, ca, ioa, info=b""):
    # TypeID, VSQ(1 object), COT(2), CommonAddr(2), IOA(3), info
    return struct.pack("BBH", typ, 1, cot) + struct.pack("<H", ca) + \
           struct.pack("<I", ioa)[:3] + info

rtu = Host("10.20.0.10", "02:42:0a:14:00:0a", 2404)
master = Host("10.20.0.5", "02:42:0a:14:00:05", 47000)     # legitimate control centre
rogue = Host("10.20.0.66", "02:42:0a:14:00:42", 48001)     # the intruder

w = PcapWriter(OUT)
ssn = rsn = 0
# Baseline: the real master interrogates and receives spontaneous measurements.
for i in range(60):
    ssn += 1
    # General interrogation (C_IC_NA_1 = 100), then measured value responses.
    w.write(master, rtu, apci_i(ssn, rsn, asdu(100, 6, 1, 0, b"\x14")), dt=1.0)
    rsn += 1
    w.write(rtu, master, apci_i(rsn, ssn, asdu(13, 20, 1, 4000 + (i % 8), struct.pack("<f", 33.0 + i % 5) + b"\x00")), dt=0.05)

# The intrusion: rogue master connects late, sends NO monitoring, goes straight
# to a single command that opens breaker CB-1 at IOA 2001.
rssn = 0
w.write(rogue, rtu, apci_i(rssn, 0, asdu(45, 6, 1, 2001, b"\x01")), dt=2.0)  # C_SC_NA_1, execute, ON=open
w.write(rtu, rogue, apci_i(0, rssn, asdu(45, 7, 1, 2001, b"\x01")), dt=0.05)  # activation confirm
w.close()
print(f"wrote {OUT}")
