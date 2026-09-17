# OTF Lab Images

Every target on the range is a purpose-built simulation. No vendor firmware, no
proprietary software, no real project files. Build them all with
`infra/build-labs.sh` (requires a Docker daemon on the lab host).

## The `sim-core` harness

`labs/base/sim-core/` is the reusable engine every process-simulation room
shares:

- **`physics.py`** - pure, dependency-free process models (tank, level control,
  alarm, conveyor interlock, reactor). Unit-tested directly in `tests/`.
- **`modbus_runtime.py`** - a pymodbus TCP server that exposes a physics model
  through registers/coils and emits a flag into a register block **only when the
  simulation genuinely reaches the objective state**. This is what makes flags
  physical-consequence flags rather than strings.
- **`flags.py`** - per-user flag resolution and ASCII↔register packing.

## Image catalogue

| Image | Room | What it is |
|---|---|---|
| `otf/attacker-shell` | most | Browser terminal (ttyd) with nmap, tshark, scapy, pymodbus, modbus-cli and helper tools |
| `otf/analyst-shell` | Silent Substation | Blue-team workstation with tshark, Suricata/Zeek and the detection grader |
| `otf/modbus-plc` | Modbus 101 | Modbus target; flag hidden in an unread register block |
| `otf/clearwater-plc` | Clearwater | Level-control PLC on the tank physics; witness + overflow flags |
| `otf/clearwater-hmi` | Clearwater | Live operator HMI that displays whatever the PLC reports |
| `otf/bottling-plc` | Ladder Logic Autopsy | Conveyor interlock with the maintenance-bypass back door |
| `otf/meridian-plc` | Bridgehead | Reactor PLC; identity flag + process-trip-with-view-gap flag |
| `otf/foothold-workstation` | Bridgehead | Level-4 foothold with a planted saved credential |
| `otf/historian-dmz` | Bridgehead | DMZ historian reachable with the reused credential |
| `otf/engineering-workstation` | Bridgehead | EWS with a never-disabled remote-support account and the reactor tag map |

## Fidelity notes

- **Physics rooms (Modbus 101, Clearwater, Ladder Logic Autopsy, Bridgehead
  reactor)** are fully simulated and their flags are emitted by real state
  changes in `sim-core`. These are the heart of the platform.
- **Silent Substation** is a forensics + detection room: the artifacts are real
  synthesised PCAPs (see `labs/generators/`) and the grader genuinely scores a
  detection rule against held-out captures.
- **Bridgehead pivot hosts** model the IT→OT chain with SSH-reachable hosts,
  planted credentials, and a never-disabled remote-support account. The
  orchestrator places them on one isolated network with DNS aliases matching the
  briefing hostnames; the Purdue-segment IP addresses in the narrative are
  illustrative rather than separately routed. Extending the orchestrator to
  multi-segment networks per lab is a documented future step in `docs/LAB_SPEC.md`.

## Safety

- Every lab network is created with `internal: true` - **no internet egress**.
- Containers run with `cap_drop: ALL`, `no-new-privileges`, CPU/memory/PID caps.
- Flags are per-user (HMAC-derived) and injected at spawn, so a leaked flag is
  useless to anyone else and traceable to whoever it was issued to.
