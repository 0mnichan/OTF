# Authoring rooms

A room is a directory under `content/rooms/<slug>/`. Nothing about a room lives
in the database by hand - you write files, run `npm run content:validate`, and
`npm run content:sync` loads them into SQLite. Rooms are reviewed and versioned
in pull requests like any other code.

## Layout

```
content/rooms/my-room/
├─ room.yaml                # manifest: metadata + optional lab spec
├─ tasks/
│  ├─ 01-intro.md           # ordered by filename; frontmatter holds questions
│  └─ 02-exploit.md
└─ artifacts/               # optional PCAPs etc., served to players
```

## room.yaml

```yaml
slug: my-room               # must equal the directory name
title: My Room
summary: One or two sentences shown on the room card.
difficulty: medium          # intro | easy | medium | hard | insane
purdue_levels: [1, 2]       # which Purdue levels the room touches
protocols: [modbus]         # used for filtering and badges
attack_ics: [T0836]         # MITRE ATT&CK for ICS technique ids
est_minutes: 45
prereqs: [modbus-101]       # rooms that must be completed first
tags: [recon, hmi]
lab:                        # omit for a content-only room
  ttl_minutes: 60
  briefing: Shown in the lab panel.
  services:
    - name: attacker
      image: otf/attacker-shell:latest
      expose: terminal      # terminal | http | none
      hostname: attacker.lab
    - name: plc
      image: otf/my-plc:latest
      expose: none
      hostname: plc.lab
      env: { OTF_FLAG_REF: "my-room.the-flag" }
```

## Tasks and questions

Each task is Markdown with YAML frontmatter:

```markdown
---
title: Read the register map
questions:
  - ref: level-reg          # unique within the room; stable across edits
    prompt: Which register holds the tank level?
    kind: numeric           # static | regex | dynamic | numeric | choice | ack
    value: 7
    points: 15
    hints:
      - body: Watch which value moves on its own.
        cost: 5
    explain: Shown after a correct answer.
---

Markdown body. Code blocks, tables and images all render.
```

### Question kinds

| kind | fields | notes |
|---|---|---|
| `static` | `answer` | Compared after normalization (trim/collapse/case-fold). Stored only as a SHA-256 hash. |
| `regex` | `pattern` | Case-insensitive unless `case_sensitive: true`. |
| `numeric` | `value`, `tolerance`, `unit` | Strips non-numeric characters before comparing. |
| `choice` | `options`, `correct` | `correct` is an index or list of indices. |
| `dynamic` | `flag_prefix` | Per-user flag: `HMAC(userId, room.ref)`. Requires a lab that emits it. |
| `ack` | - | "Mark as read"; always correct, worth its points. |

### The `ref` is sacred

`ref` is the stable identifier for a question. Player progress is remapped by
`ref` across content edits, so **renaming a ref loses progress**. Change prompts,
points and hints freely; keep the ref.

## Dynamic flags and labs

A `dynamic` question's flag is derived per user and injected into the lab at
spawn as `OTF_FLAG_<REF>` (and `OTF_FLAG` for a single-flag service). The lab
image must emit that exact value only when the objective is genuinely reached -
see `labs/base/sim-core/` for the pattern. `content:validate` fails a room that
has dynamic flags but no lab.

## Checklist before opening a PR

- `npm run content:validate` passes.
- Every `dynamic` question has a lab service that emits its flag.
- Register/coil numbers in the prose match the lab image exactly.
- Hints cost points proportional to how much they give away.
- The room is added to a path in `content/paths/` if it belongs to one.
