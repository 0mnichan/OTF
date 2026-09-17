# OTF - notes for working in this repo

OTF is an OT/ICS capture-the-flag training platform ("TryHackMe for the plant
floor"). Deliberately dependency-light so it runs anywhere Node 22 runs.

## Architecture

- **Web app**: Next.js 16 App Router + TypeScript, in `src/`.
- **Persistence**: SQLite via Node's built-in `node:sqlite` - no ORM, no DB
  server. All access goes through `src/lib/db.mjs`. Schema is plain SQL in
  `db/migrations/`. The `.mjs` library files have hand-written `.d.mts`
  declarations (note the `.mts` - `.d.ts` does NOT apply to `.mjs` imports).
- **Content is the source of truth**: rooms live in `content/rooms/` as YAML +
  Markdown, validated by a Zod schema and synced into SQLite (a cache) via
  `npm run content:sync`. Never edit room data directly in the DB.
- **Labs**: `services/orchestrator/` spawns per-player Docker stacks;
  `labs/base/sim-core/` is the shared physics + Modbus runtime; `labs/images/`
  holds per-room images.

## Commands

- `npm run dev` / `npm run build` - web app
- `npm run setup` - migrate + content sync + seed
- `npm test` - Node test suite (`tests/*.test.mjs`, real SQLite)
- `npm run content:validate` - check the content tree
- `python3 tests/test_physics.py` - sim-core physics tests
- `./infra/build-labs.sh` - build lab images (needs a Docker daemon)

## Conventions

- Question `ref` values are stable identifiers - renaming one loses player
  progress. Change prompts/points/hints freely; keep the ref.
- Register/coil numbers in room prose must match the lab image exactly.
- Dynamic flags are per-user HMACs; never store a plaintext flag anywhere.
- Labs have no internet egress and run with dropped capabilities - keep it that
  way.

## This environment

Sessions here have Node 22 + Docker CLI but **no Docker daemon** and no Postgres.
Platform code, content, scoring, physics, PCAP generation and the grader all run
and are tested here. Docker image builds and live lab spawn are verified on a
host with a daemon.
