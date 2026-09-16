---
title: Take the loop
questions:
  - ref: control-strategy
    prompt: >-
      Directly forcing the pump coil ON fights the PLC, which keeps switching it
      off to hold setpoint. What is the more reliable way to make the PLC itself
      run the pump hard and fill the tank?
    kind: choice
    options:
      - Write a very high value to the level setpoint register
      - Flood the PLC with read requests until it stops controlling
      - Overwrite the measured-level input register with zero
      - Disconnect the HMI
    correct: 0
    points: 20
    explain: >-
      Raise the setpoint and the control logic does the work for you: it sees the
      level as 'too low' relative to the new target and drives the pump to catch
      up. You are not fighting the loop, you are commandeering it. This is
      T0836, Modify Parameter — subtler and more robust than brute-forcing an
      actuator, because the plant's own logic now serves your goal.
  - ref: view-manipulation
    prompt: >-
      To keep the operator calm while the tank fills, you also want the HMI to
      keep showing a normal level. Manipulating what the operator sees while the
      real process diverges is which MITRE ATT&CK for ICS technique? (Txxxx)
    kind: regex
    pattern: "^T0832$"
    case_sensitive: false
    points: 15
    explain: >-
      T0832, Manipulation of View. If the HMI reads the measured level from a
      register you can write, you can pin the displayed value near setpoint while
      the true level climbs. The operator's screen says 60%; the tank says 105%.
      This is the mechanism behind the classic 'the operators had no idea'
      incident narrative.
  - ref: pump-forced
    prompt: >-
      Drive the level above 80%. When the true measured level first exceeds 80%,
      the PLC latches a witness value into holding register 20. Read and submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 25
    hints:
      - body: >-
          Raise the setpoint register (address 10) well above 60. Watch input
          register 2 climb. When it passes 80, register 20 is populated.
        cost: 8
    explain: >-
      The witness flag is emitted by the PLC logic only when the physical level
      genuinely crosses 80% — you cannot read it early or guess it. It proves you
      moved the process, not just the number. Each session's witness is unique.
---

Recon done, you know the four points that matter. Now take control of the loop.

## Fighting the loop vs. commandeering it

The naive move is to write coil 1 (pump ON) and force the pump. It half-works and
then frustrates you: the PLC is still running its control logic every scan, sees
the level climbing above setpoint, and switches the pump back off. You are in a
tug of war with a device that never gets tired.

The elegant move is to stop fighting and start lying to the logic about what it
wants. **Raise the setpoint.** Write a large value to holding register 10 and the
PLC's own control logic concludes the tank is far below target and drives the
pump hard to "recover". The plant floods itself, using its own program, on your
behalf. In ATT&CK terms this is **T0836, Modify Parameter** — and it is the
canonical example of why setpoints are such high-value writable registers.

```bash
python3 - <<'PY'
from pymodbus.client import ModbusTcpClient
c = ModbusTcpClient('10.13.37.20', port=502); c.connect()
c.write_register(address=10, value=120)   # setpoint well above the tank
print('setpoint now', c.read_holding_registers(address=10, count=1).registers)
c.close()
PY
```

Then watch input register 2 climb, and keep the HMI panel open. Somewhere past
80% the PLC latches a witness value into holding register 20 — that is this
task's flag, and it only appears because the real level really crossed the line.

## Keeping the operator calm (optional but instructive)

If the HMI reads the displayed level from a register you can also write, you can
hold the displayed number near 60% while the true level climbs — **T0832,
Manipulation of View**. It is not required to get the witness flag, but doing it
is the difference between a noisy attack and a quiet one, and it sets up the
stealth objective in the final task. Work out which register the HMI trusts, and
whether you can get between it and the truth.
