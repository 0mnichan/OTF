/**
 * OTF Lab Orchestrator.
 *
 * Owns the Docker socket so the web app never has to. Turns a room's lab spec
 * into a per-player, egress-blocked Docker stack, hands back browser-reachable
 * endpoints, and reaps everything on a TTL.
 *
 * Dependencies: dockerode only. Node 20+ for the built-in http server.
 */
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import Docker from 'dockerode';

const PORT = Number(process.env.PORT ?? 4000);
const TOKEN = process.env.OTF_ORCHESTRATOR_TOKEN ?? '';
const HOST_ADDR = process.env.OTF_LAB_HOST ?? 'localhost';
const IMAGE_PREFIX = process.env.OTF_IMAGE_PREFIX ?? 'otf';
const MAX_LABS = Number(process.env.OTF_MAX_LABS ?? 40);
const REAP_INTERVAL_MS = 30_000;

const docker = new Docker(); // talks to /var/run/docker.sock (or DOCKER_HOST)

/** In-memory registry of live labs. The web app's DB is the durable record. */
const labs = new Map(); // id -> { id, network, containers, endpoints, expiresAt, state }

const LABEL_NS = 'otf.lab';

/* -------------------------------------------------------------------------- */
/* Docker helpers                                                             */
/* -------------------------------------------------------------------------- */

function labelName(id) {
  return `otf_${id}`;
}

async function ensureImage(image) {
  // Fail fast with a clear message rather than trying to pull from a registry:
  // lab images are built locally by `infra/build-labs.sh`.
  try {
    await docker.getImage(image).inspect();
  } catch {
    throw new Error(`lab image not found locally: ${image} (run infra/build-labs.sh)`);
  }
}

async function createNetwork(id) {
  return docker.createNetwork({
    Name: labelName(id),
    Driver: 'bridge',
    Internal: true, // <- the crucial line: no egress from lab containers
    Labels: { [LABEL_NS]: id },
  });
}

function hostConfigFor(service) {
  const cpus = Number(service.cpus ?? 0.5);
  const memMb = Number(service.memory_mb ?? 256);
  const portBindings = {};
  const exposed = {};

  if (service.expose === 'http' || service.expose === 'terminal') {
    const containerPort = `${service.port ?? (service.expose === 'terminal' ? 7681 : 8080)}/tcp`;
    exposed[containerPort] = {};
    portBindings[containerPort] = [{ HostPort: '' }]; // ephemeral host port
  }

  return {
    exposed,
    hostConfig: {
      NetworkMode: 'none', // attached explicitly to the lab network after create
      Memory: memMb * 1024 * 1024,
      NanoCpus: Math.round(cpus * 1e9),
      PidsLimit: 256,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges'],
      RestartPolicy: { Name: 'no' },
      PortBindings: portBindings,
    },
  };
}

async function startService(id, service, flags) {
  const image = service.image.startsWith(IMAGE_PREFIX)
    ? service.image
    : service.image;
  await ensureImage(image);

  const { exposed, hostConfig } = hostConfigFor(service);
  const env = Object.entries(service.env ?? {}).map(([k, v]) => `${k}=${v}`);
  // Inject this player's per-question flags so lab-emitted flags are per-user.
  for (const [ref, value] of Object.entries(flags ?? {})) {
    env.push(`OTF_FLAG_${ref.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}=${value}`);
  }
  // If the service names the flag it should emit, pass it directly too.
  if (service.env?.OTF_FLAG_REF && flags?.[service.env.OTF_FLAG_REF]) {
    env.push(`OTF_FLAG=${flags[service.env.OTF_FLAG_REF]}`);
  }

  const container = await docker.createContainer({
    Image: image,
    name: `otf_${id}_${service.name}`,
    Hostname: service.hostname || service.name,
    Env: env,
    ExposedPorts: exposed,
    Cmd: Array.isArray(service.command)
      ? service.command
      : service.command
        ? ['/bin/sh', '-c', service.command]
        : undefined,
    Labels: { [LABEL_NS]: id, [`${LABEL_NS}.service`]: service.name },
    HostConfig: hostConfig,
  });

  await docker.getNetwork(labelName(id)).connect({
    Container: container.id,
    EndpointConfig: { Aliases: [service.hostname || service.name] },
  });

  await container.start();
  return container;
}

