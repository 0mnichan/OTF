"""
Physics + flag tests for the sim-core harness. Run with:
    python3 -m pytest tests/test_physics.py    (or: python3 tests/test_physics.py)

These verify the *consequences* the rooms depend on: that normal control is
stable, that the documented attacks actually drive the process to its objective,
and that the flag encoding round-trips.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "labs", "base", "sim-core"))

from physics import TankModel, LevelControlLogic, HighHighAlarm, ConveyorInterlock, ReactorModel
from flags import ascii_to_registers, registers_to_ascii


def test_normal_control_is_stable():
    tank, logic = TankModel(), LevelControlLogic(setpoint=60)
    for _ in range(300):
        logic.update(tank)
        tank.step()
    assert 55 <= tank.level <= 65
    assert not tank.overflowed


def test_setpoint_attack_overflows_and_trips_alarm():
    tank, logic = TankModel(), LevelControlLogic(setpoint=127)
    alarm = HighHighAlarm(threshold=95)
    for _ in range(500):
        logic.update(tank)
        tank.step()
        alarm.update(tank)
        if tank.overflowed:
            break
    assert tank.overflowed
    assert alarm.latched  # a loud attack trips the alarm


def test_stealth_overflow_never_trips_alarm():
    tank, logic = TankModel(), LevelControlLogic(setpoint=127)
    alarm = HighHighAlarm(threshold=115)  # raised past the weir before flooding
    for _ in range(500):
        logic.update(tank)
        tank.step()
        alarm.update(tank)
        if tank.overflowed:
            break
    assert tank.overflowed and not alarm.latched


def test_witness_at_80_percent():
    tank, logic = TankModel(), LevelControlLogic(setpoint=127)
    crossed = False
    for _ in range(500):
        logic.update(tank)
        tank.step()
        if tank.peak_level >= 80:
            crossed = True
            break
    assert crossed


def test_conveyor_bypass_defeats_interlock():
    c = ConveyorInterlock()
    c.jam_detected = True
    c.step()
    assert not c.running               # interlock stops the line
    c.maint_bypass = True
    c.step()
    assert c.running and c.ran_through_jam  # bypass defeats it


def test_reactor_view_manipulation_gap():
    r = ReactorModel(setpoint=300, trip_point=260)
    for _ in range(60):
        r.reported = 180.0             # attacker pins the reported value
        r.step()
        if r.tripped:
            break
    assert r.tripped and r.reported == 180.0


def test_flag_register_roundtrip():
    flag = "OTF{30960336acef8f0489c024fb}"
    regs = ascii_to_registers(flag, 16)
    assert registers_to_ascii(regs) == flag


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"  ok   {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  FAIL {fn.__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
