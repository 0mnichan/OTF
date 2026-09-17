---
title: The protocols that run the world
questions:
  - ref: modbus-auth
    prompt: >-
      How does standard Modbus/TCP authenticate a client before honouring a
      write request?
    kind: choice
    options:
      - A shared secret negotiated at connection time
      - Per-function-code access control lists
      - It does not authenticate at all
      - TLS client certificates
    correct: 2
    points: 15
    explain: >-
      It does not. Modbus has no authentication, no authorisation, and no
      encryption. Any host that can reach TCP/502 can read or write any register
      it likes. This is not a vulnerability to be patched - it is the protocol.
      Security has to come from the network around it.
  - ref: modbus-port
    prompt: "What TCP port does Modbus/TCP use?"
    kind: numeric
    value: 502
    points: 10
  - ref: s7-port
    prompt: "Siemens S7comm (ISO-on-TCP) listens on which TCP port?"
    kind: numeric
    value: 102
    points: 10
  - ref: dnp3-domain
    prompt: >-
      DNP3 and IEC 60870-5-104 are most associated with which industry?
    kind: choice
    options:
      - Automotive manufacturing
      - Electric power and water utilities
      - Pharmaceutical batch production
      - Building HVAC
    correct: 1
    points: 10
    explain: >-
      DNP3 dominates North American electric and water utilities; IEC-104 plays
      the same role across Europe and much of Asia. Both are SCADA telemetry
      protocols built for wide-area links to remote substations and pump stations.
  - ref: match-protocol
    prompt: >-
      You capture traffic to TCP/44818 and UDP/2222 between a controller and an
      HMI. Which protocol family is this?
    kind: regex
    pattern: "ethernet[ /-]?ip|enip|cip"
    points: 15
    placeholder: "protocol name"
    explain: >-
      EtherNet/IP (CIP over Ethernet), common on Rockwell/Allen-Bradley gear.
      TCP/44818 carries explicit messaging; UDP/2222 carries the cyclic I/O
      (implicit) traffic. Recognising a protocol from its ports is a core recon
      skill on the plant floor.
---

If you learn one thing from this induction, learn this: **the protocols that run
the physical world were designed for isolated, trusted networks, and most of them
have no security at all.** That is not negligence. It is a design that was correct
for a serial cable in a locked room in 1979 and became catastrophic the moment
someone bridged it to Ethernet.

## Modbus - the lingua franca

Modbus is the oldest and most widespread industrial protocol still in daily use.
It is beautifully, terrifyingly simple.

- Data lives in four spaces: **coils** (read/write bits), **discrete inputs**
  (read-only bits), **input registers** (read-only 16-bit words), and **holding
  registers** (read/write 16-bit words).
- You interact through **function codes**: read holding registers (3), write
  single register (6), write multiple registers (16), and so on.
- There is **no authentication**, **no authorisation**, and **no encryption**.
  If you can open a socket to port **502**, you can read and write anything.

There is nothing to bypass. `write_single_register(unit=1, address=40001,
value=9999)` is a valid, in-spec request. Whether that register is a cosmetic
display value or a pump-speed setpoint is not something the protocol knows or
cares about. Finding out which is the whole game - and the *Modbus 101* and
*Clearwater* rooms are where you learn to.

## Siemens S7comm

The native protocol of Siemens S7 PLCs, riding on ISO-on-TCP at port **102**.
Richer than Modbus - it can start and stop the CPU, upload and download blocks,
read and write memory areas. Older variants have no real authentication; newer
ones added it, with a mixed track record. Stuxnet spoke S7comm to reprogram the
controllers driving Iran's centrifuges.

## DNP3 and IEC 60870-5-104

The SCADA telemetry protocols of the utilities world - electricity and water.
Built for a master station polling hundreds of remote outstations over slow,
lossy, wide-area links.

They carry more structure than Modbus: time-stamped events, quality flags,
report-by-exception so a remote site can volunteer "breaker 3 just opened" rather
than waiting to be asked. DNP3 rules North America; **IEC-104** rules Europe and
much of Asia. Secure Authentication extensions exist for DNP3; deployment is
patchy. The *Silent Substation* room is built on IEC-104.

## EtherNet/IP and CIP

Rockwell/Allen-Bradley's world. CIP (Common Industrial Protocol) carried over
Ethernet. **TCP/44818** for explicit request/response messaging, **UDP/2222**
for the cyclic implicit I/O that streams between devices. Recognising it from
those ports is half of identifying an Allen-Bradley cell on sight.

## OPC UA - the modern exception

The one protocol in this list designed in this century with security in mind.
OPC UA has authentication, encryption, and signing built in - when they are
turned on. In the field they are frequently turned off "to get it working", which
is its own kind of lesson.

## The pattern

Look back over the list. Almost every weakness is the same weakness: a protocol
that trusts anyone who can reach it, deployed on a network that no longer
deserves that trust. You will spend the rest of this platform exploiting that one
idea in a dozen different costumes.

Onward to the plant floor.
