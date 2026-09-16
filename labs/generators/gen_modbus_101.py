"""Generate plant-poll.pcap for Modbus 101: a steady HMI poll with one write."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from pcaplib import PcapWriter, Host, modbus_read_holding, modbus_read_response, modbus_write_single

OUT = sys.argv[1] if len(sys.argv) > 1 else "plant-poll.pcap"

hmi = Host("10.13.37.5", "02:42:0a:0d:25:05", 51000)
plc = Host("10.13.37.10", "02:42:0a:0d:25:0a", 502)

w = PcapWriter(OUT)
tx = 0
# The normal poll: read holding registers 0..15, FC3, every cycle.
for cycle in range(40):
    tx += 1
    w.write(hmi, plc, modbus_read_holding(tx, 1, 0, 16), dt=0.5)
    vals = [50 + (cycle % 20), 60, 1, 0, 100, 42, 7, 3, 0, 1, 0, 0, 0, 0, 0, 0]
    w.write(plc, hmi, modbus_read_response(tx, 1, vals), dt=0.02)
    # Slip the anomalous write into the middle of the steady stream.
    if cycle == 22:
        tx += 1
        w.write(hmi, plc, modbus_write_single(tx, 1, 10, 85), dt=0.3)   # FC6 write reg 10
        w.write(plc, hmi, modbus_write_single(tx, 1, 10, 85), dt=0.02)  # echo response
w.close()
print(f"wrote {OUT}")
