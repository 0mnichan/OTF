# Deploying OTF on one VM

Target: a single Linux host with Docker. Comfortably serves a classroom or a
small CTF; scale out later by moving the orchestrator and lab hosts onto their
own machines.

## Requirements

- Docker Engine 24+ and the Compose plugin.
- ~4 GB RAM for the platform plus headroom per concurrent lab (each lab is a few
  small containers).
- Ports 80/443 for Traefik.

## First run

```bash
git clone <your-fork> otf && cd otf
cp .env.example .env
# edit .env: set OTF_SECRET (openssl rand -hex 32) and OTF_ORCHESTRATOR_TOKEN,
# and OTF_LAB_HOST to the host's public address so lab links resolve.

./infra/deploy.sh          # builds lab images + brings up the stack
```

`deploy.sh` builds the lab images, builds and starts the web app, orchestrator
and Traefik, and waits for health. The web container migrates the database,
syncs content and seeds badges on boot.

## Local development (no Docker needed for the app)

```bash
npm install
cp .env.example .env
npm run setup              # migrate + content sync + seed
npm run dev                # http://localhost:3000
```

Labs need the orchestrator and a Docker daemon; without them the app runs in
content-only mode and the lab panel says so. To develop labs:

```bash
./infra/build-labs.sh
cd services/orchestrator && OTF_ORCHESTRATOR_TOKEN=dev npm start &
OTF_ORCHESTRATOR_URL=http://localhost:4000 OTF_ORCHESTRATOR_TOKEN=dev npm run dev
```

## Operations

- **Backups:** `./infra/backup.sh` snapshots the SQLite database (users +
  progress). Content lives in git and needs no backup.
- **Updating content:** edit files under `content/`, open a PR, and after merge
  run `npm run content:sync` (or redeploy — the web container syncs on boot).
- **Adding a lab image:** build it, tag it `otf/<name>:latest`, reference it from
  a room's `lab.services[].image`. The orchestrator loads images from the local
  daemon and never pulls from a registry.
- **Logs:** `docker compose -f infra/docker-compose.yml logs -f web orchestrator`.

## Hardening for production

See `docs/SECURITY.md`. The essentials: real secrets, remove seed accounts, TLS
at Traefik, and front the Docker socket with `docker-socket-proxy`.

## Deploy the platform to Render (content-only, no labs)

The quickest way to get OTF in front of people. Labs stay off (they need a
Docker host — your homelab — added later); everything else works.

1. Push this repo to GitHub (already done for the working branch).
2. In Render: **New + → Blueprint**, connect the repo. Render reads
   `render.yaml` and provisions a Node web service.
3. Wait for the first deploy. The start command migrates, syncs content and
   seeds badges on every boot, so the site comes up populated.
4. Open the URL and **register — the first account becomes admin.**

**Data persistence:** the free plan has an ephemeral filesystem, so accounts and
progress reset on each deploy/cold start (content and badges re-seed
automatically, so it's never broken — just forgetful). To keep data, follow the
persistence notes in `render.yaml`: switch to a paid instance, add the disk
block, and point `OTF_DB_PATH` at the mounted volume. Or run the platform on the
homelab where the SQLite file lives on real disk.

**Adding labs later:** once the homelab orchestrator is reachable, set
`OTF_ORCHESTRATOR_URL` and `OTF_ORCHESTRATOR_TOKEN` on the service and the lab
panels light up. (Realistically you'll move the whole thing to the homelab for
labs, since the orchestrator and the web app want to share a network.)
