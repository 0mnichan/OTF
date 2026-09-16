"""
Bridgehead reactor PLC (Meridian Chemical, Level 1).

Map (wire addresses):
  Input register  4  : true reactor temperature (deg C)   [PV]
  Holding reg     30 : temperature setpoint                [writable — attack]
  Holding reg     34 : reported temperature (to historian) [writable — view manip]
  Holding reg  60-75 : PLC identity flag (device-ident session)  [emitted at boot]
  Holding reg  80-95 : process-trip flag (true temp tripped while reported normal)
  Discrete input  1  : trip active
"""
import sys
sys.path.insert(0, "/sim")
from physics import ReactorModel
from modbus_runtime import SimRuntime

reactor = ReactorModel(temperature=180, setpoint=180, trip_point=260)
SETPOINT_REG = 30
REPORTED_REG = 34
TRUE_TEMP_IR = 4
IDENT_FLAG_REG = 60
TRIP_FLAG_REG = 80


def tick(rt: SimRuntime):
    reactor.setpoint = float(rt.get_hr(SETPOINT_REG, 1)[0])
    # The attacker may pin the reported value; default it to the true temp.
    reported = rt.get_hr(REPORTED_REG, 1)[0]
    reactor.step()
    rt.set_ir(TRUE_TEMP_IR, int(round(reactor.temperature)))
    if reported == 0:
        rt.set_hr(REPORTED_REG, [int(round(reactor.temperature))])
    rt.context[0].setValues(2, 1, [int(reactor.tripped)])


def _seed(rt):
    rt.set_hr(SETPOINT_REG, [180])
    rt.set_hr(REPORTED_REG, [180])


def trip_with_view_gap(rt):
    # Objective: process tripped while the REPORTED temp stayed below the alarm.
    reported = rt.get_hr(REPORTED_REG, 1)[0]
    return reactor.tripped and reported < 250


runtime = SimRuntime(
    identity_product="OTF Meridian Reactor Controller",
    tick=tick,
    objectives=[
        (lambda rt: True, "bridgehead.plc", IDENT_FLAG_REG),  # identity flag, always readable
        (trip_with_view_gap, "bridgehead.process", TRIP_FLAG_REG),
    ],
    tick_seconds=1.0,
)
_seed(runtime)
print("Meridian reactor PLC online on :502", flush=True)
runtime.serve_forever()
