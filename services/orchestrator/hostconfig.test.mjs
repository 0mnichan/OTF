import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const { hostConfigFor } = await import('./server.mjs');

test('resource caps and hardening are applied', () => {
  const { hostConfig } = hostConfigFor({ cpus: 0.5, memory_mb: 256, expose: 'none' });
  assert.equal(hostConfig.Memory, 256 * 1024 * 1024);
  assert.equal(hostConfig.NanoCpus, 5e8);
  assert.deepEqual(hostConfig.CapDrop, ['ALL']);
  assert.ok(hostConfig.SecurityOpt.includes('no-new-privileges'));
  assert.equal(hostConfig.PidsLimit, 256);
});

test('terminal services publish an ephemeral host port', () => {
  const { exposed, hostConfig } = hostConfigFor({ expose: 'terminal' });
  assert.ok(exposed['7681/tcp']);
  assert.deepEqual(hostConfig.PortBindings['7681/tcp'], [{ HostPort: '' }]);
});

test('http services default to port 8080', () => {
  const { exposed } = hostConfigFor({ expose: 'http' });
  assert.ok(exposed['8080/tcp']);
});
