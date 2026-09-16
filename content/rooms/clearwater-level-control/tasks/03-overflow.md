---
title: Overflow — and the discipline not to get caught
questions:
  - ref: alarm-setpoint-reg
    prompt: >-
      The high-high alarm compares the measured level against a threshold held
      in a writable register. Which holding register address holds the
      high-high alarm setpoint? (decimal)
    kind: numeric
    value: 12
    points: 20
    hints:
      - body: >-
          It sits near the other configuration registers, holds a value around
          95, and does not change on its own. Lowering it would trip the alarm
          early; raising it delays the alarm.
        cost: 6
    explain: >-
      Register 12 is the alarm threshold. Because it is writable, an attacker can
      raise it so the alarm never fires even as the level sails past 95% — the
      alarm logic is intact, it has just been told the danger line is somewhere
      it will never reach. Sabotaging the safety threshold rather than the
      process itself is a recurring real-world pattern.
  - ref: stealth-method
    prompt: >-
      To overflow the tank while the high-high alarm never sounds, what is the
      cleanest single change to make before you raise the level past 95%?
    kind: choice
    options:
      - Delete the alarm register
      - Raise the alarm setpoint register above 110 so the level never reaches it
      - Physically unplug the klaxon
      - Set the pump coil to read-only
    correct: 1
    points: 15
    explain: >-
      Raise the alarm threshold above the overflow point (register 12 > 110) and
      the comparison the alarm logic performs is still running perfectly — it
      just never evaluates true, because you moved the goalposts past the edge of
      the field. The tank overflows in silence.
  - ref: overflow
    prompt: >-
      Drive tank T-101 to overflow (true level >= 110%). On overflow, the
      simulator releases the objective flag into holding registers 40-55 as
      ASCII. Recover and submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 30
    hints:
      - body: >-
          Setpoint high (reg 10), and if you want the stealth badge, alarm
          threshold above 110 (reg 12) first. Then wait — the outflow is slow, so
          filling from 60% to 110% takes a little time.
        cost: 8
      - body: >-
          Read holding registers 40..56 once input register 2 hits 110. Decode
          two ASCII bytes per register, big-endian. That printable run is the flag.
        cost: 12
    explain: >-
      This flag exists only because you made a simulated tank physically
      overflow. There was no string to find — you had to cause a process state.
      If you also kept the high-high alarm from firing (register 12 raised
      before the level crossed 95%), you earned the stealth objective: you
      caused the incident and the operator never got a warning. That combination
      — cause the harm, defeat the safety, suppress the indication — is the OT
      attack in miniature.
---

Everything comes together here. You can move the level; now move it all the way,
and decide whether you do it loudly or quietly.

## The base objective: overflow

Raise the setpoint, drive the pump, and hold on. The outflow is slow and
roughly constant, so once inflow dominates the level rises steadily. When the
true measured level reaches **110%**, tank T-101 overflows the weir and the
simulator releases the objective flag into holding registers 40–47 as ASCII.

```bash
python3 - <<'PY'
from pymodbus.client import ModbusTcpClient
import time, struct
c = ModbusTcpClient('10.13.37.20', port=502); c.connect()
c.write_register(address=10, value=127)          # setpoint above the tank
while True:
    lvl = c.read_input_registers(address=2, count=1).registers[0]
    print('level', lvl)
    if lvl >= 110:
        regs = c.read_holding_registers(address=40, count=16).registers
        flag = b''.join(struct.pack('>H', r) for r in regs)
        print('FLAG:', flag)
        break
    time.sleep(2)
c.close()
PY
```

That earns the room. But there is a better way to earn it.

## The stealth objective: overflow in silence

At 95% the high-high alarm fires, the operator is alerted, and in a real
engagement your access is now a known incident. The alarm compares the measured
level against a threshold in **holding register 12**. That register is writable.

Raise it above the overflow point *before* the level crosses 95% and the alarm
logic keeps running flawlessly — it simply never evaluates true, because you have
moved the danger line past the top of the tank. Add the view-manipulation trick
from the previous task and the operator's screen stays green throughout.

Cause the harm, defeat the safety, suppress the indication. Do all three and the
tank floods while every human indicator says the plant is fine. Pull that off and
the platform records the stealth objective and the *No Hints Needed* badge if you
managed it clean.

## Put it back

When you disconnect, the lab is torn down and the next player gets a fresh,
correctly-configured plant. Nothing you did here persists, and nothing here ever
touched anything real. That is the point of a range: consequence-free
consequences.
