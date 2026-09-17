/**
 * Browser OT lab - a simulated console + process world, in pure JS.
 *
 * This replaces the Docker labs for web-only play. Each room names a scenario;
 * the room page injects the player's per-user flags, and the simulated devices
 * reveal those exact flags only when the objective is genuinely reached - same
 * "physical-consequence flag" idea as the container labs, but entirely
 * client-side. No secret ever ships to the browser: the flag is the player's
 * own, computed server-side and handed in as the reward for solving.
 *
 * Everything here is deterministic and free of DOM/React so it unit-tests.
 */

/* ------------------------------------------------------------------ helpers */

/** Pack an ASCII string into `count` big-endian 16-bit registers. */
export function asciiToRegisters(text, count) {
  const bytes = new TextEncoder().encode(text);
  const regs = [];
  for (let i = 0; i < count; i++) {
    const hi = bytes[i * 2] ?? 0;
    const lo = bytes[i * 2 + 1] ?? 0;
    regs.push((hi << 8) | lo);
  }
  return regs;
}

/** Decode registers back to a printable string (the ASCII gutter). */
export function registersToAscii(regs) {
  let out = '';
  for (const r of regs) {
    const hi = (r >> 8) & 0xff;
    const lo = r & 0xff;
    out += hi >= 32 && hi < 127 ? String.fromCharCode(hi) : '.';
    out += lo >= 32 && lo < 127 ? String.fromCharCode(lo) : '.';
  }
  return out;
}

function blankDevice(sizes = {}) {
  const s = { holding: 64, input: 32, coil: 32, discrete: 32, ...sizes };
  return {
    holding: new Array(s.holding).fill(0),
    input: new Array(s.input).fill(0),
    coil: new Array(s.coil).fill(0),
    discrete: new Array(s.discrete).fill(0),
  };
}

/* --------------------------------------------------------------- scenarios */
/*
 * A scenario builder returns the initial world. Reward flags arrive via
 * `flags` keyed by the question's qualified ref (e.g. "modbus-101.reg-flag").
 */

