# OTF - the OT/ICS Cyber Range

**"TryHackMe for the plant floor."** OTF is a self-hostable capture-the-flag and
training platform built entirely around operational technology and industrial
control system security. Every target is a simulated plant, substation, or water
works, and the protocols are the ones that actually run the physical world:
Modbus, S7comm, DNP3, IEC-104, EtherNet/IP and OPC UA.

## What makes it different

Most CTFs ask you to find a string. OTF asks you to cause a **physical
consequence**. A room's objective is a process state - overflow the clarifier,
open the breaker, defeat a safety interlock - and the flag is emitted by a physics
simulation only when the simulated plant actually reaches that state. You cannot
grep for it; you have to make it happen.

- **Rooms teach OT reasoning, not IT reflexes.** Knowing *which* register is the
  high-high alarm setpoint is the lesson, not reading a register.
- **Restraint is scoreable.** Rooms can reward hitting the objective without
  tripping the safety system - the discipline real OT red teams are graded on.
- **Blue team is first class.** Defensive tasks submit a detection rule that a
  grader replays against clean and malicious captures, scoring true and false
  positives.

## Stack

Deliberately dependency-light so it runs anywhere Node 22 runs:

- **Next.js 16** (App Router, TypeScript) for the web app and API.
- **SQLite** via Node's built-in `node:sqlite` - no database server, no ORM.
- **`node:crypto`** for password hashing, sessions, and per-user dynamic flags.
- **Docker Compose** for the platform and for per-player, network-isolated lab
  stacks delivered straight to the browser (no VPN client required).

## Quick start

```bash
npm install
cp .env.example .env        # then edit OTF_SECRET
npm run setup               # migrate + sync content + seed badges & demo users
npm run dev                 # http://localhost:3000
```

Development accounts (change before exposing anything):
`operator@otf.local` / `changeme-operator`, `admin@otf.local` / `changeme-admin`.

## Content is code

Rooms live under `content/rooms/<slug>/` as a YAML manifest plus Markdown tasks,
validated by a schema in CI and synced into SQLite (which is only a cache). Author
a room, open a pull request, and it is reviewed and versioned like any other code.
See `docs/AUTHORING.md`.

## Safety and scope

Everything here is purpose-built simulation. No vendor firmware, no proprietary
project files, no zero-days - only CVE-documented weakness classes reimplemented
in our own code and the inherent insecurity of legacy protocols. Labs have no
internet egress. Techniques learned here are for authorised testing only; see
`docs/SECURITY.md` and the acceptable-use policy.
