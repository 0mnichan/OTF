---
title: How Stuxnet worked
questions:
  - ref: spread
    prompt: >-
      Natanz was air-gapped from the internet. What was Stuxnet's primary means
      of crossing that gap and spreading between machines?
    kind: choice
    options:
      - A cellular modem hidden on the PLC
      - Infected USB removable drives (with LNK and print-spooler exploits)
      - A malicious firmware update pushed over the WAN
      - A compromised satellite link
    correct: 1
    points: 15
    explain: >-
      Stuxnet spread on USB drives, using multiple Windows zero-days (including
      the LNK vulnerability and a print-spooler flaw) to execute and propagate.
      Removable media and transient engineering laptops are how "air gaps" are
      routinely bridged in practice.
  - ref: signed
    prompt: >-
      Stuxnet's Windows drivers were unusually trusted because they carried what?
    kind: choice
    options:
      - Microsoft's own signature
      - Stolen valid code-signing certificates (from Realtek and JMicron)
      - No signature, but antivirus was disabled
      - A Siemens signature
    correct: 1
    points: 15
    explain: >-
      Stuxnet used device drivers signed with stolen but valid certificates from
      Realtek and JMicron, so Windows loaded them without complaint. Stolen
      signing keys defeat "only run signed code" the same way stolen credentials
      defeat passwords.
  - ref: target-block
    prompt: >-
      On the engineering workstation, which Siemens software did Stuxnet hook to
      inject malicious logic into the controllers, and hide it from engineers?
    kind: regex
    pattern: "step ?7|simatic ?manager|s7|wincc"
    case_sensitive: false
    points: 20
    explain: >-
      Stuxnet infected the STEP 7 / SIMATIC Manager engineering environment (and
      WinCC). It intercepted the library that reads and writes PLC blocks (a
      classic man-in-the-middle on s7otbxdx.dll), so when an engineer opened the
      project the malicious blocks were hidden. Owning the engineering software
      is owning the controllers (ATT&CK T0843, Program Download).
  - ref: false-view
    prompt: >-
      While it varied the centrifuge speeds to damage them, how did Stuxnet keep
      the operators and the protection logic from noticing?
    kind: choice
    options:
      - It shut down the HMIs entirely
      - It recorded ~21 seconds of normal process values and replayed them during the attack
      - It printed fake paper reports
      - It sent operators home
    correct: 1
    points: 20
    explain: >-
      Stuxnet recorded normal sensor readings and replayed them to the monitoring
      systems during each sabotage cycle, so the displayed process looked healthy
      while the rotors were driven to destruction. This is Manipulation of View
      (T0832), and it is the exact move you will reproduce next.
  - ref: physical
    prompt: >-
      What was the physical sabotage Stuxnet actually performed on the rotors?
    kind: choice
    options:
      - It overheated the bearings with a coolant valve
      - It drove the drive frequency far outside the safe band (e.g. up to ~1410 Hz and down to a few Hz), stressing the rotors
      - It reversed the motor direction
      - It cut power at random
    correct: 1
    points: 15
    explain: >-
      Stuxnet manipulated the variable-frequency drives, pushing rotor speeds well
      outside the safe operating band (reportedly up toward 1410 Hz and then down
      to a crawl) to damage the centrifuges over time, all while the reported
      speed looked nominal.
---

Stuxnet (discovered 2010) is the reason this field exists as a discipline. It was
the first malware known to cross an air gap, reprogram safety-relevant industrial
controllers, and cause physical destruction, all while hiding in plain sight.

> This is a fictional recreation for training. The S7 controller, addresses and
> flag are simulated. No real system or classified detail is involved.

## The chain, end to end

1. **Delivery across the gap.** USB drives carrying several Windows zero-days
   (the LNK exploit, a print-spooler flaw, privilege escalations) let Stuxnet
   execute and spread between machines with no network path to the outside.
2. **Trust by theft.** Its kernel drivers were signed with stolen but valid
   certificates (Realtek, JMicron), so Windows loaded them without question.
3. **Own the engineering software.** On the STEP 7 / SIMATIC engineering seat it
   man-in-the-middled the library that reads and writes PLC blocks, injecting
   malicious logic into targeted S7-315 and S7-417 controllers and hiding it when
   engineers opened the project.
4. **Sabotage with a false view.** The malicious logic drove the centrifuge
   variable-frequency drives outside their safe band while replaying recorded
   normal readings, so operators and protection saw a healthy process.

Notice how many of those ideas you have already met: program download through the
engineering workstation, and manipulation of view. Next you will perform the last
step yourself.
