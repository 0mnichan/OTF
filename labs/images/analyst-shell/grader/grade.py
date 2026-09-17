#!/usr/bin/env python3
"""
Silent Substation detection grader.

Replays a set of held-out captures - benign polling sessions and attack variants
- against the player's detection logic and scores it the way a SOC would: full
detection with zero false positives, or it does not ship.

To keep the grader self-contained and deterministic, "the player's rule" is
evaluated by extracting its intent from ~/work/detect.rules: which IEC-104
command TypeIDs it alerts on, and which source addresses it treats as sanctioned
masters (excluded). This models a Suricata/Zeek rule faithfully for the shapes
this room teaches, without shipping a full IDS in the lab image.
"""
import os
import re
import sys
import struct
import glob

WORK = os.path.expanduser("~/work/detect.rules")
CAPTURE_DIR = os.environ.get("OTF_GRADE_CAPTURES", "/grader/captures")
FLAG = os.environ.get("OTF_FLAG", "OTF{grader-default}")

COMMAND_TYPEIDS = set(range(45, 52))  # C_* command TypeIDs
LEGIT_MASTERS = {"10.20.0.5"}          # the sanctioned control centre


def parse_rule(path):
    """Extract alert intent: command TypeIDs targeted, sources excluded."""
    if not os.path.exists(path):
        return None
    text = open(path).read()
    excluded = set(re.findall(r"(\d+\.\d+\.\d+\.\d+)", text))
    # Heuristic: does the rule scope to command traffic and exclude known masters?
    keys_commands = bool(
        re.search(r"typeid|c_sc|command|4[5-9]|5[01]|\|2d\||negati", text, re.I)
    )
    negates_source = bool(re.search(r"!\s*\$?\w*master|!\[?\d+\.\d+\.\d+\.\d+", text)) \
        or any(m in text for m in LEGIT_MASTERS)
    return {"excluded": excluded, "keys_commands": keys_commands, "negates_source": negates_source}


def read_capture_commands(path):
    """Return (src_ip, typeid) for each IEC-104 command APDU in a capture."""
    with open(path, "rb") as f:
        data = f.read()
    off = 24
    out = []
    while off + 16 <= len(data):
        _, _, caplen, _ = struct.unpack("<IIII", data[off:off + 16])
        off += 16
        frame = data[off:off + caplen]
        off += caplen
        if len(frame) < 54:
            continue
        src = ".".join(str(b) for b in frame[26:30])
        ihl = (frame[14] & 0x0F) * 4
        tcp_off = 14 + ihl
        doff = (frame[tcp_off + 12] >> 4) * 4
        payload = frame[tcp_off + doff:]
        if len(payload) >= 7 and payload[0] == 0x68:
            typ = payload[6]
            if typ in COMMAND_TYPEIDS:
                out.append((src, typ))
    return out


def rule_fires(rule, commands):
    """Does the modelled rule raise at least one alert on these commands?"""
    for src, _typ in commands:
        if src in rule["excluded"] or (rule["negates_source"] and src in LEGIT_MASTERS):
            continue
        if rule["keys_commands"]:
            return True
    return False


def main():
    rule = parse_rule(WORK)
    if rule is None:
        print("No rule found at ~/work/detect.rules. Write your detection there.")
        sys.exit(1)

    captures = sorted(glob.glob(os.path.join(CAPTURE_DIR, "*.pcap")))
    if not captures:
        print("No grading captures found.")
        sys.exit(2)

    tp = fp = fn = tn = 0
    for cap in captures:
        malicious = "attack" in os.path.basename(cap)
        commands = read_capture_commands(cap)
        fired = rule_fires(rule, commands)
        label = "attack" if malicious else "benign"
        verdict = "ALERT" if fired else "quiet"
        ok = (fired == malicious)
        if malicious and fired: tp += 1
        elif malicious and not fired: fn += 1
        elif not malicious and fired: fp += 1
        else: tn += 1
        print(f"  [{ 'OK ' if ok else 'XX ' }] {os.path.basename(cap):28} {label:7} -> {verdict}")

    print(f"\n  true positives  {tp}\n  false positives {fp}\n  false negatives {fn}\n  true negatives  {tn}")
    if fn == 0 and fp == 0 and tp > 0:
        print(f"\n✓ Full detection, zero false positives. Your flag:\n\n    {FLAG}\n")
        sys.exit(0)
    if fp > 0:
        print("\n✗ False positives: your rule alerts on legitimate command traffic. "
              "Exclude the sanctioned masters.")
    if fn > 0:
        print("\n✗ Missed attacks: your rule stayed quiet on a real intrusion. "
              "Make sure you key on the command TypeIDs from an unsanctioned source.")
    sys.exit(1)


if __name__ == "__main__":
    main()
