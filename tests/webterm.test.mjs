/** Web terminal engine: scenarios are solvable and reveal flags only on success. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, runCommand, tick, asciiToRegisters, registersToAscii } from '../src/lib/webterm/engine.mjs';

test('register ASCII pack/unpack round-trips a flag', () => {
  const flag = 'OTF{851a232cfbc3ffdade8a38cc}';
  // 16 regs = 32 bytes; the flag is 29, so trailing pad bytes render as dots.
  assert.ok(registersToAscii(asciiToRegisters(flag, 16)).startsWith(flag));
  // Exactly-sized packing round-trips cleanly.
  assert.equal(registersToAscii(asciiToRegisters('ABCD', 2)), 'ABCD');
});

test('modbus-101: the flag is readable past the polled block, and nmap fingerprints the device', () => {
  const w = createWorld('modbus-101', { flags: { 'reg-flag': 'OTF{unit-test-flag-01}' } });
  const scan = runCommand(w, 'nmap -p502 --script modbus-discover 10.13.37.10');
  assert.ok(scan.lines.some((l) => l.includes('OTF Clearwater RTU')));
  const read = runCommand(w, 'modbus read plc.lab holding 32 16');
  assert.ok(read.lines.some((l) => l.includes('OTF{unit-test-flag-01}')));
});

test('clearwater: overflow reveals the flag ONLY after the tank physically overflows', () => {
  const w = createWorld('clearwater', {
    flags: { 'overflow': 'OTF{ovf}', 'pump-forced': 'OTF{pf}' },
  });
  // Before doing anything, the flag registers are empty.
  let early = runCommand(w, 'modbus read plc.lab holding 40 16');
  assert.ok(!early.lines.some((l) => l.includes('OTF{ovf}')));
  // Raise the setpoint and let the sim run.
  runCommand(w, 'modbus write plc.lab holding 10 127');
  let overflowed = false;
  for (let i = 0; i < 60; i++) { tick(w); if (w.sim.overflowed) { overflowed = true; break; } }
  assert.ok(overflowed, 'tank should overflow when setpoint is raised');
  const read = runCommand(w, 'modbus read plc.lab holding 40 16');
  assert.ok(read.lines.some((l) => l.includes('OTF{ovf}')));
});

test('clearwater: read-only tables reject writes', () => {
  const w = createWorld('clearwater', { flags: {} });
  const r = runCommand(w, 'modbus write plc.lab input 2 0');
  assert.ok(r.lines[0].includes('read-only'));
});

test('blackout-2015: opening the breaker coil trips the feeder and releases the flag', () => {
  const w = createWorld('blackout-2015', { flags: { 'trip': 'OTF{dark}' } });
  const r = runCommand(w, 'modbus write rtu-sub7.grid coil 3 0');
  assert.equal(r.lines[0].includes('OK'), true);
  assert.ok(w.alerts.some((a) => a.includes('OTF{dark}')), 'trip should reveal the flag');
  assert.equal(w.sim.opened, true);
});

test('unknown commands and unknown scenarios are handled gracefully', () => {
  const w = createWorld('modbus-101', { flags: {} });
  assert.ok(runCommand(w, 'sudo rm -rf /').lines[0].includes('not recognized'));
  assert.throws(() => createWorld('does-not-exist', {}));
});
