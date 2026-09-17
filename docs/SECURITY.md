# Security model

OTF exists to teach people how to attack industrial control systems. That makes
its own threat model unusually important: a platform for practising OT attacks
must not itself become a weapon or a liability.

## Principles

1. **Everything is a simulation.** No vendor firmware, no proprietary HMI
   software, no real project files, no customer data. Scenarios inspired by real
   incidents are labelled as fictional recreations, and their captures and
   addresses are synthesised by us (`labs/generators/`).
2. **No zero-days.** Vulnerabilities are either inherent protocol weaknesses
   (Modbus has no authentication - that *is* the lesson) or well-documented
   weakness classes reimplemented in our own code. We ship nothing that is novel
   and weaponisable.
3. **Labs cannot reach the internet.** Every lab network is created with
   `internal: true`. Containers run with `cap_drop: ALL`, `no-new-privileges`,
   and CPU/memory/PID limits. A training range must never be usable as a launch
   pad, and must not be farmable for compute.

## The orchestrator and the Docker socket

The lab orchestrator needs the Docker API to create containers and networks,
which is root-equivalent on the host. This is the single most sensitive
component.

- The web app **never** touches Docker. It records intent in the database and
  calls the orchestrator over HTTP with a shared bearer token. The
  internet-facing process therefore has no path to the container runtime.
- In production, **do not mount the raw socket into the orchestrator**. Front it
  with [`docker-socket-proxy`](https://github.com/Tecnativa/docker-socket-proxy)
  configured to allow only the endpoints the orchestrator actually calls
  (containers create/start/remove, networks create/connect/remove, images
  inspect, and list/inspect). Everything else - exec, volumes, swarm, build -
  stays denied. A compromise of the orchestrator is then bounded to lab
  lifecycle operations rather than arbitrary host control.
- The orchestrator enforces one running lab per user, a global concurrency
  ceiling (`OTF_MAX_LABS`), and a TTL reaper.

## Application security

- Passwords are hashed with scrypt (per-user salt, constant-time verify).
  `authenticate()` runs a hash comparison even for unknown emails so response
  time does not reveal whether an account exists.
- Sessions are opaque random tokens in httpOnly, SameSite=Lax cookies, `Secure`
  in production. `OTF_SECRET` signs nothing guessable and derives dynamic flags.
- Answer submission is rate-limited per user per question (wrong answers only).
- Room prerequisites are enforced server-side in the submit API, not just in the
  UI.
- Task Markdown is authored in-repo and trusted; it is rendered server-side and
  never mixes in user input. User-supplied fields (bios, answers) are escaped by
  React and length-capped.

## Per-user flags and anti-cheat

Flags for `dynamic` questions are `HMAC(userId, room.ref, OTF_SECRET)`. A leaked
flag will not validate for anyone else, and because every user's flag is
recomputable, a shared flag is *attributable*: the submit path detects when a
user submits a flag issued to someone else and records a `flag.shared` audit
event visible in the admin console.

## Deploying safely

- Set a real `OTF_SECRET` (`openssl rand -hex 32`) and `OTF_ORCHESTRATOR_TOKEN`.
- Change or remove the seeded development accounts before exposing the instance.
- Terminate TLS at Traefik and serve only over HTTPS in production.
- Keep the orchestrator off the public network; only the web app should reach it.

## Reporting

This is a training platform, not a product with a security team. If you find a
real issue in the platform code (as opposed to an intended lab weakness), open an
issue or PR.