const SCENARIOS = {
  /* Modbus 101 - a single PLC with a flag hidden past the polled block. */
  'modbus-101'(flags) {
    const dev = blankDevice();
    dev.input[7] = 50;
    // Seed the visible poll block with plausible values.
    [50, 60, 1, 0, 100, 42, 7, 3].forEach((v, i) => (dev.holding[i] = v));
    // The flag lives in registers 32.. where the HMI never looks.
    const flag = flags['reg-flag'] ?? 'OTF{demo-flag}';
    asciiToRegisters(flag, 16).forEach((r, i) => (dev.holding[32 + i] = r));
    return {
      prompt: 'C:\\OT\\ops>',
      self: '10.13.37.5',
      hosts: [
        { ip: '10.13.37.10', name: 'plc.lab', device: 'OTF Clearwater RTU',
          ports: [502], modbus: dev },
      ],
      files: {
        'readme.txt':
          'Field notes: the HMI on this segment only polls holding registers 0-15.\r\n' +
          'Vendor docs say the device exposes more than it displays. Enumerate past the edge.',
      },
      sim: { type: 'static' },
      objectives: [],
    };
  },

  /* Clearwater - a live tank you flood by commandeering the control loop. */
  clearwater(flags) {
    const dev = blankDevice();
    dev.holding[10] = 60;   // setpoint
    dev.holding[12] = 95;   // high-high alarm threshold
    dev.input[2] = 60;      // measured level
    dev.coil[1] = 0;        // pump
    return {
      prompt: 'C:\\OT\\ops>',
      self: '10.13.37.5',
      hosts: [
        { ip: '10.13.37.20', name: 'plc.lab', device: 'OTF Clearwater RTU',
          ports: [502], modbus: dev },
        { ip: '10.13.37.30', name: 'hmi.lab', device: 'Clearwater HMI', ports: [80] },
      ],
      files: {
        'process.txt':
          'Clarifier T-101. Setpoint 60%. High-high alarm 95%. Overflow weir 110%.\r\n' +
          'Inlet pump is PLC-controlled to hold setpoint. Outflow is gravity, ~constant.',
      },
      sim: {
        type: 'tank',
        level: 60, pumpOn: false, peak: 60, overflowed: false,
        alarmLatched: false,
        flags: {
          pump: flags['pump-forced'] ?? 'OTF{demo-pump}',
          overflow: flags['overflow'] ?? 'OTF{demo-overflow}',
        },
        witnessAt: 80,
      },
      objectives: [],
    };
  },

  /* Blackout '15 - recreate the substation breaker-trip over a control link. */
  'blackout-2015'(flags) {
    const dev = blankDevice();
    dev.coil[3] = 1;        // breaker CB-1 closed (1 = closed)
    dev.holding[1] = 1;     // remote-control enabled
    return {
      prompt: 'C:\\OT\\ops>',
      self: '10.20.0.50',
      hosts: [
        { ip: '10.20.0.10', name: 'rtu-sub7.grid', device: 'OTF Feeder RTU (IEC-104/Modbus bridge)',
          ports: [502, 2404], modbus: dev },
      ],
      files: {
        'engineer_notes.txt':
          'Substation 7, feeder CB-1. Coil 3 = breaker (1 closed / 0 open).\r\n' +
          'HMI credentials were reused from the corporate VPN. Remote operate is enabled (HR1=1).',
      },
      sim: {
        type: 'breaker',
        opened: false,
        flag: flags['trip'] ?? 'OTF{demo-trip}',
      },
      objectives: [],
    };
  },

  /* Stuxnet - overspeed a centrifuge while the reported value lies (false view). */
  stuxnet(flags) {
    const dev = blankDevice();
    dev.holding[10] = 1064;   // commanded drive frequency (Hz), nominal
    dev.holding[11] = 1064;   // REPORTED frequency shown to the operator (frozen by malware)
    dev.input[2] = 1064;      // TRUE rotor frequency (tells the truth)
    return {
      prompt: 'C:\\WINCC>',
      self: '10.0.7.44',
      hosts: [
        { ip: '10.0.7.10', name: 's7-417.cascade', device: 'OTF SIMATIC S7-417 (centrifuge drive)',
          ports: [102, 502], modbus: dev },
      ],
      files: {
        'cascade.txt':
          'Enrichment cascade A-21. Nominal rotor 1064 Hz. Safe band 1000-1200 Hz.\r\n' +
          'Holding[10] = commanded drive frequency. Holding[11] = frequency reported to WinCC.\r\n' +
          'Input[2] = true measured rotor frequency. The reported value is frozen by the\r\n' +
          'installed logic, so the operator sees 1064 no matter what the rotor does.',
      },
      sim: {
        type: 'centrifuge', true_freq: 1064, damageTicks: 0, damaged: false,
        flag: flags['sabotage'] ?? 'OTF{demo-centrifuge}',
      },
      objectives: [],
    };
  },

  /* TRITON - defeat a Safety Instrumented System left in PROGRAM mode. */
  triton(flags) {
    const dev = blankDevice();
    dev.holding[1] = 1;       // key switch: 1 = PROGRAM (unsafe, changeable), 0 = RUN (locked)
    dev.coil[5] = 1;          // trip enabled (the safety function)
    dev.holding[10] = 40;     // process pressure setpoint (barg)
    dev.input[3] = 40;        // measured pressure
    return {
      prompt: 'C:\\TRISTATION>',
      self: '10.30.1.77',
      hosts: [
        { ip: '10.30.1.20', name: 'sis-tricon.plant', device: 'OTF Triconex SIS (safety controller)',
          ports: [502, 1502], modbus: dev },
      ],
      files: {
        'sis_notes.txt':
          'Reactor safety controller. Coil 5 = high-pressure trip function (1 enabled).\r\n' +
          'Holding[1] = key switch: 1 PROGRAM / 0 RUN. Safety logic can only be changed in\r\n' +
          'PROGRAM. The key was left in PROGRAM after maintenance. Trip point is 100 barg.\r\n' +
          'Holding[10] = pressure setpoint. Input[3] = measured pressure.',
      },
      sim: {
        type: 'sis', pressure: 40, tripPoint: 100, unsafePoint: 115, tripped: false, defeated: false,
        flag: flags['defeat-sis'] ?? 'OTF{demo-sis}',
      },
      objectives: [],
    };
  },
};

export function scenarioExists(id) {
  return Object.prototype.hasOwnProperty.call(SCENARIOS, id);
}

