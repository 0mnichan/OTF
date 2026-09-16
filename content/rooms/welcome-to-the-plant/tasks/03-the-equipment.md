---
title: The equipment you will meet
questions:
  - ref: scan-cycle
    prompt: >-
      A PLC repeats a fixed loop: read inputs, execute logic, write outputs.
      What is this loop called? (two words)
    kind: static
    answer: scan cycle
    points: 10
    hints:
      - body: "The second word is 'cycle'. The first describes reading everything in turn."
        cost: 3
    explain: >-
      The scan cycle, typically 1-100 ms. Understanding it matters offensively:
      inputs are latched into an I/O image at the top of the scan, so writing to
      that image is functionally identical to lying to the controller about the
      physical world.
  - ref: ews-risk
    prompt: >-
      Which single machine, if compromised, most directly lets an attacker
      change what a PLC actually does?
    kind: choice
    options:
      - The process historian
      - The engineering workstation
      - The alarm printer
      - The domain controller
    correct: 1
    points: 15
    explain: >-
      The engineering workstation holds the project files, the vendor
      programming software, and the credentials to download logic. Owning the
      EWS means you do not need a protocol exploit — you use the same supported
      workflow the engineers use. This is MITRE ATT&CK for ICS T0843,
      Program Download.
  - ref: rtu-vs-plc
    prompt: >-
      What best distinguishes an RTU from a PLC in traditional usage?
    kind: choice
    options:
      - An RTU cannot execute any logic
      - An RTU is built for remote, often unmanned sites with wide-area comms
      - An RTU is always wireless
      - An RTU has no digital inputs
    correct: 1
    points: 10
    explain: >-
      RTUs grew up in utilities and pipelines — remote sites, intermittent links,
      wide temperature ranges, often solar powered. Modern devices blur the line
      considerably, and many products are honestly both.
---

A quick tour of the hardware. You do not need to be an engineer, but you do need
to know what you are looking at when a scan comes back.

## Level 1 — the things that decide

**PLC — Programmable Logic Controller.** The workhorse. A ruggedised computer
that runs one program, forever, in a loop:

1. **Read inputs** — sample every sensor into an internal table called the *I/O
   image*.
2. **Execute logic** — run the program top to bottom against that table.
3. **Write outputs** — push the results out to the actuators.

That loop is the **scan cycle**, typically between 1 and 100 milliseconds. It
matters to you because the logic never talks to the physical world directly — it
talks to the I/O image. Anything that can write to the I/O image can make the
controller believe whatever it likes about reality. MITRE tracks this as
**T0835, Manipulate I/O Image**.

**RTU — Remote Terminal Unit.** A PLC's cousin, built for unmanned remote sites:
pipeline valve stations, reservoirs, substations. Designed around intermittent
wide-area links and hostile weather.

**IED — Intelligent Electronic Device.** Utility terminology, mostly electrical.
Protection relays, meters, breaker controllers. An IED can decide on its own to
open a breaker in milliseconds when it sees a fault.

**DCS — Distributed Control System.** An integrated vendor ecosystem for
continuous process industries — refineries, chemicals, paper. Where a PLC is a
component you buy, a DCS is an architecture you commit to.

## Level 2 — the things that watch

**HMI — Human Machine Interface.** The screen the operator watches: tank levels,
pump states, alarms, trends. Critically, the HMI shows what it is *told*. It has
no independent knowledge of the plant. Feed it false values and the operator's
picture of reality is false too — **T0832, Manipulation of View**.

**SCADA server.** Polls controllers, aggregates tags, drives the HMI screens,
raises alarms, archives to the historian.

**EWS — Engineering Workstation.** The most dangerous machine on the plant floor.
It holds the vendor programming software, the project files, and the ability to
download new logic into controllers. Compromise the EWS and you do not need a
protocol vulnerability at all — you use the supported workflow. Stuxnet's path
to the centrifuges ran through engineering software.

## Level 3 — the things that remember

**Historian.** A time-series database of every tag, sampled continuously,
retained for years. Two reasons to care: it is the richest reconnaissance target
on the network — a complete map of every point in the plant, its name, its units
and its normal range — and it is frequently the one Level 3 box with a legitimate
reason to talk to the enterprise, which makes it the natural bridge.

## Level 0 — the things that act

Sensors and actuators. Level transmitters, pressure transmitters, thermocouples,
flow meters, motorised valves, variable frequency drives, contactors.

Mostly analogue or fieldbus, mostly not directly network-attackable — but they
are the reason all of the above exists, and the place where every consequence
finally lands.
