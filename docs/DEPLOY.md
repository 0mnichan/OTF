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
