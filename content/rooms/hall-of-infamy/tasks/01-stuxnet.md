---
title: "Stuxnet (2010) — the one that started it all"
questions:
  - ref: target
    prompt: "What did Stuxnet ultimately sabotage?"
    kind: choice
    options:
      - Power turbines in a coal plant
      - Uranium enrichment centrifuges at Natanz, Iran
      - A water treatment plant
      - Oil pipeline pumps
    correct: 1
    points: 10
    explain: >-
      Stuxnet targeted Siemens S7-300 PLCs driving the gas centrifuges at the
      Natanz enrichment facility, subtly varying rotor speeds to damage them over
      time while reporting normal operation.
  - ref: plc-vendor
    prompt: >-
      Which PLC/automation platform did Stuxnet specifically reprogram? (vendor
      name)
    kind: regex
    pattern: "siemens|s7|step ?7|simatic"
    case_sensitive: false
    points: 15
    explain: >-
      Siemens SIMATIC S7 PLCs, via the STEP 7 engineering software. Stuxnet
      infected engineering workstations and injected malicious blocks during
      program download — MITRE ATT&CK for ICS T0843.
  - ref: false-view
    prompt: >-
      While sabotaging the centrifuges, what did Stuxnet show the operators and
      safety systems?
    kind: choice
    options:
      - Obvious error messages
      - Recorded "normal" readings replayed to hide the attack (a false view)
      - Nothing — the HMIs were offline
      - A ransom note
    correct: 1
    points: 20
    explain: >-
      Stuxnet recorded normal sensor values and replayed them, so operators and
      protection logic saw a healthy process while the centrifuges were being
      destroyed — a real-world Manipulation of View (T0832), the same idea behind
      the Clearwater and Bridgehead stealth objectives.
  - ref: airgap
    prompt: >-
      Natanz was air-gapped. How did Stuxnet reportedly cross the gap?
    kind: choice
    options:
      - Satellite uplink
      - Infected USB removable drives
      - A rogue Wi-Fi bridge
      - Cellular modem on the PLC
    correct: 1
    points: 15
    explain: >-
      USB drives carried it across the air gap, exploiting LNK and other Windows
      vulnerabilities to spread. "Air-gapped" is a design intent, not a guarantee
      — removable media and transient laptops routinely bridge gaps.
---

Every field has a year zero. For OT security it is **2010**, when Stuxnet showed
the world that code could reach through a network, past an air gap, into a
programmable controller, and break a physical machine — quietly.

Research it as you go; the questions reward the *mechanism*. Start with the
Natanz centrifuges, the Siemens S7 target, the STEP 7 engineering-software
infection path, and the recorded-and-replayed "everything is fine" view that
kept operators blind. Notice how many of those ideas you have already exploited
in this range's own rooms.
