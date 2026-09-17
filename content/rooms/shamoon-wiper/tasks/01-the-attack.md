---
title: The attack
questions:
  - ref: victim
    prompt: >-
      Which company was the primary victim of the original August 2012 Shamoon
      attack?
    kind: choice
    options:
      - RasGas
      - Saudi Aramco
      - National Iranian Oil Company
      - Qatar Petroleum
    correct: 1
    points: 10
    explain: >-
      Saudi Aramco was hit first, on August 15, 2012. RasGas in Qatar was struck
      days later with closely related malware. Both are pillars of the global
      energy supply, which is why the attack drew such attention.
  - ref: scale
    prompt: >-
      Roughly how many Saudi Aramco workstations had their data destroyed?
      (enter a number, e.g. 30000)
    kind: numeric
    value: 30000
    tolerance: 5000
    points: 15
    explain: >-
      About 30,000 to 35,000 workstations were wiped. Aramco physically replaced
      tens of thousands of hard drives and disconnected networks for roughly two
      weeks. Oil production continued on isolated systems, but business operations
      were crippled.
  - ref: malware-name
    prompt: >-
      What is the common name of the Shamoon malware component that overwrote the
      disks? (the wiper module / family name)
    kind: regex
    pattern: "disttrack|shamoon|wiper"
    case_sensitive: false
    points: 20
    explain: >-
      The malware is known as Shamoon, and its wiper component is often called
      DistTrack. It had three parts: a dropper that spread across the network, a
      wiper that overwrote files and the master boot record, and a reporter that
      sent status to the operators.
  - ref: mbr
    prompt: >-
      Beyond deleting files, what did the wiper overwrite to make machines
      unbootable?
    kind: choice
    options:
      - The BIOS firmware
      - The Master Boot Record (MBR)
      - The CPU microcode
      - The network switch config
    correct: 1
    points: 15
    explain: >-
      Shamoon overwrote files and then the Master Boot Record, so machines could
      not boot and the data was gone. Some variants infamously overwrote data with
      an image (a burning US flag in 2012). MBR destruction is what turned "some
      lost files" into "tens of thousands of bricked machines."
  - ref: driver
    prompt: >-
      Shamoon abused a legitimate, signed third-party disk driver to get raw
      write access to the disks. What does this technique let attackers bypass?
    kind: choice
    options:
      - Physical door locks
      - Operating-system file permissions and protections, by writing to the raw disk
      - The building fire alarm
      - Internet censorship
    correct: 1
    points: 15
    explain: >-
      It used a commercial signed driver (RawDisk from Eldos) to write directly to
      the disk, bypassing normal OS file protections. Abusing a legitimate signed
      driver to reach the raw hardware is a recurring wiper and rootkit technique,
      and a reminder that "signed" is not the same as "safe."
---

Not every landmark OT-adjacent attack manipulates a controller. Some just erase
everything, and in the energy sector that is its own kind of emergency.

> Research task. Everything here is public history, retold for training.

## What happened

On August 15, 2012, the Shamoon wiper detonated across Saudi Aramco, destroying
the data on roughly 30,000 to 35,000 workstations and overwriting their master
boot records so they would not restart. Days later, related malware hit RasGas in
Qatar. Neither attack reached the process controllers that pump and refine oil
and gas, yet both caused a major operational crisis, because modern energy
operations depend on the IT that schedules, meters, bills, and coordinates them.

The malware had three parts: a **dropper** that spread across Windows networks
using stolen credentials and shares, a **wiper** (DistTrack) that overwrote files
and the MBR (abusing a legitimate signed RawDisk driver for raw disk access), and
a **reporter** that phoned status home. Shamoon returned in later waves (2016,
2018) with the same brutal simplicity.

## Why an OT platform cares

Availability is a safety and operational property in OT. An attack that never
touches a PLC can still halt a plant by destroying the systems that plan and
support it, exactly the dynamic you will see again in Colonial Pipeline. The next
task is about surviving it.
