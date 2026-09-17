---
title: "Ransomware, water, and the details practitioners know"
questions:
  - ref: colonial
    prompt: >-
      In the 2021 Colonial Pipeline incident, why did the company halt pipeline
      operations even though the ransomware hit IT, not the OT controllers?
    kind: choice
    options:
      - The ransomware spread to the pipeline PLCs
      - Business/billing systems were down and they could not reliably meter and bill, plus uncertainty about IT/OT boundaries, so they shut down out of caution
      - Regulators forced an immediate shutdown
      - The pipeline physically failed
    correct: 1
    points: 20
    explain: >-
      The DarkSide ransomware hit IT. Colonial halted the pipeline largely
      because billing/metering systems were down and out of caution about the
      IT/OT boundary. It is a landmark case in how IT incidents cause OT
      *availability* impact even without touching controllers - and why knowing
      your IT/OT dependencies matters.
  - ref: oldsmar
    prompt: >-
      In the 2021 Oldsmar, Florida water incident, what did the intruder attempt
      to change via remote-access software?
    kind: choice
    options:
      - The pump pressure
      - The sodium hydroxide (lye) dosing setpoint, raising it ~100x
      - The chlorine tank level alarm
      - The billing rate
    correct: 1
    points: 20
    explain: >-
      An intruder using shared remote-access software (TeamViewer) briefly raised
      the sodium hydroxide setpoint from ~100 ppm to ~11,100 ppm. An operator saw
      the cursor move and reverted it; downstream alarms/checks were also a
      backstop. It is the real-world twin of your Clearwater setpoint attack -
      change one writable number, cause physical harm - and a lesson in shared
      remote-access risk.
  - ref: oldsmar-defense
    prompt: >-
      Which control most directly addresses the Oldsmar-style "shared remote
      access + writable setpoint" risk?
    kind: choice
    options:
      - Painting the tanks a different colour
      - Unique per-user MFA remote access, least privilege, and out-of-band limit checks/alarms on critical setpoints
      - Turning off all alarms
      - Giving every operator admin rights
    correct: 1
    points: 15
    explain: >-
      Shared credentials on remote-access tools are the recurring villain. Unique
      accounts with MFA, least privilege, and independent high/low limit checking
      on safety-critical setpoints (so a bad value is caught by logic the attacker
      did not also change) is the defensive package.
  - ref: purdue-niche
    prompt: >-
      Across Stuxnet, Ukraine, TRITON and Oldsmar, one host type recurs as the
      pivot to the controllers. Which? (the machine with the programming software)
    kind: regex
    pattern: "engineering ?work ?station|ews|engineering station"
    case_sensitive: false
    points: 20
    explain: >-
      The engineering workstation. It holds the vendor programming software,
      project files and download rights. Stuxnet infected STEP 7 EWSs; TRITON
      needed engineering access to the SIS; grid attacks leaned on operator/EWS
      seats. Harden the EWS - dedicated, offline, MFA, key-switch discipline - and
      you raise the cost of nearly every serious OT attack.
  - ref: synthesis
    prompt: >-
      One sentence, your words: state the single most repeated root enabler
      across these incidents. (accepts: remote access, stolen/shared credentials,
      flat networks, IT/OT reachability)
    kind: regex
    pattern: "remote access|credential|password|flat network|segmentation|reachab|it/ot|it to ot"
    case_sensitive: false
    points: 10
    placeholder: "the recurring root enabler"
    explain: >-
      Reachability plus authority: remote access into insufficiently segmented OT,
      using stolen or shared credentials. Bespoke malware makes headlines, but the
      door is almost always legitimate access that should not have been reachable
      or should have required more than a password. That is the thesis of this
      whole platform.
---

The classics are the S7/grid/SIS attacks. The part practitioners actually trade
notes on is subtler: how **IT incidents cause OT outages**, how **one writable
number** nearly poisoned a town, and the one host that keeps being the pivot.

Research **Colonial Pipeline (2021)** - an IT ransomware event that still stopped
a pipeline, because of IT/OT *dependencies*, not controller compromise. Then
**Oldsmar (2021)** - the real-world echo of your Clearwater room: shared remote
access, one setpoint, nearly a mass poisoning, caught by an alert operator and
backstop checks. Then step back and name the thread running through all of them.
You already know it - you have been exploiting and defending it this whole time.
