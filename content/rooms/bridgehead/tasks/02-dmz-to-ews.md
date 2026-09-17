---
title: The DMZ → the engineering workstation
questions:
  - ref: why-ews
    prompt: >-
      Why is the engineering workstation (EWS) the single most valuable host to
      own on the plant network?
    kind: choice
    options:
      - It has the fastest CPU
      - It holds the PLC project files and programming software, letting you change what the PLC does using the supported workflow
      - It is the only host with internet access
      - It stores the operators' payroll data
    correct: 1
    points: 20
    explain: >-
      The EWS is where PLC programs are written and downloaded. Own it and you
      inherit the engineers' own tools and credentials - you can read the exact
      logic running in every controller and push new logic using the vendor's
      normal, authenticated, entirely-in-spec process. No protocol exploit
      required. This is T0843, Program Download, and it is how the most serious
      ICS attacks reach the controllers.
  - ref: ews-flag
    prompt: >-
      Pivot from the historian to the engineering workstation (ews.plant) and
      gain access. Recover its flag. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 30
    hints:
      - body: >-
          The historian can reach the plant supervisory segment (that is how it
          collects tags). Use it as your pivot into 10.40.2.0/24 and enumerate
          the EWS. It exposes a service left over from remote support.
        cost: 10
      - body: >-
          Remote-support software with default or weak credentials is the way in.
          The EWS was set up for a vendor to dial in and never re-locked.
        cost: 15
    explain: >-
      The historian, now yours, has a route into the plant that your original
      foothold never did - you have inherited its position. The EWS falls to a
      remote-support pathway that was opened for a vendor and never closed, the
      single most common real-world initial-access story on plant floors.
  - ref: project-file
    prompt: >-
      On the EWS you find the PLC project. Reading it, you learn the reactor's
      temperature setpoint is held in which Modbus holding register? (decimal)
    kind: numeric
    value: 30
    points: 15
    hints:
      - body: >-
          Open the project's I/O mapping / tag table. The temperature setpoint
          tag is bound to a holding register in the 30s.
        cost: 6
    explain: >-
      Register 30. Reading it from the project file rather than guessing on the
      wire is the whole advantage of owning the EWS: you get the authoritative
      tag map, comments and all, exactly as the engineers see it. Recon becomes
      trivial when you are holding the documentation.
---

You are on the historian. From here the view changes: the historian can reach
down into the plant in ways your corporate foothold never could, because
collecting process data is its entire reason to exist. You have not just
compromised a host - you have inherited its network position.

## Descending to Level 2

The plant supervisory segment (**10.40.2.0/24**) is reachable from the historian.
Pivot your tooling through it and enumerate. Your target is the **engineering
workstation**, `ews.plant`, and it is the prize of the entire room.

Why the EWS and not the PLC directly? Because the EWS is where the PLC's *program*
lives. It holds the vendor programming software, the project files with every
tag named and commented, and the credentials to download logic into the
controllers. Own the EWS and you do not fight the PLC's protocol - you use the
engineers' own supported workflow to read and rewrite what the PLC does. This is
**T0843, Program Download**, and it is the mechanism behind the most consequential
ICS intrusions on record.

The way in is, once again, not an exploit. It is a **remote-support service** -
opened so a vendor could dial in for commissioning, secured with a default or
weak credential, and never re-locked once the vendor left. Find it, and the EWS
is yours.

## The reward: the tag map

Once on the EWS, open the reactor project. You are now reading the plant's
documentation from the inside: the tag table, the I/O mapping, the comments the
engineers wrote for each other. The reactor temperature setpoint, the pressure
interlocks, the alarm thresholds - all named, all mapped to registers, all handed
to you. The final descent to the PLC, in the next task, is easy precisely because
you are holding the map.
