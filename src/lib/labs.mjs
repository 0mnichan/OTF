/**
 * Lab lifecycle from the web app's perspective.
 *
 * The web app never talks to Docker directly. It records intent in the
 * lab_instances table and delegates real container work to the orchestrator
 * service over HTTP. If no orchestrator is configured, every call degrades to
 * a clear "not available" rather than throwing, so the platform runs fine in
 * content-only mode.
 */
import { get, run, all } from './db.mjs';
import { randomToken, dynamicFlag } from './crypto.mjs';

export const MAX_CONCURRENT_PER_USER = 1;

function orchestrator() {
  return {
    url: process.env.OTF_ORCHESTRATOR_URL || '',
    token: process.env.OTF_ORCHESTRATOR_TOKEN || '',
  };
}

export function orchestratorConfigured() {
  return Boolean(orchestrator().url);
}

/** The user's current non-terminal lab for a room, if any. */
export function activeLabForRoom(userId, roomId) {
  return get(
    `SELECT * FROM lab_instances
      WHERE user_id = ? AND room_id = ?
        AND state IN ('queued','starting','running','stopping')
      ORDER BY created_at DESC LIMIT 1`,
    userId,
    roomId,
  );
}

export function anyActiveLab(userId) {
  return get(
    `SELECT * FROM lab_instances
      WHERE user_id = ? AND state IN ('queued','starting','running','stopping')
      ORDER BY created_at DESC LIMIT 1`,
    userId,
  );
}

function decode(row) {
  if (!row) return null;
  let endpoints = [];
  try { endpoints = JSON.parse(row.endpoints || '[]'); } catch { /* ignore */ }
  return {
    id: row.id, state: row.state, endpoints, error: row.error,
    created_at: row.created_at, expires_at: row.expires_at,
  };
}

/**
 * Build the environment each service container needs, including the per-user
 * flags derived for this room's dynamic questions. Injecting them at spawn is
 * what makes lab-emitted flags unique per player.
 */
function labEnvForUser(userId, room) {
  const flags = {};
  for (const q of all(
    `SELECT ref FROM questions WHERE room_id = ? AND kind = 'dynamic'`,
    room.id,
  )) {
    flags[`${room.slug}.${q.ref}`] = dynamicFlag(userId, `${room.slug}.${q.ref}`);
  }
  return flags;
}

async function callOrchestrator(path, body) {
  const { url, token } = orchestrator();
  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`orchestrator ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}

export async function startLab(userId, room) {
  if (!orchestratorConfigured()) {
    return { ok: false, error: 'Lab orchestrator is not configured on this instance.' };
  }
  const spec = room.lab_spec;
  if (!spec) return { ok: false, error: 'This room has no lab.' };

  // One lab at a time per user protects the host from being farmed for compute.
  const existingElsewhere = anyActiveLab(userId);
  if (existingElsewhere && existingElsewhere.room_id !== room.id) {
    return { ok: false, error: 'You already have a lab running for another room. Terminate it first.' };
  }
  const existing = activeLabForRoom(userId, room.id);
  if (existing) return { ok: true, instance: decode(existing) };

  const id = `lab_${randomToken(8)}`;
  const ttl = spec.ttl_minutes ?? 60;
  run(
    `INSERT INTO lab_instances (id, user_id, room_id, state, expires_at)
     VALUES (?, ?, ?, 'queued', datetime('now', ?))`,
    id,
    userId,
    room.id,
    `+${ttl} minutes`,
  );

  try {
    const result = await callOrchestrator('/labs', {
      id, userId, room: room.slug, spec, ttlMinutes: ttl,
      flags: labEnvForUser(userId, room),
    });
    run(
      `UPDATE lab_instances SET state = ?, endpoints = ? WHERE id = ?`,
      result.state ?? 'starting',
      JSON.stringify(result.endpoints ?? []),
      id,
    );
  } catch (err) {
    run(`UPDATE lab_instances SET state = 'failed', error = ? WHERE id = ?`, String(err.message).slice(0, 300), id);
    return { ok: false, error: 'Could not reach the lab orchestrator.', instance: decode(get('SELECT * FROM lab_instances WHERE id = ?', id)) };
  }
  return { ok: true, instance: decode(get('SELECT * FROM lab_instances WHERE id = ?', id)) };
}

export async function refreshLab(userId, roomId) {
  const row = activeLabForRoom(userId, roomId);
  if (!row) {
    const stopped = get(
      `SELECT * FROM lab_instances WHERE user_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT 1`,
      userId,
      roomId,
    );
    return decode(stopped);
  }
  // Ask the orchestrator for live status while the lab is provisioning/running.
  if (orchestratorConfigured() && ['queued', 'starting', 'running'].includes(row.state)) {
    try {
      const result = await callOrchestrator('/labs/status', { id: row.id });
      run(
        `UPDATE lab_instances SET state = ?, endpoints = ? WHERE id = ?`,
        result.state ?? row.state,
        JSON.stringify(result.endpoints ?? JSON.parse(row.endpoints || '[]')),
        row.id,
      );
    } catch { /* keep last-known state on a transient orchestrator error */ }
  }
  return decode(get('SELECT * FROM lab_instances WHERE id = ?', row.id));
}

export async function stopLab(userId, roomId) {
  const row = activeLabForRoom(userId, roomId);
  if (!row) return { ok: true, instance: null };
  run(`UPDATE lab_instances SET state = 'stopping' WHERE id = ?`, row.id);
  if (orchestratorConfigured()) {
    try { await callOrchestrator('/labs/stop', { id: row.id }); } catch { /* mark stopped anyway */ }
  }
  run(`UPDATE lab_instances SET state = 'stopped', stopped_at = datetime('now') WHERE id = ?`, row.id);
  return { ok: true, instance: decode(get('SELECT * FROM lab_instances WHERE id = ?', row.id)) };
}

export async function extendLab(userId, roomId, minutes = 30) {
  const row = activeLabForRoom(userId, roomId);
  if (!row) return { ok: false, error: 'No running lab to extend.' };
  run(`UPDATE lab_instances SET expires_at = datetime(expires_at, ?) WHERE id = ?`, `+${minutes} minutes`, row.id);
  if (orchestratorConfigured()) {
    try { await callOrchestrator('/labs/extend', { id: row.id, minutes }); } catch { /* db is source of truth for TTL display */ }
  }
  return { ok: true, instance: decode(get('SELECT * FROM lab_instances WHERE id = ?', row.id)) };
}
