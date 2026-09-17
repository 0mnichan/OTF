---
title: Reconstruct the incident
questions:
  - ref: iec104-port
    prompt: "IEC 60870-5-104 runs over TCP on which registered port?"
    kind: numeric
    value: 2404
    points: 10
    explain: >-
      TCP/2404. Seeing a new host strike up an IEC-104 session to an RTU is,
      by itself, worth an alert on most substation networks.
  - ref: rogue-master
    prompt: >-
      Two hosts send IEC-104 command APDUs to the RTU during the capture. One is
      the legitimate control centre; one is not. What is the IPv4 address of the
      rogue master?
    kind: static
    answer: 10.20.0.66
    points: 20
    hints:
      - body: >-
          Filter for I-format APDUs carrying control directions. Legitimate
          commands come from the SCADA front-end you can identify from the long
          baseline of polling. The intruder appears late and goes straight to
          commands with no polling history.
        cost: 6
    explain: >-
      The rogue master never does the patient polling a real front-end does. It
      connects, issues commands, and leaves - no baseline, no monitoring
      direction traffic, just control. That behavioural gap is more reliable
      than any address filter, because addresses can be spoofed and behaviour is
      harder to fake.
  - ref: breaker-asdu
    prompt: >-
      Which IEC-104 type identification (TypeID) carries the single command
      that opened the breaker? (decimal)
    kind: numeric
    value: 45
    points: 20
    hints:
      - body: >-
          Single command is C_SC_NA_1. Look up its TypeID number. It is the
          command with a single on/off information element aimed at the breaker's
          IOA.
        cost: 6
    explain: >-
      TypeID 45, C_SC_NA_1 - Single Command. A single bit, aimed at the
      breaker's Information Object Address, with select-before-operate frequently
      skipped. One packet, one open breaker. The 2016 Ukraine grid attack used
      exactly this class of command against exactly this class of equipment.
  - ref: ioa
    prompt: >-
      What Information Object Address (IOA) did the malicious command target?
    kind: numeric
    value: 2001
    points: 15
    explain: >-
      IOA 2001 is the controllable point for breaker CB-1. The IOA is how
      IEC-104 names a specific point in the RTU's data model - identify it and
      you know precisely what the attacker reached for.
---

A 33 kV distribution substation dropped a feeder at 02:14. The operators issued
no command. The SCADA logs show the breaker open event but no preceding control
action from the control centre application. You have the raw IEC-104 traffic from
the control-centre-to-substation link for the surrounding hour.

> This scenario is a **fictional recreation** inspired by publicly documented
> attacks on electric grids. The capture, addresses, and RTU model are entirely
> synthetic and generated for this room. Nothing here is real incident data.

## Orient yourself in IEC-104

IEC-104 is the TCP incarnation of IEC 60870-5. A few landmarks:

- **APDUs** come in three formats: **I** (information, carries data and
  commands), **S** (supervisory, acknowledgements), **U** (unnumbered, control
  of the link itself - STARTDT, STOPDT, TESTFR).
- Each information object has a **TypeID** (what kind of data or command),
  a **Cause of Transmission** (why it was sent - spontaneous, interrogation,
  activation), and an **IOA** (which point).
- Monitoring flows from RTU to master; commands flow from master to RTU.

```bash
tshark -r ~/artifacts/substation-incident.pcap -Y '104apci' \
  -T fields -e frame.time -e ip.src -e ip.dst -e 104asdu.typeid -e 104asdu.ioa
```

## The questions to answer

Who talked to the RTU that should not have? What command did they send, to which
point, and when? Build the timeline of the intrusion from connection to breaker
open. The behavioural signature - a "master" that commands without ever having
monitored - is the thread to pull.
