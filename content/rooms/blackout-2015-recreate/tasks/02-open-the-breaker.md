---
title: Open the breaker
questions:
  - ref: rtu-id
    prompt: >-
      Fingerprint the RTU on the segment. What device identification string does
      it report? (use nmap with the modbus-discover script against rtu-sub7.grid)
    kind: static
    answer: OTF Feeder RTU (IEC-104/Modbus bridge)
    case_sensitive: false
    points: 15
    hints:
      - body: "nmap -p502 --script modbus-discover rtu-sub7.grid"
        cost: 4
    explain: >-
      A bridge device speaking both IEC-104 (to the control centre) and Modbus
      (to local I/O) is common in distribution substations - and, like the 2015
      targets, it answers to anyone who can reach it.
  - ref: breaker-coil
    prompt: >-
      Which coil controls breaker CB-1? (read engineer_notes.txt; give the coil
      address as a number)
    kind: numeric
    value: 3
    points: 15
    hints:
      - body: "type engineer_notes.txt - the note maps the coil, and 1 = closed / 0 = open."
        cost: 5
    explain: >-
      Coil 3. The notes also tell you remote operate is enabled (holding register
      1 = 1) - the equivalent of the 2015 operators' remote-control being live
      and reachable from a compromised seat.
  - ref: trip
    prompt: >-
      Open breaker CB-1 on the live RTU. When the feeder de-energises, the
      simulator releases the objective flag. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 30
    hints:
      - body: "Writing a coil is FC5. Open = 0. modbus write rtu-sub7.grid coil 3 0"
        cost: 8
      - body: >-
          If the write is rejected, remote operate must be enabled first
          (holding register 1). In this scenario it already is - re-read the
          notes and check register 1.
        cost: 12
    explain: >-
      You just did, in one command, what took the 2015 attackers months of
      access to set up: opened a breaker over the network from a seat you were
      not supposed to be on. Notice what made it possible - no vulnerability, just
      reachability plus authority. Every defence in the companion room attacks one
      of those two things. Your flag is unique to your session.
---

You have the history. Now reproduce the decisive act on the simulated feeder RTU.

## Recon first

You are on the control LAN at `10.20.0.50`. Do not guess - look:

```
type engineer_notes.txt
nmap -p502 --script modbus-discover rtu-sub7.grid
```

The notes map the breaker to a coil and tell you whether remote operate is
enabled. The scan confirms the device is reachable on Modbus/502 and identifies
it.

## Then open the breaker

Breaker state lives in a single coil: **1 = closed (energised), 0 = open
(dark)**. Writing it is a standard Modbus write-single-coil (FC5):

```
modbus write rtu-sub7.grid coil 3 0
```

When the feeder de-energises, the RTU releases your objective flag. That is the
whole attack in miniature - and the point is how little it took.

> Reminder: this is a simulation built for training. Doing this to any real
> grid device is a serious crime and endangers lives. The value here is
> understanding the mechanism so you can defend against it - which is the next
> room.
