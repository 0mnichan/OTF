---
title: Survive it and defend against it
questions:
  - ref: spread-control
    prompt: >-
      Shamoon spread across Windows networks using stolen admin credentials and
      open file shares. Which control most directly limits that lateral movement?
    kind: choice
    options:
      - A louder antivirus
      - Network segmentation plus least-privilege admin (no shared/domain-wide local admin, restricted SMB)
      - Faster internet
      - Longer screensaver timeouts
    correct: 1
    points: 20
    explain: >-
      Wipers live or die on lateral movement. Segmentation, unique per-host local
      admin credentials (or LAPS-style management), and restricting SMB/admin
      shares stop one compromised account from reaching every machine. Same
      reachability-plus-authority lesson as the grid attacks.
  - ref: recovery-control
    prompt: >-
      What single capability most determines how fast you recover from a wiper
      that destroys endpoints and their boot records?
    kind: choice
    options:
      - The price of new laptops
      - Tested, offline (or immutable) backups and a rehearsed rebuild/imaging process
      - A bigger help desk
      - Social media monitoring
    correct: 1
    points: 20
    explain: >-
      Backups you have actually restored from, kept offline or immutable so the
      wiper cannot reach them, plus a rehearsed re-imaging pipeline, turn "weeks
      of chaos" into "a bad day." Untested backups are a hope, not a control.
  - ref: ot-isolation
    prompt: >-
      Aramco kept oil production running on systems isolated from the wiped IT
      network. What OT principle does that illustrate?
    kind: choice
    options:
      - OT should be merged with IT for efficiency
      - A well-segmented OT network can keep operating even when IT is devastated
      - Production should stop whenever IT has any incident
      - OT never needs backups
    correct: 1
    points: 15
    explain: >-
      Segmentation is not only about keeping attackers out of OT; it is also about
      letting the plant keep running when IT is on fire. The IT/OT boundary is a
      resilience feature in both directions.
  - ref: signed-not-safe
    prompt: >-
      Shamoon and Stuxnet both abused legitimately signed software (a signed
      driver, stolen signing certs). One sentence: what defensive assumption does
      that break? (accepts: signed is not safe, code signing is not enough,
      trust, allowlisting by signature)
    kind: regex
    pattern: "signed.*(not|isn|no).*safe|code ?signing|trust|allowlist|signature.*(not|insufficient)|not enough"
    case_sensitive: false
    points: 15
    placeholder: "the broken assumption"
    explain: >-
      That "signed equals trustworthy." Stolen keys and abused legitimate drivers
      defeat signature-based trust, so defence needs behaviour-based detection and
      least privilege on top of signing, not signing alone. Trust is earned by
      behaviour, not by a certificate.
  - ref: availability-safety
    prompt: >-
      Why is a data-destruction (availability) attack treated so seriously in OT,
      even when it never touches a controller?
    kind: choice
    options:
      - It is not; OT only cares about controllers
      - Losing the systems that plan, monitor, meter and coordinate operations can force shutdowns and unsafe conditions
      - It only affects email
      - Availability does not matter in OT
    correct: 1
    points: 15
    explain: >-
      In OT the priority order is safety, then availability, then integrity, then
      confidentiality. Losing availability of supporting systems can force
      shutdowns, remove operators' visibility, and create unsafe conditions. A
      wiper is an availability weapon, and availability is close to the top of
      what OT must protect.
---

You cannot always stop the first machine from being wiped. You can decide whether
that becomes an incident or a catastrophe. Shamoon is a masterclass in why the
boring controls, segmentation, least privilege, and tested backups, are the ones
that actually save you.

## The two questions that decide your outcome

1. **How far does it spread?** Wipers move with stolen admin credentials over
   open shares. Cut that with segmentation, least-privilege administration
   (no single account that is admin everywhere), and restricted SMB. This is the
   same reachability-plus-authority pattern behind every attack in this path.
2. **How fast do you rebuild?** Offline or immutable backups you have actually
   restored from, plus a rehearsed re-imaging pipeline, are the difference between
   a bad day and two lost weeks. A backup you have never tested is a guess.

And carry two ideas forward: **signed is not the same as safe** (both Shamoon and
Stuxnet abused legitimate signed software), and **availability is a safety
property in OT**, because losing the systems that plan and coordinate a plant can
force it into unsafe shutdowns even when no controller was ever touched.
