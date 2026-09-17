# OTF Lab Orchestrator

A small HTTP service that turns a room's `lab` spec into a running, per-player,
network-isolated Docker stack, and reaps it when its TTL expires.

The web app never touches Docker. It POSTs intent here; this service owns the
Docker socket. Keeping that boundary means the internet-facing Next.js process
has no path to the container runtime.

## API (all requests require `Authorization: Bearer $OTF_ORCHESTRATOR_TOKEN`)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/labs` | `{id, userId, room, spec, ttlMinutes, flags}` | `{state, endpoints}` |
| POST | `/labs/status` | `{id}` | `{state, endpoints}` |
| POST | `/labs/stop` | `{id}` | `{state}` |
| POST | `/labs/extend` | `{id, minutes}` | `{state, expiresAt}` |
| GET  | `/health` | - | `{ok, running}` |

## What a spawn creates

For a lab `id` and a room spec, the orchestrator:

1. Creates a dedicated bridge network `otf_<id>` with **`internal: true`** - the
   containers can talk to each other but have **no route to the internet**. A
   training range must never be usable as a launch pad.
2. Starts each service container on that network with the room's resource caps
   (CPU, memory, PID limit), `cap_drop: ALL`, `no-new-privileges`, a read-only
   root filesystem where the image allows it, and the player's per-user flags
   injected as environment variables.
3. Publishes an ephemeral host port for each `expose: terminal | http` service
   and returns the URLs as endpoints.
4. Records an expiry. A background reaper tears the whole stack down at TTL.

## Security

The orchestrator only ever calls a fixed, small set of Docker endpoints. In
production it should sit behind `docker-socket-proxy` restricted to those
endpoints, so a compromise of this service cannot drive arbitrary Docker
operations on the host. See `docs/SECURITY.md`.
