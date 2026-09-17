"""
Clearwater clarifier level-control PLC.

Register / coil map (wire addresses, 0-based) - mirrors content/rooms/clearwater:
  Input register  2  : measured tank level (%)          [read-only PV]
  Holding reg     10 : level setpoint (%)                [writable - the attack]
  Holding reg     12 : high-high alarm threshold (%)     [writable - safety defeat]
  Holding reg     20 : witness flag (level crossed 80%)  [emitted]
  Holding reg  40-55 : overflow objective flag           [emitted on overflow]
  Coil            1  : pump run command                  [PLC-driven]
  Discrete input  0  : high-high alarm active
"""
import sys
sys.path.insert(0, "/sim")

from physics import TankModel, LevelControlLogic, HighHighAlarm
from modbus_runtime import SimRuntime

tank = TankModel(level=60.0)
logic = LevelControlLogic(setpoint=60.0, deadband=2.0)
alarm = HighHighAlarm(threshold=95.0)

WITNESS_REG = 20
OVERFLOW_FLAG_REG = 40
SETPOINT_REG = 10
ALARM_THRESH_REG = 12
LEVEL_IR = 2
PUMP_COIL = 1


def tick(rt: SimRuntime):
    # Read operator/attacker-writable control values out of the store.
    setpoint = rt.get_hr(SETPOINT_REG, 1)[0]
    threshold = rt.get_hr(ALARM_THRESH_REG, 1)[0]
    logic.setpoint = float(setpoint)
    alarm.threshold = float(threshold)

    # Advance control + physics.
    logic.update(tank)
    tank.step()
    alarm_active = alarm.update(tank)

    # Publish process state back to the store.
    rt.set_ir(LEVEL_IR, int(round(tank.level)))
    rt.set_co(PUMP_COIL, [bool(tank.pump_on)])
    rt.context[0].setValues(2, 0, [int(alarm_active)])  # discrete input 0


def _seed(rt: SimRuntime):
    rt.set_hr(SETPOINT_REG, [60])
    rt.set_hr(ALARM_THRESH_REG, [95])


runtime = SimRuntime(
    identity_product="OTF Clearwater RTU",
    tick=tick,
    objectives=[
        (lambda rt: tank.peak_level >= 80.0, "clearwater-level-control.pump-forced", WITNESS_REG),
        (lambda rt: tank.overflowed, "clearwater-level-control.overflow", OVERFLOW_FLAG_REG),
    ],
    tick_seconds=1.0,
)
_seed(runtime)
print("Clearwater PLC online on :502", flush=True)
runtime.serve_forever()
