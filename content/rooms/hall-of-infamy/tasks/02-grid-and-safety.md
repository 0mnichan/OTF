---
title: "The grid attacks and the safety-system line (2015–2017)"
questions:
  - ref: industroyer
    prompt: >-
      The 2016 Kyiv attack used purpose-built grid malware that spoke native
      SCADA protocols (IEC-101/104, IEC 61850, OPC). By what name(s) is it known?
    kind: regex
    pattern: "industroyer|crash ?override"
    case_sensitive: false
    points: 20
    explain: >-
      Industroyer (a.k.a. CrashOverride) - the first malware framework built
      specifically to manipulate electric grid protocols directly, rather than
      driving the operators' HMIs by hand as in 2015. A generational step up in
      capability.
  - ref: triton-target
    prompt: >-
      TRITON / TRISIS (2017, a Saudi petrochemical plant) is uniquely alarming
      because it targeted which kind of system?
    kind: choice
    options:
      - The billing database
      - A Safety Instrumented System (Triconex SIS)
      - The email server
      - The plant Wi-Fi
    correct: 1
    points: 25
    explain: >-
      TRITON targeted Schneider Electric Triconex Safety Instrumented Systems -
      the independent last line of defence that trips a process to a safe state.
      Compromising the SIS means an attacker can disable the protection that
      prevents an explosion or release. It is the most consequential class of OT
      attack precisely because the SIS is what stands between a bad day and a
      catastrophe.
  - ref: triton-tell
    prompt: >-
      How was TRITON discovered before it caused physical harm?
    kind: choice
    options:
      - An antivirus alert on the HMI
      - The SIS detected a fault and safely tripped the plant, prompting investigation
      - A whistleblower
      - The attackers announced it
    correct: 1
    points: 15
    explain: >-
      The safety system did its job: an inconsistency caused the SIS to fail
      safe and trip the process, which triggered the investigation that uncovered
      the malware. The safety function's integrity is both the target and, here,
      the tripwire.
  - ref: sis-principle
    prompt: >-
      What is the core design principle that makes an SIS effective, and that
      TRITON attacked?
    kind: regex
    pattern: "independen|separat|isolat"
    case_sensitive: false
    points: 15
    explain: >-
      Independence. An SIS is deliberately separate from the basic process
      control system so that losing normal control does not also lose the
      protection. Erode that independence - shared networks, shared engineering
      access, key switches left in PROGRAM - and the last line of defence becomes
      reachable.
---

Between 2015 and 2017 OT attacks matured from "misuse the operator's tools" to
"purpose-built weapons," and crossed the line that the field fears most: the
safety system.

Trace the arc. **2015 Ukraine** - hands-on-keyboard breaker operation (you
recreated it). **2016 Kyiv - Industroyer/CrashOverride** - malware that speaks
grid protocols itself. **2017 - TRITON/TRISIS** - the first known attack aimed
squarely at a **Safety Instrumented System**, the independent protection layer
that exists to prevent disasters. Understand why targeting the SIS is a category
apart, and why its *independence* is the property that both makes it work and
makes it a target.
