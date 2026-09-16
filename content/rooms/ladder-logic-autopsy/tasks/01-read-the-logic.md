---
title: Read the logic
questions:
  - ref: normally-closed
    prompt: >-
      In ladder logic, a contact drawn as -|/|- is a normally-closed contact.
      When the associated bit is TRUE (1), does this contact pass power or block it?
    kind: choice
    options:
      - It passes power when the bit is TRUE
      - It blocks power when the bit is TRUE
      - It always passes power
      - It is the same as a coil
    correct: 1
    points: 15
    explain: >-
      A normally-closed contact conducts when its bit is FALSE and opens when the
      bit is TRUE — the inverse of a normally-open -| |- contact. Misreading NO
      vs NC is the single most common ladder-logic error, and it inverts your
      entire understanding of a rung. Interlocks are very often built from NC
      contacts precisely so a TRUE fault condition breaks the rung.
  - ref: interlock-rung
    prompt: >-
      The bottle-jam interlock is meant to stop the conveyor when a jam is
      detected. In program.st, which single boolean variable, when forced, makes
      the interlock behave as if there is never a jam? (variable name)
    kind: static
    answer: MAINT_BYPASS
    case_sensitive: false
    points: 25
    hints:
      - body: >-
          Read the conveyor-run rung. The jam sensor term is ANDed with the
          negation of a flag whose name sounds administrative and harmless.
        cost: 8
    explain: >-
      MAINT_BYPASS is ORed into the interlock so that when it is TRUE, the jam
      condition is ignored and the conveyor keeps running through a jam. It was
      almost certainly added for legitimate maintenance testing and never
      removed — a hardcoded bypass of a safety interlock, which is T0873,
      Program Organization Units abuse, and a genuinely common finding in real
      PLC code reviews.
  - ref: bypass-register
    prompt: >-
      MAINT_BYPASS is mapped to an externally writable Modbus point so it can be
      set over the network. Which coil address is it? (decimal)
    kind: numeric
    value: 9
    points: 20
    hints:
      - body: >-
          Find the I/O mapping section at the top of program.st. MAINT_BYPASS is
          bound to a coil in the %QX / coil range that a Modbus write can reach.
        cost: 6
    explain: >-
      Coil 9. The bypass being reachable over Modbus is what turns an internal
      maintenance shortcut into a remotely exploitable safety defeat. Nobody
      would have written 'let the internet stop the jam sensor', but mapping the
      flag to a coil for the maintenance HMI did exactly that.
---

No protocol trick this time. The vulnerability is a design decision sitting in
plain sight inside the controller's own program — and to find it you have to be
able to read that program. This room teaches that skill on a deliberately
realistic example.

## Ladder logic in ninety seconds

Ladder logic is drawn to resemble a relay wiring diagram. Power flows left to
right along a **rung**; if a complete path exists, the **coil** on the right
energises.

```
  |  Start   Stop                          Motor  |
  |--| |------|/|--------------------------( )-----|
  |                                                |
  |  Motor                                         |
  |--| |------+   (seal-in: holds the motor on)    |
```

- `-| |-` **normally-open** contact: conducts when its bit is TRUE.
- `-|/|-` **normally-closed** contact: conducts when its bit is FALSE.
- `-( )-` **coil**: the output, energised when the rung has a complete path.

That single inversion — NO conducts on TRUE, NC conducts on FALSE — is where
careful reading pays off. Safety interlocks are usually built from NC contacts so
that a fault (bit TRUE) *breaks* the rung and stops the machine. An interlock that
has been quietly defeated often looks like an extra term ORed in that keeps the
rung alive when it should open.

## Structured Text

The same controller also exposes its logic as **Structured Text**, a Pascal-like
language, in `~/artifacts/program.st`. ST is easier to grep than ladder:

```pascal
(* conveyor runs unless a jam is detected *)
CONVEYOR_RUN := START_CMD AND NOT STOP_CMD AND NOT JAM_DETECTED;
```

Read the real file. Somewhere in the conveyor-run logic, the clean `NOT
JAM_DETECTED` term has a companion it should not have — a flag that, when set,
makes the jam vanish from the logic's point of view. Find its name, find the
Modbus point it is mapped to, and you have found the back door. Confirming it on
the live runtime is the next task.
