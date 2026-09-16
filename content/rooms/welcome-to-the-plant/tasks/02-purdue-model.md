---
title: The Purdue model
questions:
  - ref: plc-level
    prompt: "At which Purdue level does a PLC live?"
    kind: numeric
    value: 1
    points: 10
    placeholder: "0-5"
    explain: >-
      Level 1 is basic control: PLCs, RTUs and IEDs — the devices that read
      sensors and drive actuators on a scan cycle.
  - ref: historian-level
    prompt: "A process historian collecting plant-wide tag data sits at which level?"
    kind: numeric
    value: 3
    points: 10
    explain: >-
      Level 3 is site operations: historians, MES, batch management. It is the
      highest level still considered part of the OT network proper.
  - ref: dmz-name
    prompt: >-
      What is the conventional name for the buffer zone between Level 3 and
      Level 4, sometimes numbered Level 3.5? (three letters)
    kind: regex
    pattern: "^(i?dmz)$"
    points: 15
    placeholder: "e.g. XYZ"
    explain: >-
      The Industrial DMZ (IDMZ, or just DMZ). No traffic should traverse it
      directly — a client in the enterprise talks to a broker or replica in the
      DMZ, and a separate connection carries data onward. Nothing from Level 4
      should ever open a socket straight to Level 2.
  - ref: sis-purpose
    prompt: "What is a Safety Instrumented System (SIS) for?"
    kind: choice
    options:
      - Logging operator actions for audit
      - Independently bringing the process to a safe state when limits are exceeded
      - Encrypting traffic between the PLC and the HMI
      - Backing up PLC programs automatically
    correct: 1
    points: 15
    explain: >-
      An SIS is deliberately independent of the basic process control system, so
      that a failure — or a compromise — of normal control does not also disable
      the last line of defence. TRITON/TRISIS in 2017 was significant precisely
      because it targeted that last line.
---

Ask an OT engineer to draw their network and you will almost always get some
version of the same diagram. It is called the **Purdue Enterprise Reference
Architecture**, it dates from the early 1990s, and it is the shared vocabulary
of the entire field.

## The levels

```
  Level 5   Enterprise network            ERP, corporate IT, internet
  Level 4   Site business planning        Site IT, email, scheduling
  ─────────────────────────────────────────────────────────────────
  Level 3.5 Industrial DMZ (IDMZ)         Replicated historian, jump hosts,
                                          patch servers, remote-access broker
  ─────────────────────────────────────────────────────────────────
  Level 3   Site operations               Historian, MES, batch management
  Level 2   Area supervisory control      HMI, SCADA servers, alarm servers,
                                          engineering workstation (EWS)
  Level 1   Basic control                 PLC, RTU, IED, DCS controller
  Level 0   Process                       Sensors, actuators, valves, motors,
                                          transmitters, drives
```

Read it as a gradient of *time and consequence*. At Level 0 things happen in
milliseconds and a mistake is physical. At Level 5 things happen in business
quarters and a mistake is financial. The further down you go, the less tolerance
there is for latency, authentication prompts, and unexpected packets.

## Why the DMZ is the whole ballgame

The single most important line on that diagram is the one between Level 3 and
Level 4. It is where the IT network ends and the OT network begins.

The rule is that **no connection should cross it directly**. If the business
wants production figures, the historian at Level 3 replicates to a mirror in the
DMZ, and the business intelligence tool reads the mirror. Two separate
connections, neither of which spans the boundary.

In practice this rule is broken constantly:

- A vendor needs remote support, so a cellular modem appears on a Level 1 device
  and quietly bypasses every control above it.
- An engineer needs a file, so a laptop moves between the corporate domain and
  the plant floor.
- A historian is "temporarily" dual-homed to save a firewall change request, and
  is still dual-homed nine years later.
- A cloud analytics product needs data, so a Level 2 device is given a route out.

Nearly every published IT-to-OT intrusion turns out to hinge on one of these.
The *Bridgehead* room later in this platform is built entirely around that
observation.

## Safety sits outside the model

One box does not appear on the diagram above, and its absence is deliberate.

A **Safety Instrumented System** is a separate controller with separate sensors,
separate logic, and often a separate vendor. Its only job is to detect that the
process has left its safe envelope and to force it to a safe state — vent the
pressure, trip the breaker, close the fuel valve — regardless of what the normal
control system thinks.

It is independent so that losing the process control system does not also lose
the protection. Which is exactly why an attacker who understands the plant will
go looking for it: disabling the SIS does nothing visible on its own, but it
removes the floor beneath every subsequent action.
