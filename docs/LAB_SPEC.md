# Lab spec reference

A room's `lab:` block in `room.yaml` describes a stack the orchestrator builds
per player. The web app validates it (see `labServiceSchema` in
`src/lib/content.mjs`) and the orchestrator realises it in Docker.

## Fields

```yaml
lab:
  enabled: true             # default true
  ttl_minutes: 60           # 5–240; the reaper tears the lab down at expiry
  network: otf-lab          # informational; the real network is per-instance
  egress: false             # LOCKED to false - labs never reach the internet
  briefing: >-              # shown in the lab panel before spawn
    Free text describing the segment, hostnames and objective.
  services:
    - name: attacker        # kebab-case, unique in the room
      image: otf/attacker-shell:latest
      expose: terminal      # terminal | http | none
      port: 7681            # container port for http/terminal (defaults sensible)
      hostname: attacker.lab
      label: Attacker shell # shown on the endpoint button
      env: { KEY: value }   # extra environment for the container
      command: "..."        # optional; string or list
      cpus: 0.5             # CPU cap
      memory_mb: 256        # memory cap
```

## How the orchestrator realises it

1. Creates an **internal** bridge network `otf_<labId>` - no gateway, no egress.
2. Starts each service on that network with DNS aliases matching `hostname`, so
   `plc.lab` resolves between containers.
3. Applies caps: `Memory`, `NanoCpus`, `PidsLimit: 256`, `CapDrop: [ALL]`,
   `SecurityOpt: [no-new-privileges]`, `RestartPolicy: no`.
4. For `expose: terminal | http`, publishes an ephemeral host port and returns a
   URL; Traefik (or the host) makes it reachable to the owning player only.
5. Injects the player's per-question flags as `OTF_FLAG_<REF>` and, for a
   single-flag service, `OTF_FLAG`.

## `expose` values

- **`terminal`** - a ttyd container; the player gets an in-browser shell.
- **`http`** - a web service (e.g. an HMI); the player gets a link.
- **`none`** - reachable only from inside the lab network (the actual targets).

## Emitting flags from a lab

A target should reveal its flag **only when the objective is genuinely met**.
The `sim-core` pattern: read the injected `OTF_FLAG`, and write it into a Modbus
register block from an `objectives` callback that returns true only once the
physics reaches the goal state. See `labs/base/sim-core/modbus_runtime.py` and
any `labs/images/*/entrypoint.py`.

## Future: multi-segment labs

Today all services in a lab share one isolated network, with hostnames matching
the briefing. The Bridgehead room narrates distinct Purdue segments (corporate,
DMZ, plant) as separate IP ranges; realising those as separate networks with a
routing/firewall container between them is a planned extension. The spec already
carries `hostname` per service so room content need not change when it lands -
only the orchestrator's network construction.
