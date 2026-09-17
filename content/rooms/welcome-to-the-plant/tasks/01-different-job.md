---
title: A different job entirely
questions:
  - ref: priority-order
    prompt: "In OT, which concern outranks all the others?"
    kind: choice
    options:
      - Confidentiality
      - Integrity
      - Availability
      - Safety
    correct: 3
    points: 10
    explain: >-
      Safety comes first because the failure mode is physical. A compromised
      database leaks records; a compromised burner management system can level a
      building. Everything else in OT security is downstream of not hurting anyone.
  - ref: patch-window
    prompt: >-
      A vendor releases a critical patch for a PLC running a continuous
      process. Why can the plant not simply apply it tonight?
    kind: choice
    options:
      - PLCs cannot be patched at all
      - Patching requires a process shutdown that may be months away, and revalidation
      - The patch would void the safety certification permanently
      - PLCs have no network connection to receive patches
    correct: 1
    points: 15
    explain: >-
      Availability windows in OT are measured in years, not hours. A refinery
      turnaround might happen every three to five years, and any change to a
      safety-related system needs revalidation before it can go live. This is
      why compensating controls - segmentation, monitoring, access control -
      carry so much more weight in OT than "just patch it" does in IT.
---

You have worked in security before. Perhaps you have popped boxes, written
detections, or argued with someone about password rotation. Almost all of that
knowledge transfers. The part that does not transfer is the part that gets people
hurt, so we are going to deal with it first.

## The consequence is physical

In enterprise IT, the worst realistic day is data loss, downtime, and a very bad
quarter. In operational technology, the systems you are defending open valves,
energise busbars, spin turbines, and dose chemicals into drinking water. When
control of those systems is lost, the consequences are measured in spills,
outages, explosions, and injuries.

That single fact reshapes every priority you carry.

## The triad, inverted

IT security is usually taught as **confidentiality, integrity, availability** -
in roughly that order. Ask an IT team what keeps them up at night and you will
hear about breaches and stolen data.

OT flips it, and adds a term at the top:

| Priority | Concern | Why it sits there |
|---|---|---|
| 1 | **Safety** | People and the environment come before the process |
| 2 | **Availability** | A stopped process can be as dangerous as a runaway one |
| 3 | **Integrity** | An operator acting on false readings makes things worse |
| 4 | **Confidentiality** | The register map is rarely the crown jewel |

Nobody dies because a tank level reading leaked. People absolutely can die
because a tank level reading *lied*.

## Things that are true in OT and not in IT

- **Uptime is measured in years.** Some controllers have run continuously since
  the 1990s. "Reboot it and see" is not a troubleshooting step.
- **Patching is a project, not a Tuesday.** A firmware update on a safety system
  may require revalidation, regulator notification, and a planned shutdown.
- **The equipment outlives the vendor.** Twenty-five year asset lifecycles are
  normal. The vendor may not exist any more. Neither may the source code.
- **Scanning can break things.** A plain `nmap -sS` sweep has knocked legacy
  controllers offline. Some devices fall over on a malformed packet, or simply
  on too many packets. Aggressive scanning is not a neutral act on a plant floor.
- **Availability beats authentication.** If an operator must log in to close a
  valve during an emergency, the login is a hazard. Many protocols have no
  authentication *by design*, and that design decision made sense in 1979 on an
  isolated serial loop.

That last point is the one to hold on to. Most of what you will exploit in this
platform is not a bug. It is a protocol working exactly as specified, on a
network that specification never anticipated.

## Safety, seriously

Every target on this platform is simulated. Nothing you do here touches real
equipment, and nothing here should ever be pointed at equipment you do not own
and have written authorisation to test. On a live plant, a misplaced packet is
not a finding - it is an incident, and possibly a fatality.

Learn the techniques here. Use them where you are authorised, and nowhere else.
