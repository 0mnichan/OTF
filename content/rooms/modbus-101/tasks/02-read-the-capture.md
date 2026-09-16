---
title: Read the capture
questions:
  - ref: pcap-fc
    prompt: >-
      Open the provided capture. The HMI polls the PLC on a fixed cycle. Which
      function code does that recurring poll use? (decimal)
    kind: numeric
    value: 3
    points: 10
    explain: >-
      FC 3, read holding registers — the bread-and-butter poll of almost every
      Modbus HMI. It reads a block of registers every cycle and repaints the
      screen from the response.
  - ref: pcap-start
    prompt: >-
      At what starting register address does that poll begin reading?
    kind: numeric
    value: 0
    points: 10
    hints:
      - body: >-
          In Wireshark, apply the display filter `modbus` and open a query
          frame. The Modbus/TCP dissector shows 'Reference Number' for the
          starting address.
        cost: 3
    explain: >-
      The poll reads a block starting at register 0. Watch for the difference
      between the wire address (0-based) and the documentation address
      (often 1-based, e.g. 40001) — a constant source of off-by-one confusion.
  - ref: pcap-count
    prompt: >-
      How many registers does each poll request in that block?
    kind: numeric
    value: 16
    points: 10
    explain: >-
      16 registers per poll. Knowing the size of the polled block tells you how
      much of the register map the HMI actually cares about — and, by contrast,
      which registers it never looks at. Attackers love the registers nobody
      watches.
  - ref: pcap-anomaly
    prompt: >-
      One request in the capture is not part of the HMI's normal read cycle —
      it writes a value. What function code does that write use? (decimal)
    kind: numeric
    value: 6
    points: 15
    explain: >-
      FC 6, write single register. Spotting the one write among hundreds of
      reads is exactly the kind of anomaly a Modbus-aware IDS rule is written to
      catch — a theme you will return to in the Silent Substation room.
---

Analysis before action. The capture in this task is a slice of normal traffic
between an HMI and a PLC, with one thing in it that does not belong. Your job is
to characterise the normal so the abnormal stands out.

## Getting the capture

The file `plant-poll.pcap` is available in your lab shell under
`~/artifacts/`, and attached to this room for offline analysis. Open it in
Wireshark, or on the command line:

```bash
tshark -r ~/artifacts/plant-poll.pcap -Y modbus \
  -T fields -e frame.number -e modbus.func_code -e modbus.reference_num \
  -e modbus.word_cnt
```

## What to look for

A healthy Modbus conversation is boringly regular: the same master, the same
slave, the same function code, the same register block, over and over on a fixed
interval. That regularity is a gift. Establish it precisely — which function
code, which starting address, how many registers — and anything that deviates
becomes obvious.

Somewhere in this capture, exactly one request breaks the pattern. Find the
normal first. The anomaly will find you.

> The capture is synthetic, generated specifically for this room. No real plant
> traffic is included, and the addresses are ours.
