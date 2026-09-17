---
title: Know the plant before you touch it
questions:
  - ref: plc-ip
    prompt: "What is the IPv4 address of the level-control PLC on the segment?"
    kind: static
    answer: 10.13.37.20
    points: 10
    hints:
      - body: "Sweep TCP/502 across the /24: nmap -p502 --open 10.13.37.0/24"
        cost: 3
    explain: >-
      A ping sweep plus a 502 scan finds Modbus endpoints fast. On a real plant,
      even this much traffic can matter - but reconnaissance you can see is
      reconnaissance you can control.
  - ref: setpoint-reg
    prompt: >-
      The operator's target level is stored in a writable holding register.
      Which register address holds the level setpoint? (decimal, wire address)
    kind: numeric
    value: 10
    points: 20
    hints:
      - body: >-
          Watch the HMI: the setpoint is the number the operator can change, and
          it does not move on its own. Correlate the HMI's displayed setpoint
          with a register value by nudging nothing and just reading.
        cost: 6
    explain: >-
      Register 10 holds the setpoint in percent. It is writable because the
      operator legitimately adjusts it - which is exactly why it is a target.
  - ref: level-reg
    prompt: >-
      Which input register carries the live measured tank level from the
      level transmitter? (decimal, wire address)
    kind: numeric
    value: 2
    points: 15
    explain: >-
      Input register 2 is the process variable - the actual measured level,
      read-only, updated every scan from the simulated transmitter. Distinguish
      it from the setpoint (what we want) and never confuse the two.
  - ref: pump-coil
    prompt: >-
      Which coil directly commands the inlet pump to run? (decimal address)
    kind: numeric
    value: 1
    points: 15
    hints:
      - body: >-
          Read the coils (FC 1) and watch which one toggles as the level crosses
          the setpoint. That is the control loop actuating the pump.
        cost: 5
    explain: >-
      Coil 1 is the pump run command. Under normal control the PLC toggles it to
      hold the level near setpoint. Whoever can write that coil owns the pump -
      but writing the coil directly fights the control loop, which will keep
      trying to correct. There is a subtler way, which the next task is about.
---

Clearwater is a real control loop, not a quiz. A soft-PLC runs actual ladder
logic; a physics simulator integrates the tank level from inflow and outflow; an
HMI repaints the operator's screen from the PLC every second. When you make the
tank overflow, it is because you drove a simulated process past its physical
limit - not because you found the right string.

Spawn the lab. You get a terminal on the control LAN and a live HMI you can open
in a second panel and watch as you work.

## The process

```
        inlet pump                         overflow weir (110%)
            │                                      ▼
            ▼                              ┌─────────────────┐  ← high-high alarm (95%)
      ══════════╗                          │                 │  ← setpoint (60%)
   raw water    ║      ┌───────────────────┤   clarifier     │
   ─────────────╨─────▶│      T-101        │     T-101       │
                       │  level transmitter├─────────────────┤
                       └─────────┬─────────┘  ← low cutout (10%)
                                 │ outflow (gravity, ~constant)
                                 ▼
                         to filtration
```

Raw water is pumped in at the top; treated water leaves by gravity at a roughly
constant rate at the bottom. The PLC runs the inlet pump to hold the level near
the **setpoint** (60%). If the level ever reaches the **high-high alarm** at 95%,
the operator gets a klaxon and the incident gets investigated. At **110%** the
tank overflows the weir - and that is your objective.

The interesting gap is between 95% and 110%: fifteen percent of tank you can fill
*after* the alarm would fire. Getting to overflow without ever crossing 95% means
the alarm never sounds and the operator never looks. That is the difference
between this room's base objective and its stealth bonus.

## Do the recon first

Map the points before you touch anything:

```bash
nmap -p502 --open 10.13.37.0/24
python3 - <<'PY'
from pymodbus.client import ModbusTcpClient
c = ModbusTcpClient('10.13.37.20', port=502); c.connect()
print('holding 0..15 :', c.read_holding_registers(address=0, count=16).registers)
print('input   0..7  :', c.read_input_registers(address=0, count=8).registers)
print('coils   0..7  :', c.read_coils(address=0, count=8).bits)
c.close()
PY
```

Identify four things and you hold the room: the **measured level** (input
register), the **setpoint** (holding register), the **pump command** (coil), and
the **high-high alarm setpoint** (holding register - you will need it in task 3).
Open the HMI alongside and correlate what you read on the wire with what the
operator sees on the screen.
