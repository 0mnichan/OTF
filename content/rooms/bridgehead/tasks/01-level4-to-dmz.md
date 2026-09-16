---
title: Level 4 → the DMZ
questions:
  - ref: pivot-principle
    prompt: >-
      Your foothold in the corporate LAN cannot reach the plant PLC directly —
      the firewall blocks it. Which host is the intended stepping stone, because
      it legitimately talks to both the enterprise and the plant?
    kind: choice
    options:
      - The domain controller
      - The process historian in the DMZ
      - The email server
      - The PLC itself
    correct: 1
    points: 20
    explain: >-
      The historian is the classic bridge. It sits in the DMZ, replicates
      process data up toward the business (that is its job), and pulls data from
      the plant below. Because it has a foot in both worlds, compromising it is
      how attackers cross a boundary that is otherwise doing its job. This is
      T0866, Exploitation of Remote Services, against the one host allowed
      through.
  - ref: historian-flag
    prompt: >-
      Enumerate from WIN-ENG01, reach the historian, and gain access. Its flag
      is in a file on the historian once you land. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 30
    hints:
      - body: >-
          From the foothold, scan the DMZ segment the workstation can reach.
          The historian exposes a data service and a management interface; the
          management interface reuses a credential you can recover on WIN-ENG01.
        cost: 10
      - body: >-
          Engineers store connection profiles. Look in the user's config/AppData
          for a saved historian login. That credential still works.
        cost: 15
    explain: >-
      The path down is almost never an exploit — it is a reused credential, a
      saved connection profile, a trust relationship left in place for
      convenience. The historian let you in because the workstation was allowed
      to, and the workstation had the keys saved. Each session's flag is unique.
---

This is the capstone. Everything the earlier rooms taught in isolation — Modbus,
logic, the Purdue model, the DMZ rule — is here at once, in one plant, and your
job is to travel the whole depth of it from a single foothold.

Meridian Chemical runs a reactor line. You are phished in: a shell on
**WIN-ENG01 (172.16.4.15)**, an ordinary engineer's domain workstation up in the
corporate LAN at **Level 4**. The reactor PLC is four network boundaries below
you and you cannot see it from here. That is by design. Your task is to defeat
the design.

## The map you are descending

```
  Level 4   corporate LAN        WIN-ENG01 (you are here)  172.16.4.0/24
  ─────────────────── IT/OT firewall ───────────────────
  Level 3.5 DMZ                  historian.dmz            172.16.8.0/24
  ─────────────────── inner firewall ───────────────────
  Level 2   plant supervisory    ews.plant                10.40.2.0/24
  Level 1   basic control        plc.plant (reactor)
```

Four flags, one per boundary you cross: the **historian** (this task), the
**engineering workstation** (task 2), the **PLC** (task 3), and a final flag for
demonstrating you can affect the process itself while keeping the operator's view
clean (task 4).

## Crossing the first boundary

You cannot route to the plant. But you can route to the DMZ, because your
workstation is allowed to — engineers pull reports from the historian all day.
The historian is the one host with a legitimate foot on both sides, which is
exactly why it is the bridge.

You will not need an exploit to get onto it. You will need what the workstation
already has: a saved connection profile, a cached credential, a trust the
environment left in place for the engineer's convenience and never took back.
Enumerate WIN-ENG01 thoroughly before you scan outward — the key to the next
door is usually already in your pocket.

```bash
# from the foothold: what can this workstation see below it?
nmap -sT -p- --min-rate 1000 172.16.8.0/24
# and what has the engineer saved?
grep -ri "historian\|password\|connection" ~/ /etc/ 2>/dev/null
```
