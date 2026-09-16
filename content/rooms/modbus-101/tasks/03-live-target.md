---
title: Interrogate the live target
questions:
  - ref: device-id
    prompt: >-
      Use the Modbus device identification request (FC 43 / MEI type 14) or the
      nmap modbus-discover script against plc.lab. What product name string does
      the device report?
    kind: static
    answer: OTF Clearwater RTU
    case_sensitive: false
    points: 20
    hints:
      - body: "Try: nmap -p502 --script modbus-discover plc.lab"
        cost: 5
      - body: >-
          With pymodbus: use ReadDeviceInformationRequest, or the modbus-cli
          equivalent. The product name lands in object 0x01/0x02 of the response.
        cost: 8
    explain: >-
      FC 43 (Read Device Identification) is the Modbus equivalent of a service
      banner. Many devices answer it happily to any client, handing you vendor,
      product and revision — a free and reliable fingerprint.
  - ref: level-register
    prompt: >-
      One holding register updates continuously and tracks a value between 0 and
      100. Which register address holds the live tank level? (decimal, wire address)
    kind: numeric
    value: 7
    points: 15
    hints:
      - body: >-
          Poll a block and watch which value moves on its own. `modbus read
          plc.lab 0 20` a few times, or a short pymodbus loop.
        cost: 5
    explain: >-
      Register 7 changes every scan as the simulated level rises and falls. A
      value that moves on its own, bounded to a sensible engineering range, is a
      live process variable — one of the most useful things to identify early.
  - ref: reg-flag
    prompt: >-
      Read the block of holding registers past where the HMI polls. Several
      registers hold ASCII bytes that spell out a flag when decoded. Submit it.
    kind: dynamic
    flag_prefix: OTF
    points: 25
    hints:
      - body: >-
          The HMI only reads registers 0-15. Keep reading past 16. Two bytes per
          register, big-endian, decode as ASCII.
        cost: 6
      - body: >-
          In pymodbus, read holding registers 32..48, then for each 16-bit word
          do `struct.pack('>H', word)` and join the bytes. The printable run is
          your flag.
        cost: 10
    explain: >-
      Data left in registers the HMI never displays is invisible to the
      operator but perfectly readable to anyone who keeps scanning. Here it is a
      flag; on a real device it might be a firmware string, a serial number, or a
      hardcoded credential. The lesson — never assume 'the screen only shows X'
      means 'the device only exposes X' — is why enumeration goes past the
      obvious block. Each player's flag is unique to their session.
---

Now the live device. Your lab has a Modbus/TCP target at **plc.lab
(10.13.37.10:502)** and an attacker shell with the tools to talk to it. Spawn the
lab from the panel on the right and open the terminal.

## Fingerprint it

Never start by writing. Start by asking the device what it is:

```bash
# nmap's Modbus discovery script
nmap -p 502 --script modbus-discover --script-args='modbus-discover.aggressive=true' plc.lab

# or with pymodbus, a device identification request
python3 - <<'PY'
from pymodbus.client import ModbusTcpClient
c = ModbusTcpClient('plc.lab', port=502)
c.connect()
print(c.read_device_information())
c.close()
PY
```

## Map the register space

Sweep the readable registers and watch for movement:

```bash
python3 - <<'PY'
from pymodbus.client import ModbusTcpClient
import time
c = ModbusTcpClient('plc.lab', port=502); c.connect()
for _ in range(5):
    rr = c.read_holding_registers(address=0, count=48)
    print(rr.registers)
    time.sleep(1)
c.close()
PY
```

Registers that change on their own are process variables. Registers that sit
still are configuration, setpoints — or, sometimes, data somebody forgot was
reachable.

## Read past the edge

The HMI polls registers 0–15. That is the *displayed* register space, not the
*exposed* one. Keep reading. Two bytes per register, decode as ASCII, and watch
for a printable run.

The flag you recover is unique to your session — it will not validate for anyone
else, and if it turns up on another account we will know exactly whose it was.
That is not a threat so much as a design demonstration: per-user flags are how a
CTF platform makes answer-sharing pointless.