export function createWorld(scenarioId, { flags = {} } = {}) {
  const build = SCENARIOS[scenarioId];
  if (!build) throw new Error(`unknown scenario: ${scenarioId}`);
  const world = build(flags);
  world.scenario = scenarioId;
  world.alerts = [];
  world.revealed = {};
  return world;
}

/* --------------------------------------------------------------- physics */

/** Advance the simulated process one tick. Returns alert lines, if any. */
export function tick(world) {
  const sim = world.sim;
  if (!sim) return;
  if (sim.type === 'tank') {
    const dev = world.hosts[0].modbus;
    const setpoint = dev.holding[10];
    const threshold = dev.holding[12];
    // Bang-bang level control drives the pump toward setpoint.
    if (sim.level < setpoint - 2) sim.pumpOn = true;
    else if (sim.level > setpoint + 2) sim.pumpOn = false;
    let delta = 0;
    if (sim.pumpOn) delta += 6;
    if (sim.level > 0) delta -= 1.6;
    sim.level = Math.max(0, sim.level + delta);
    sim.peak = Math.max(sim.peak, sim.level);
    dev.input[2] = Math.round(sim.level);
    dev.coil[1] = sim.pumpOn ? 1 : 0;
    // Alarm compares live level against the (writable) threshold.
    if (sim.level >= threshold && !sim.alarmLatched) {
      sim.alarmLatched = true;
      dev.discrete[0] = 1;
      world.alerts.push('*** PROCESS ALARM: HIGH-HIGH LEVEL on T-101 ***');
    }
    // Witness at 80%: the PLC latches a value once the level really crosses.
    if (sim.peak >= sim.witnessAt && !world.revealed.pump) {
      asciiToRegisters(sim.flags.pump, 16).forEach((r, i) => (dev.holding[20 + i] = r));
      world.revealed.pump = true;
      world.alerts.push('T-101 level exceeded 80% - witness value latched to holding[20..35].');
    }
    // Overflow at 110%: the flag is released into holding[40..].
    if (sim.level >= 110 && !sim.overflowed) {
      sim.overflowed = true;
      asciiToRegisters(sim.flags.overflow, 16).forEach((r, i) => (dev.holding[40 + i] = r));
      world.alerts.push('*** T-101 OVERFLOW - clarifier weir breached. Objective flag in holding[40..55]. ***');
    }
  } else if (sim.type === 'centrifuge') {
    const dev = world.hosts[0].modbus;
    const commanded = dev.holding[10];
    // The rotor follows the commanded frequency. The reported value (holding[11])
    // is NOT updated here: the installed malware freezes it, so the operator's
    // view lies while the true rotor (input[2]) tells the truth.
    sim.true_freq += (commanded - sim.true_freq) * 0.4;
    dev.input[2] = Math.round(sim.true_freq);
    const outOfBand = sim.true_freq > 1300 || sim.true_freq < 300;
    const reportedNormal = dev.holding[11] >= 1000 && dev.holding[11] <= 1200;
    if (outOfBand && reportedNormal) sim.damageTicks += 1;
    // Sustained overspeed with a normal-looking view destroys the rotor.
    if (sim.damageTicks >= 6 && !sim.damaged) {
      sim.damaged = true;
      asciiToRegisters(sim.flag, 16).forEach((r, i) => (dev.holding[40 + i] = r));
      world.alerts.push('*** CASCADE A-21: ROTOR FAILURE at ' + Math.round(sim.true_freq) +
        ' Hz while WinCC still reads ' + dev.holding[11] + ' Hz. Objective flag in holding[40..55]. ***');
    }
  } else if (sim.type === 'sis') {
    const dev = world.hosts[0].modbus;
    const setpoint = dev.holding[10];
    const tripEnabled = dev.coil[5] === 1;
    sim.pressure += (setpoint - sim.pressure) * 0.5;
    // With the trip enabled, the SIS vents the process at the trip point.
    if (tripEnabled && sim.pressure >= sim.tripPoint && !sim.tripped) {
      sim.pressure = sim.tripPoint - 15;
      dev.holding[10] = sim.tripPoint - 15;
      world.alerts.push('*** SIS TRIP: high pressure at ' + sim.tripPoint +
        ' barg. Process brought to a safe state. (The safety system did its job.) ***');
      sim.tripped = true;
    }
    dev.input[3] = Math.round(sim.pressure);
    // With the trip defeated, pressure sails past the danger line.
    if (!tripEnabled && sim.pressure >= sim.unsafePoint && !sim.defeated) {
      sim.defeated = true;
      asciiToRegisters(sim.flag, 16).forEach((r, i) => (dev.holding[40 + i] = r));
      world.alerts.push('*** SAFETY DEFEATED: ' + Math.round(sim.pressure) +
        ' barg with no trip. The last line of defence is gone. Objective flag in holding[40..55]. ***');
    }
  }
}

