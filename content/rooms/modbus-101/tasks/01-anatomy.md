---
title: Anatomy of a Modbus request
questions:
  - ref: coil-vs-register
    prompt: >-
      You need to read a 16-bit analogue value such as a tank level. Which
      Modbus data type holds it?
    kind: choice
    options:
      - A coil
      - A discrete input
      - A holding or input register
      - A function code
    correct: 2
    points: 10
    explain: >-
      Coils and discrete inputs are single bits (on/off). Registers are 16-bit
      words and hold anything numeric - levels, setpoints, speeds, temperatures.
  - ref: fc-write-single
    prompt: >-
      Which Modbus function code writes a single holding register?
      (give the number in decimal)
    kind: numeric
    value: 6
    points: 10
    hints:
      - body: "Read holding registers is FC 3. Writing one is the next obvious number up."
        cost: 2
    explain: >-
      FC 6 (0x06) writes one register; FC 16 (0x10) writes many. On the read
      side, FC 3 reads holding registers and FC 4 reads input registers.
  - ref: unit-id
    prompt: >-
      In a Modbus/TCP request, which single-byte field identifies which
      downstream device the request is for - originally the address of a serial
      slave behind a gateway? (two words)
    kind: regex
    pattern: "^(unit ?id|slave ?id|unit identifier)$"
    points: 15
    placeholder: "the field name"
    explain: >-
      The Unit ID (also called the Slave ID). On pure TCP devices it is often
      ignored or fixed at 1, but on a serial gateway it selects which physical
      device on the RS-485 loop the request reaches. Enumerating unit IDs is
      often the first real recon step against a Modbus gateway.
---

Before you touch the live device, understand the shape of what you are sending.
Modbus is small enough to hold entirely in your head, which is exactly why it is
worth doing so.

## The four data models

Everything a Modbus device exposes falls into one of four tables:

| Table | Access | Size | Typical use |
|---|---|---|---|
| Coils | read/write | 1 bit | Actuator on/off, pump run command |
| Discrete inputs | read only | 1 bit | Limit switch, alarm contact |
| Input registers | read only | 16-bit | Live sensor reading |
| Holding registers | read/write | 16-bit | Setpoint, configuration, control value |

The two writable tables - coils and holding registers - are where the danger
lives. A writable holding register might be a harmless display scaling factor,
or it might be the high-level alarm setpoint on a tank you are about to overflow.
The protocol will not tell you which. You have to find out.

## The function codes you will actually use

| Code | Hex | Does |
|---|---|---|
| 1 | 0x01 | Read coils |
| 2 | 0x02 | Read discrete inputs |
| 3 | 0x03 | Read holding registers |
| 4 | 0x04 | Read input registers |
| 5 | 0x05 | Write single coil |
| 6 | 0x06 | Write single register |
| 15 | 0x0F | Write multiple coils |
| 16 | 0x10 | Write multiple registers |

## The MBAP header

Modbus/TCP wraps each request in a seven-byte **MBAP** header:

```
 Transaction ID | Protocol ID | Length | Unit ID | Function code | Data ...
   2 bytes          2 bytes      2 bytes   1 byte      1 byte
```

- **Transaction ID** - echoed back so you can match responses to requests.
- **Protocol ID** - always 0 for Modbus.
- **Length** - byte count of everything after it.
- **Unit ID** - which device, behind a gateway, the request is for.

That is the entire protocol overhead. There is no session, no handshake, no
credential, no nonce. You open a TCP socket and start asking questions, and a
compliant device answers every one of them.
