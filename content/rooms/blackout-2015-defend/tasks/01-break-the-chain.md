---
title: Break the chain
questions:
  - ref: kill-chain-weakest
    prompt: >-
      In the attack you just ran, the decisive capability was "reachability plus
      authority." Which single control most directly removes the *authority* an
      attacker gains from stolen VPN/operator credentials?
    kind: choice
    options:
      - Antivirus on the HMI
      - Multi-factor authentication on all remote access into the OT network
      - A longer password policy
      - Disabling USB ports
    correct: 1
    points: 20
    explain: >-
      MFA on remote access is the highest-leverage control for this specific
      attack. The 2015 operation turned on stolen single-factor VPN credentials;
      a second factor on the OT remote-access path breaks that link even when the
      password is compromised. (Passwords help IT hygiene but a stolen valid
      password defeats them.)
  - ref: segmentation
    prompt: >-
      The attackers pivoted from corporate IT to the SCADA network. Which
      architecture most directly removes that *reachability*?
    kind: choice
    options:
      - Put everything on one flat VLAN for simplicity
      - An IT/OT firewall and an industrial DMZ, with no direct IT-to-control connections
      - A faster switch between IT and OT
      - Give the SCADA servers public IPs behind NAT
    correct: 1
    points: 20
    explain: >-
      Segmentation with an IDMZ (Purdue Level 3.5) means an IT foothold cannot
      reach control systems directly — traffic terminates at brokered services in
      the DMZ. This is the reachability half of the equation; MFA is the
      authority half.
  - ref: command-allowlist
    prompt: >-
      Even a legitimate operator seat should not be able to send breaker-open
      commands from just anywhere. What detection/prevention control fits?
    kind: choice
    options:
      - Alert/allow control-direction commands only from sanctioned master stations
      - Rate-limit all Modbus reads
      - Block ICMP to the RTU
      - Encrypt the historian database
    correct: 0
    points: 15
    explain: >-
      Allowlisting the small, known set of masters that may issue control
      commands — and alerting on control APDUs from anyone else — catches the
      "right protocol, wrong source" pattern that legitimate-credential attacks
      produce. You built exactly this rule in Silent Substation.
  - ref: manual-fallback
    prompt: >-
      Ukrainian utilities restored power by switching substations to manual local
      control. What is the defensive principle this illustrates?
    kind: choice
    options:
      - Automation should never be used in utilities
      - Retaining a tested manual/local operating mode gives resilience when remote control is lost or compromised
      - Manual control is only for training
      - Backups make manual control unnecessary
    correct: 1
    points: 15
    explain: >-
      A tested manual fallback means losing (or distrusting) remote control is
      recoverable, not catastrophic. The 2015 grid's lower automation was, that
      day, a resilience feature. Preserving deliberate manual operating modes is a
      real OT design principle, not a relic.
  - ref: recovery-hardening
    prompt: >-
      The attackers bricked serial-to-Ethernet converters and wiped
      workstations to slow recovery. Which pairing best mitigates that?
    kind: choice
    options:
      - Faster internet and more RAM
      - Firmware integrity/signing on field devices plus offline, tested backups and spare converters
      - Deleting all logs to save space
      - Moving everything to the cloud
    correct: 1
    points: 15
    explain: >-
      The recovery attack targeted the ability to recover. Signed firmware resists
      malicious reflashing; offline tested backups and cold spares turn a
      "bricked, indefinite outage" into a "swap and restore." Plan for the
      attacker who is trying to stop you from recovering.
---

You opened the breaker. Now take it away from the next attacker. The clean way
to design defences is to walk the kill chain you just used and cut each link.

## The chain you exploited

```
 phishing → IT foothold → credential theft (incl. VPN) → reach the SCADA net
          → use legitimate operator access → open breakers → wipe/brick to delay recovery
```

Each question below targets one link:

- **Reachability** — segmentation + IDMZ so an IT foothold cannot touch control.
- **Authority** — MFA on remote access so a stolen password is not enough.
- **Command legitimacy** — allowlist the masters that may issue control, alert on
  the rest (your Silent Substation rule).
- **Consequence tolerance** — a tested manual/local mode so lost remote control
  is recoverable.
- **Recovery** — signed firmware, offline backups, cold spares, because the real
  attack also attacked your ability to recover.

No single control is a silver bullet. Defence in depth means the attacker has to
beat several, and any one you hold turns a blackout into a near-miss.