/* --------------------------------------------------------------- console */

const HELP = [
  'OT operations console - available commands:',
  '  help                       this help',
  '  cls | clear                clear the screen',
  '  whoami | hostname          who / where you are',
  '  ipconfig                   show this host\'s address',
  '  dir | ls                   list files here',
  '  type <file> | cat <file>   read a file',
  '  ping <host>                test reachability',
  '  nmap [-p PORTS] [--script modbus-discover] <host|cidr>',
  '                             scan the segment / fingerprint a device',
  '  modbus read  <host> <holding|input|coil|discrete> <addr> <count>',
  '  modbus write <host> <holding|coil> <addr> <value>',
  '                             read / write a device (no auth - that is the lesson)',
  '  status                     summarise the process, if any',
  '',
  'Tip: real Modbus has no authentication. If you can reach TCP/502, you can',
  'read and write anything. Find WHICH register matters - that is the challenge.',
];

function resolveHost(world, token) {
  if (!token) return null;
  return world.hosts.find((h) => h.ip === token || h.name === token) ?? null;
}

function ipInCidr(ip, cidr) {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const toInt = (s) => s.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(base) & mask);
}

/**
 * Execute one command line against the world. Pure: returns output lines and
 * a `clear` flag; the world is mutated in place for reads/writes.
 * @returns {{ lines: string[], clear?: boolean }}
 */
export function runCommand(world, raw) {
  const input = String(raw ?? '').trim();
  if (!input) return { lines: [] };
  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const L = (...xs) => ({ lines: xs.flat() });

  switch (cmd) {
    case 'help': case '?': case 'man':
      return L(HELP);
    case 'cls': case 'clear':
      return { lines: [], clear: true };
    case 'ver':
      return L('OT Operations Console [Version 1.0] - OTF training range');
    case 'whoami':
      return L('range\\operator');
    case 'hostname':
      return L('WS-OPS-01');
    case 'echo':
      return L(args.join(' '));
    case 'ipconfig': case 'ifconfig':
      return L(`   IPv4 Address . . . . . . . . . . : ${world.self}`,
               '   Subnet Mask  . . . . . . . . . . : 255.255.255.0');
    case 'dir': case 'ls': {
      const names = Object.keys(world.files ?? {});
      if (!names.length) return L('(no files)');
      return L('Directory of C:\\OT\\ops', '', ...names.map((n) => `   ${n}`));
    }
    case 'type': case 'cat': {
      const f = world.files?.[args[0]];
      if (f == null) return L(`The system cannot find the file: ${args[0] ?? ''}`);
      return L(f.split(/\r?\n/));
    }
    case 'ping': {
      const h = resolveHost(world, args[0]);
      if (!h) return L(`Ping request could not find host ${args[0] ?? ''}.`);
      return L(`Pinging ${h.name} [${h.ip}] with 32 bytes of data:`,
               ...[0, 1, 2].map(() => `Reply from ${h.ip}: bytes=32 time<1ms TTL=64`));
    }
    case 'status': {
      if (world.sim?.type === 'tank')
        return L(`T-101 level: ${Math.round(world.sim.level)}%  ` +
                 `setpoint: ${world.hosts[0].modbus.holding[10]}%  ` +
                 `pump: ${world.sim.pumpOn ? 'RUN' : 'STOP'}  ` +
                 `alarm: ${world.sim.alarmLatched ? 'HIGH-HIGH' : 'normal'}`);
      if (world.sim?.type === 'breaker')
        return L(`Feeder CB-1: ${world.sim.opened ? 'OPEN (de-energised)' : 'CLOSED (energised)'}`);
      if (world.sim?.type === 'centrifuge') {
        const d = world.hosts[0].modbus;
        return L(`rotor (true): ${Math.round(world.sim.true_freq)} Hz   ` +
                 `reported: ${d.holding[11]} Hz   commanded: ${d.holding[10]} Hz`);
      }
      if (world.sim?.type === 'sis') {
        const d = world.hosts[0].modbus;
        return L(`pressure: ${Math.round(world.sim.pressure)} barg   ` +
                 `trip: ${d.coil[5] ? 'ENABLED' : 'DISABLED'}   ` +
                 `key: ${d.holding[1] === 1 ? 'PROGRAM' : 'RUN'}`);
      }
      return L('No live process on this segment.');
    }
    case 'nmap':
      return nmap(world, args);
    case 'modbus': case 'mb':
      return modbus(world, args);
    default:
      return L(`'${cmd}' is not recognized as a command. Type 'help'.`);
  }
}

