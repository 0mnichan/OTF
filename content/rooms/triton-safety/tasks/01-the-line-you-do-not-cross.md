---
title: The line you do not cross
questions:
  - ref: what-sis
    prompt: "What is the job of a Safety Instrumented System (SIS)?"
    kind: choice
    options:
      - To log operator actions for audit
      - To independently bring the process to a safe state when it leaves safe limits
      - To optimise production throughput
      - To encrypt controller traffic
    correct: 1
    points: 10
    explain: >-
      An SIS exists to trip the process to a safe state (vent, shut a fuel valve,
      shut down) when limits are exceeded, independently of the normal control
      system. It is the last automated barrier before a physical catastrophe.
  - ref: vendor
    prompt: >-
      TRITON/TRISIS targeted which specific safety controller family? (vendor or
      product)
    kind: regex
    pattern: "triconex|tristation|schneider"
    case_sensitive: false
    points: 20
    explain: >-
      Schneider Electric Triconex controllers, programmed with TriStation. TRITON
      (also called TRISIS or HatMan) delivered a payload to the safety controller
      itself, the first known malware purpose-built to attack an SIS.
  - ref: enabler
    prompt: >-
      What real-world condition let the attackers reprogram the Triconex
      controller, and is the single most important preventive lesson?
    kind: choice
    options:
      - The controller had a default password
      - The physical key switch was left in PROGRAM (remote) mode instead of RUN
      - The SIS was connected to the internet
      - The operators approved the change
    correct: 1
    points: 25
    explain: >-
      The Triconex key switch was left in PROGRAM mode, which permits logic
      changes over the network. In RUN mode the safety logic is physically write
      protected. Leaving the key in PROGRAM is what made the attack possible, and
      turning it to RUN is the cheapest, strongest control against a repeat.
  - ref: discovery
    prompt: >-
      How did the TRITON operation come to light before causing physical harm?
    kind: choice
    options:
      - An antivirus vendor found it first
      - A flaw in the attackers' code made the SIS fault and safely trip the plant, prompting investigation
      - An insider reported it
      - The plant exploded
    correct: 1
    points: 15
    explain: >-
      A mistake in the payload caused the Triconex controllers to detect an
      inconsistency and fail safe, tripping the plant. That unexpected trip
      triggered the investigation that uncovered the malware. The safety
      function's integrity was both the target and, by luck, the tripwire.
  - ref: independence
    prompt: >-
      One sentence: what property of an SIS makes it effective, and what erodes
      it? (accepts: independence, separation, isolation from the control system)
    kind: regex
    pattern: "independen|separat|isolat|air ?gap|segregat"
    case_sensitive: false
    points: 15
    placeholder: "the property"
    explain: >-
      Independence. The SIS must be separate from the basic process control
      system (separate logic, network, and engineering access) so that losing
      normal control does not also lose the protection. Shared networks, shared
      engineering workstations, and key switches left in PROGRAM all erode that
      independence, which is exactly the door TRITON walked through.
---

Every other room on this range attacks control. This one attacks the thing that
exists to save you when control fails. That is why the safety community treats
TRITON (2017) as a line that should never have been crossed.

> Fictional recreation for training. The SIS below is simulated. Interfering with
> a real safety system endangers lives and is a serious crime.

## Why the SIS is sacred

A Safety Instrumented System is deliberately independent of normal control. Its
only job is to detect that the process has left its safe envelope and force it to
a safe state, regardless of what the control system thinks. It is the last
automated barrier before fire, explosion, or release.

TRITON/TRISIS targeted Schneider Electric Triconex safety controllers,
programmed with TriStation. It is the first known malware written specifically to
reprogram an SIS. The enabling condition was mundane and entirely preventable:
the controller's physical **key switch was left in PROGRAM mode**, which allows
logic changes over the network. In RUN mode, the safety logic is physically write
protected and the attack does not work.

Hold that fact. In the next task, the key has been left in PROGRAM, and you will
feel exactly how much that one oversight gives away.
