"""Generate the held-out grading captures for Silent Substation."""
import sys, os, struct
sys.path.insert(0, os.path.dirname(__file__))
from pcaplib import PcapWriter, Host

def apci_i(ssn, rsn, asdu=b""):
    ctrl = struct.pack("<HH", (ssn << 1) & 0xFFFF, (rsn << 1) & 0xFFFF)
    return struct.pack("BB", 0x68, len(ctrl+asdu)) + ctrl + asdu

def asdu(typ, cot, ca, ioa, info=b""):
    return struct.pack("BBH", typ, 1, cot) + struct.pack("<H", ca) + struct.pack("<I", ioa)[:3] + info

outdir = sys.argv[1] if len(sys.argv) > 1 else "captures"
os.makedirs(outdir, exist_ok=True)
rtu = Host("10.20.0.10", "02:42:0a:14:00:0a", 2404)
legit = Host("10.20.0.5", "02:42:0a:14:00:05", 47000)

def benign(path, cmds=True):
    w = PcapWriter(path); s=0; r=0
    for i in range(30):
        s+=1; w.write(legit, rtu, apci_i(s, r, asdu(100, 6, 1, 0, b"\x14")), dt=1.0)
        r+=1; w.write(rtu, legit, apci_i(r, s, asdu(13, 20, 1, 4000+i%8, struct.pack("<f",33.0)+b"\x00")), dt=0.05)
    if cmds:  # the legit master DOES issue commands too - this is the FP trap
        s+=1; w.write(legit, rtu, apci_i(s, r, asdu(45, 6, 1, 2001, b"\x00")), dt=0.5)  # legit close
    w.close()

def attack(path, rogue_ip):
    w = PcapWriter(path); s=0; r=0
    for i in range(20):
        s+=1; w.write(legit, rtu, apci_i(s, r, asdu(100, 6, 1, 0, b"\x14")), dt=1.0)
        r+=1; w.write(rtu, legit, apci_i(r, s, asdu(13, 20, 1, 4000+i%8, struct.pack("<f",33.0)+b"\x00")), dt=0.05)
    rogue = Host(rogue_ip, "02:42:0a:14:00:99", 48000)
    w.write(rogue, rtu, apci_i(0, 0, asdu(45, 6, 1, 2001, b"\x01")), dt=2.0)  # rogue open breaker
    w.close()

benign(f"{outdir}/benign-1.pcap", cmds=False)
benign(f"{outdir}/benign-2.pcap", cmds=True)   # includes a legit command
benign(f"{outdir}/benign-3.pcap", cmds=True)
attack(f"{outdir}/attack-1.pcap", "10.20.0.66")
attack(f"{outdir}/attack-2.pcap", "10.20.0.77")
attack(f"{outdir}/attack-3.pcap", "172.16.9.4")
print(f"wrote 6 captures to {outdir}")
