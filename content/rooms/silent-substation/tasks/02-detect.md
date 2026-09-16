---
title: Write the detection
questions:
  - ref: detection-strategy
    prompt: >-
      What is the most robust basis for detecting this intrusion, given the
      attacker used entirely legitimate IEC-104 commands from a new host?
    kind: choice
    options:
      - Alert on any packet to port 2404
      - Alert on IEC-104 command APDUs from any source not in the allowlist of known masters
      - Alert on all traffic after 02:00
      - Block the RTU's IP address
    correct: 1
    points: 20
    explain: >-
      The commands themselves are valid IEC-104 — there is no malformed packet to
      catch. What is anomalous is the *source*: a host issuing control-direction
      APDUs that is not one of the sanctioned masters. Allowlisting the small,
      known set of masters and alerting on command APDUs from anyone else is the
      detection that survives the attacker using perfectly legal protocol.
  - ref: grade-clean
    prompt: >-
      Write your rule to ~/work/detect.rules and run ~/grade. Submit the
      per-run token the grader prints when your rule fires on every malicious
      capture and stays silent on every clean one (zero false positives).
    kind: dynamic
    flag_prefix: OTF
    points: 30
    hints:
      - body: >-
          A Suricata rule keyed on the IEC-104 command TypeIDs (45-51, the C_*
          commands) with a source not in your known-master set is a strong start.
          The grader replays 6 captures: 3 benign polling sessions, 3 attacks.
        cost: 8
      - body: >-
          False positives are what fail most submissions: the legitimate master
          also sends commands. Your rule must exclude the sanctioned masters by
          address, or key on the specific rogue behaviour, so benign command
          traffic does not trip it.
        cost: 12
    explain: >-
      The grader emits your token only when you achieve full detection with zero
      false positives across the held-out set — the same bar a detection would
      have to clear before anyone would deploy it to a live SOC. A rule that
      screams on every command is useless; a rule that stays quiet on the real
      attack is worse. The token is unique to your grading run.
  - ref: sbo
    prompt: >-
      Which IEC-104 mechanism, if enforced by the RTU, would have required an
      attacker to send a select command and receive confirmation before the
      breaker would act on an operate command? (three letters or the phrase)
    kind: regex
    pattern: "sbo|select[- ]before[- ]operate"
    case_sensitive: false
    points: 15
    explain: >-
      Select-Before-Operate. The master must first 'select' the point and be
      acknowledged, then 'operate'. It is a safety interlock against accidental
      or stray single commands — and when RTUs are configured to accept
      direct-operate without it, a single spoofed command is all it takes. Part
      of hardening this substation is enforcing SBO on controllable points.
---

Forensics tells you what happened. Detection engineering is what stops it
happening unseen next time — and it is the part most CTF platforms skip entirely.
This room grades it directly.

## The detection problem

Here is the hard part: the attacker did nothing malformed. Every packet was
valid IEC-104. A signature that looks for "bad packets" has nothing to bite on.

So you detect on **who and what**, not **how**. On a substation network the set
of legitimate masters is small, known, and stable. Any host issuing
command-direction APDUs (the C_* TypeIDs, 45–51) that is not on that list is, by
definition, doing something it has no business doing. That is your rule.

## Write it and grade it

Author a Suricata rule (or a Zeek script — the grader accepts either) to
`~/work/detect.rules`:

```
# starting point — refine the source logic so benign command traffic is excluded
alert ip !$IEC104_MASTERS any -> $RTU_NET 2404 ( \
    msg:"IEC-104 command from unsanctioned master"; \
    flow:to_server,established; \
    content:"|68|"; depth:1; \
    ... key on command TypeIDs, exclude known masters ... \
    sid:1000001; rev:1; )
```

Then:

```bash
~/grade
```

The grader replays six held-out captures — three benign polling sessions and
three attack variants — through your rule. You pass only with **full detection
and zero false positives**: every attack caught, every clean session silent. Get
there and it prints your flag token. That bar is not arbitrary; it is the bar a
real detection has to clear before a SOC will run it, because a noisy rule gets
muted and a muted rule catches nothing.

## Then harden the RTU

The last question is about prevention, not detection. **Select-Before-Operate**
would have forced the attacker to select the breaker point and receive
confirmation before any operate command took effect — an interlock that a single
stray or spoofed command cannot satisfy. Enforcing SBO on every controllable
point is the configuration change that closes this door.
