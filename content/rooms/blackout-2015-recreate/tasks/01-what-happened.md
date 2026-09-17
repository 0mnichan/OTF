---
title: What happened in 2015
questions:
  - ref: first-grid
    prompt: >-
      The December 2015 Ukraine attack was notable as a "first" for the power
      sector. What made it historic?
    kind: choice
    options:
      - The first ransomware to hit a utility
      - The first confirmed cyberattack to cause a power grid outage
      - The first use of a zero-day against a PLC
      - The first insider attack on a substation
    correct: 1
    points: 10
    explain: >-
      Roughly 225,000 customers lost power across three regional distribution
      companies (oblenergos). It was the first publicly confirmed case of a cyber
      operation directly causing electricity outages.
  - ref: customers
    prompt: >-
      Approximately how many customers lost power? (thousands - enter the number
      of customers, e.g. 225000)
    kind: numeric
    value: 225000
    tolerance: 25000
    points: 10
    explain: >-
      About 225,000. The outage lasted one to six hours; the deeper damage -
      wiped workstations and bricked serial-to-Ethernet converters - took far
      longer to recover from.
  - ref: initial-access
    prompt: >-
      How did the attackers first get into the corporate networks, months before
      the outage?
    kind: choice
    options:
      - A public-facing RDP brute force
      - Spear-phishing emails carrying a malicious Office macro (BlackEnergy 3)
      - A supply-chain implant in the PLC firmware
      - A rogue insider at the utility
    correct: 1
    points: 15
    explain: >-
      Spear-phishing with weaponised Office documents delivered BlackEnergy 3.
      From that IT foothold the attackers spent months harvesting credentials -
      including VPN credentials into the OT network - and learning the SCADA
      environment.
  - ref: how-breakers
    prompt: >-
      When the moment came, how were the breakers actually opened?
    kind: choice
    options:
      - Custom malware autonomously issued open commands
      - The attackers remotely operated the real HMIs/SCADA clients by hand, using stolen operator access
      - A logic bomb in the PLC ladder tripped them
      - Physical access to the substation switchgear
    correct: 1
    points: 20
    explain: >-
      This is the detail that matters. The 2015 attackers did not need bespoke
      ICS malware to trip breakers - they used the operators' own remote-access
      and HMI software with stolen credentials and opened breakers by hand,
      clicking through the legitimate interface. The malware (KillDisk, the
      converter firmware attack, the telephone-DoS) was about blinding and
      delaying recovery, not the tripping itself.
  - ref: recovery
    prompt: >-
      How did Ukrainian utilities ultimately restore power that day?
    kind: choice
    options:
      - They restored from SCADA backups remotely
      - Field crews switched substations back to manual/local control by hand
      - The attackers were locked out and breakers auto-reclosed
      - Power was rerouted from neighbouring countries
    correct: 1
    points: 15
    explain: >-
      Crews drove to substations and operated them manually. That manual
      fallback - a "weakness" of a less-automated grid - became the resilience
      that got the lights back on. It is a defensive lesson you will use in the
      companion defence room.
---

Before you reproduce it, understand it. This room recreates the *mechanism* of
the December 23, 2015 attack on Ukraine's power distribution grid - the first
cyber operation confirmed to have switched off the lights.

> This is a **fictional recreation** for training. The RTU, addresses and flag
> are simulated. No real utility system or data is involved.

## The shape of the operation

The attack was patient and unglamorous, which is exactly why it is worth
studying:

1. **Months earlier - spear-phishing.** Weaponised Office documents delivered
   **BlackEnergy 3** to corporate IT at three regional distribution companies.
2. **Credential theft and reconnaissance.** From IT, the attackers harvested
   credentials - crucially, **VPN credentials into the OT network** - and mapped
   the SCADA environment. There was no rush.
3. **The strike.** Using stolen operator access, they **remotely operated the
   real HMIs** and opened breakers **by hand** across dozens of substations.
   No exotic PLC exploit - the operators' own tools, turned against them.
4. **Blinding and delaying.** **KillDisk** wiped workstations and servers;
   malicious firmware **bricked serial-to-Ethernet converters** so operators
   lost remote visibility and control; a **telephone denial-of-service** flooded
   call centres so customers could not report outages.
5. **Recovery - by hand.** Field crews physically drove to substations and
   switched them back to **manual local control**.

## The uncomfortable takeaway

The decisive capability was not malware. It was **legitimate remote access plus
stolen credentials plus a flat-enough network to reach the control systems**.
That is why this recreation puts you on a seat whose credentials were reused
from the corporate VPN - because that is where the real attack's power came
from, and it is what the defence room will teach you to take away.
