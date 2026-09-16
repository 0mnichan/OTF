"""
Modbus 101 target PLC.

Map (wire addresses):
  Input register  7  : live tank level (0-100), moves on its own [PV]
  Holding reg  0-15  : the block the HMI polls
  Holding reg 32-47  : the flag block, past where the HMI reads  [emitted at boot]
  Device identity    : "OTF Clearwater RTU"
"""
import sys, math
sys.path.insert(0, "/sim")
from modbus_runtime import SimRuntime

LEVEL_IR = 7
FLAG_REG = 32
_t = {"n": 0}


def tick(rt: SimRuntime):
    # A gently oscillating level so recon can spot a moving PV.
    _t["n"] += 1
    level = 50 + int(30 * math.sin(_t["n"] / 12.0))
    rt.set_ir(LEVEL_IR, level)
    # Populate the polled block with plausible-looking values.
    rt.set_hr(0, [level, 60, 1, 0, 100, 42, 7, 3, 0, 1, 0, 0, 0, 0, 0, 0])


runtime = SimRuntime(
    identity_product="OTF Clearwater RTU",
    tick=tick,
    # The flag is always present in the unread register block: the lesson is that
    # "the HMI only shows 0-15" does not mean "the device only exposes 0-15".
    objectives=[(lambda rt: True, "modbus-101.reg-flag", FLAG_REG)],
    tick_seconds=1.0,
)
print("Modbus 101 target online on :502", flush=True)
runtime.serve_forever()
