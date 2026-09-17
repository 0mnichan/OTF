---
title: Level 1 - the reactor, and the discipline of restraint
questions:
  - ref: plc-flag
    prompt: >-
      Using the tag map from the EWS, reach the reactor PLC (plc.plant) and read
      the controller identity flag it holds for an authenticated engineering
      session. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 25
    hints:
      - body: >-
          From the EWS you have both the route to the PLC and the knowledge of
          how it expects to be talked to. The identity flag comes back in the
          controller's device-identification response, the same one the
          programming software reads.
        cost: 8
    explain: >-
      You have reached Level 1 from a phishing email in the corporate LAN,
      crossing every boundary that the Purdue model exists to enforce. Each was
      defeated not by a novel exploit but by a trust relationship or credential
      that convenience left in place. Each session's flag is unique.
  - ref: safe-state
    prompt: >-
      You can now write the reactor temperature setpoint. A responsible operator
      of this capability on a real plant would do what?
    kind: choice
    options:
      - Drive it to the maximum immediately to prove impact
      - Nothing destructive; document the reachable impact and report it without endangering the process
      - Delete the PLC program
      - Turn off the safety system to see what happens
    correct: 1
    points: 15
    explain: >-
      On a real engagement, reaching the PLC is the finding - you do not need to
      damage the reactor to prove you could. The value is in demonstrating the
      reachable impact and reporting it so it gets fixed, not in causing harm.
      This platform lets you exercise the destructive step safely because it is
      simulated; the professional habit it is trying to build is restraint.
  - ref: process-flag
    prompt: >-
      Drive the simulated reactor temperature past its trip point WHILE keeping
      the historian and HMI showing a normal value (view manipulation). When the
      real process trips with the operator's view still clean, the simulator
      emits the final flag. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 40
    hints:
      - body: >-
          Write the setpoint (register 30) to force heating. Simultaneously pin
          the reported temperature the historian/HMI reads (a separate register
          in the tag map) near normal. The gap between real and reported is the
          objective.
        cost: 12
      - body: >-
          The trip fires on the TRUE process value from the simulator, not the
          reported one. So the process can trip while every human indicator still
          reads green - that divergence is exactly what earns the flag.
        cost: 18
    explain: >-
      The final flag requires the complete OT attack in one motion: reach the
      controller across four boundaries, affect the physical process, and blind
      the humans who would otherwise notice. That the process value and the
      reported value can be driven apart - real reactor climbing, operator's
      screen calm - is the essence of why OT intrusions are so dangerous and so
      hard to catch. You have now built the whole thing yourself, in a place
      where it costs nothing. Carry the technique. Carry the restraint further.
---

The last boundary. You are on the engineering workstation with the reactor's full
tag map in hand, and the PLC, `plc.plant`, is directly reachable and expects to be
spoken to by exactly the position you now occupy.

## Reach the controller

Reading the controller's identity is straightforward now - you have the route and
you have the tag map that tells you how the programming software authenticates and
what to ask for. The identity flag comes back in the device-identification
response, the same handshake the vendor software performs every time an engineer
connects.

Pause here and notice what you have done. You began with a phished email on a
corporate laptop at Level 4. You are now authenticated to a Level 1 reactor
controller. You crossed a firewall, a DMZ, an inner firewall, and every trust
boundary the Purdue model was drawn to protect - and not one of those crossings
required a zero-day. Each was a saved credential, a legitimate data flow, a
remote-support door left open, a convenience nobody revoked. That is what real
IT-to-OT intrusions look like.

## The final objective, and what it is really teaching

The last flag asks for the complete attack: drive the simulated reactor
temperature past its trip point while holding the historian's and HMI's reported
value near normal, so the process trips with every human indicator still reading
green. The trip fires on the simulator's *true* temperature, not the reported one
- so real and reported can be driven apart, and that divergence is the flag.

Do it, because here it is free. Then hold on to the other half of the lesson. On
a real plant, reaching this controller is the entire finding; you would document
the reachable impact and report it, and you would not touch the process, because
the process is a reactor and the people near it are real. This platform exists to
let you build the whole capability - reach, impact, concealment - in the one
place where exercising it harms no one, so that when you hold the real thing you
already know exactly what it is worth and exactly why you will not use it.

Welcome to the top of the leaderboard. You have earned the plant.
