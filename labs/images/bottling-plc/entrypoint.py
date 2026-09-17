"""
Ladder Logic Autopsy - bottling line B3 controller.

Map (wire addresses):
  Coil            8  : jam sensor input (settable for maintenance testing)
  Coil            9  : MAINT_BYPASS  (the hardcoded back door)
  Coil            2  : conveyor run output
  Holding reg 50-65  : witness flag (conveyor ran through an active jam) [emitted]
"""
import sys
sys.path.insert(0, "/sim")
from physics import ConveyorInterlock
from modbus_runtime import SimRuntime

interlock = ConveyorInterlock()
JAM_COIL = 8
BYPASS_COIL = 9
RUN_COIL = 2
WITNESS_REG = 50


def tick(rt: SimRuntime):
    interlock.jam_detected = bool(rt.get_co(JAM_COIL, 1)[0])
    interlock.maint_bypass = bool(rt.get_co(BYPASS_COIL, 1)[0])
    interlock.step()
    rt.set_co(RUN_COIL, [bool(interlock.running)])


runtime = SimRuntime(
    identity_product="OTF Bottling Line Controller",
    tick=tick,
    objectives=[(lambda rt: interlock.ran_through_jam, "ladder-logic-autopsy.bypass", WITNESS_REG)],
    tick_seconds=1.0,
)
print("Bottling PLC online on :502", flush=True)
runtime.serve_forever()