function nmap(world, args) {
  const target = args[args.length - 1];
  const wantDiscover = args.includes('modbus-discover');
  const lines = ['Starting Nmap scan...'];
  const matches = world.hosts.filter((h) =>
    target && (h.ip === target || h.name === target ||
      (target.includes('/') && ipInCidr(h.ip, target))));
  if (!matches.length) return { lines: [...lines, 'Note: 0 hosts up.'] };
  for (const h of matches) {
    lines.push('', `Nmap scan report for ${h.name} (${h.ip})`, 'Host is up (0.0010s latency).');
    for (const p of h.ports) {
      const svc = p === 502 ? 'mbap' : p === 2404 ? 'iec-104' : p === 80 ? 'http' : 'unknown';
      lines.push(`${p}/tcp open  ${svc}`);
    }
    if (wantDiscover && h.modbus) {
      lines.push('| modbus-discover:', `|   sid 0x1:`, `|_    Device identification: ${h.device}`);
    }
  }
  return { lines };
}

function modbus(world, args) {
  const [op, host, table, addrStr, arg4] = args;
  const h = resolveHost(world, host);
  if (!h || !h.modbus) return { lines: [`No Modbus device at ${host ?? '?'} (is 502 open? run nmap)`] };
  const tables = { holding: 'holding', hr: 'holding', input: 'input', ir: 'input',
                   coil: 'coil', co: 'coil', discrete: 'discrete', di: 'discrete' };
  const t = tables[table];
  if (!t) return { lines: ['usage: modbus read|write <host> <holding|input|coil|discrete> <addr> <count|value>'] };
  const addr = Number(addrStr);
  if (!Number.isInteger(addr)) return { lines: ['address must be an integer'] };

  if (op === 'read' || op === 'r') {
    const count = Math.max(1, Math.min(32, Number(arg4) || 1));
    const slice = h.modbus[t].slice(addr, addr + count);
    const lines = [`[${h.name}] ${t}[${addr}..${addr + count - 1}] = ${JSON.stringify(slice)}`];
    if (t === 'holding' || t === 'input') {
      const ascii = registersToAscii(slice);
      if (/[ -~]{4,}/.test(ascii)) lines.push(`  ascii: "${ascii}"`);
    }
    return { lines };
  }
  if (op === 'write' || op === 'w') {
    if (t !== 'holding' && t !== 'coil')
      return { lines: [`${t} is read-only (function code not permitted)`] };
    const val = Number(arg4);
    if (!Number.isFinite(val)) return { lines: ['value must be a number'] };
    // TRITON scenario: the SIS safety logic (trip coil) is write-protected
    // unless the key switch is in PROGRAM. This is the control TRITON abused.
    if (world.sim?.type === 'sis' && t === 'coil' && addr === 5 && h.modbus.holding[1] !== 1) {
      return { lines: ['WRITE REJECTED: key switch in RUN - safety logic is write-protected. Turn the key to PROGRAM (holding[1]=1) to change it.'] };
    }
    h.modbus[t][addr] = t === 'coil' ? (val ? 1 : 0) : (val & 0xffff);
    // Breaker scenario: opening the breaker (coil 3 -> 0) trips the feeder.
    if (world.sim?.type === 'breaker' && t === 'coil' && addr === 3 && !val && !world.sim.opened) {
      if (h.modbus.holding[1] !== 1) return { lines: ['WRITE REJECTED: remote operate disabled (HR1=0)'] };
      world.sim.opened = true;
      world.alerts.push('*** BREAKER CB-1 OPENED - feeder de-energised. Objective flag: ' + world.sim.flag + ' ***');
    }
    return { lines: [`OK: wrote ${val} to ${h.name} ${t}[${addr}]`] };
  }
  return { lines: ['usage: modbus read|write ...'] };
}