async function resolveEndpoints(id, spec, containers) {
  const endpoints = [];
  for (const service of spec.services) {
    const container = containers.get(service.name);
    const base = {
      name: service.name,
      label: service.label || service.name,
      expose: service.expose ?? 'none',
      hostname: service.hostname || '',
    };
    if (service.expose === 'http' || service.expose === 'terminal') {
      const info = await container.inspect();
      const portKey = `${service.port ?? (service.expose === 'terminal' ? 7681 : 8080)}/tcp`;
      const mapped = info.NetworkSettings.Ports?.[portKey]?.[0]?.HostPort;
      if (mapped) base.url = `http://${HOST_ADDR}:${mapped}`;
    }
    endpoints.push(base);
  }
  return endpoints;
}

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

async function spawn({ id, spec, ttlMinutes, flags }) {
  if (labs.size >= MAX_LABS) {
    throw new Error(`lab capacity reached (${MAX_LABS} running)`);
  }
  if (labs.has(id)) return statusOf(id);

  const record = { id, state: 'starting', containers: new Map(), endpoints: [], network: null,
    expiresAt: Date.now() + ttlMinutes * 60_000 };
  labs.set(id, record);

  try {
    record.network = await createNetwork(id);
    for (const service of spec.services) {
      const container = await startService(id, service, flags);
      record.containers.set(service.name, container);
    }
    record.endpoints = await resolveEndpoints(id, spec, record.containers);
    record.state = 'running';
  } catch (err) {
    record.state = 'failed';
    record.error = err.message;
    await teardown(id).catch(() => {});
    throw err;
  }
  return statusOf(id);
}

function statusOf(id) {
  const r = labs.get(id);
  if (!r) return { state: 'stopped', endpoints: [] };
  return {
    state: r.state,
    endpoints: r.endpoints,
    expiresAt: new Date(r.expiresAt).toISOString(),
    error: r.error,
  };
}

async function teardown(id) {
  const r = labs.get(id);
  if (!r) return;
  r.state = 'stopping';
  for (const container of r.containers.values()) {
    try { await container.remove({ force: true }); } catch { /* already gone */ }
  }
  if (r.network) {
    try { await r.network.remove(); } catch { /* already gone */ }
  }
  labs.delete(id);
}

async function reap() {
  const now = Date.now();
  for (const [id, r] of labs) {
    if (r.expiresAt <= now) {
      await teardown(id).catch(() => {});
    }
  }
}

/**
 * On boot, adopt any orphaned lab stacks left by a previous run (labelled
 * containers/networks) and remove them, so a restart starts clean.
 */
async function reconcileOnBoot() {
  try {
    const containers = await docker.listContainers({ all: true, filters: { label: [LABEL_NS] } });
    for (const c of containers) {
      try { await docker.getContainer(c.Id).remove({ force: true }); } catch { /* */ }
    }
    const networks = await docker.listNetworks({ filters: { label: [LABEL_NS] } });
    for (const n of networks) {
      try { await docker.getNetwork(n.Id).remove(); } catch { /* */ }
    }
  } catch (err) {
    console.error('boot reconcile skipped:', err.message);
  }
}

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, running: labs.size, capacity: MAX_LABS });
  }

  // Every other endpoint requires the shared token.
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(res, 401, { error: 'unauthorized' });
  }

  try {
    if (req.method === 'POST' && url.pathname === '/labs') {
      const body = await readBody(req);
      const result = await spawn(body);
      return send(res, 200, result);
    }
    if (req.method === 'POST' && url.pathname === '/labs/status') {
      const { id } = await readBody(req);
      return send(res, 200, statusOf(id));
    }
    if (req.method === 'POST' && url.pathname === '/labs/stop') {
      const { id } = await readBody(req);
      await teardown(id);
      return send(res, 200, { state: 'stopped' });
    }
    if (req.method === 'POST' && url.pathname === '/labs/extend') {
      const { id, minutes = 30 } = await readBody(req);
      const r = labs.get(id);
      if (r) r.expiresAt += minutes * 60_000;
      return send(res, 200, statusOf(id));
    }
    return send(res, 404, { error: 'not found' });
  } catch (err) {
    return send(res, 500, { error: err.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  reconcileOnBoot().then(() => {
    setInterval(() => reap().catch((e) => console.error('reap error', e)), REAP_INTERVAL_MS);
    server.listen(PORT, () => console.log(`OTF orchestrator listening on :${PORT}`));
  });
}

export { spawn, teardown, statusOf, reap, labs, server, hostConfigFor };
