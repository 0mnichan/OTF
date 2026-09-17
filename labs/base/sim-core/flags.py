"""
Flag helpers shared by the lab runtimes.

The orchestrator injects each player's per-question flag into the container as
OTF_FLAG (and OTF_FLAG_<REF> for multi-flag rooms). The runtime encodes a flag
into a block of Modbus holding registers as ASCII, but only once the physical
simulation has genuinely reached the objective state. That is what makes these
flags impossible to obtain without causing the process consequence.
"""
from __future__ import annotations
import os
import struct


def flag_for(ref: str | None = None, default: str = "OTF{simulation-default-flag}") -> str:
    """Resolve the flag for a question ref from the environment."""
    if ref:
        env_key = "OTF_FLAG_" + "".join(c.upper() if c.isalnum() else "_" for c in ref)
        if env_key in os.environ:
            return os.environ[env_key]
    return os.environ.get("OTF_FLAG", default)


def ascii_to_registers(text: str, count: int) -> list[int]:
    """
    Pack an ASCII string into `count` 16-bit big-endian registers, space-padded.
    Two characters per register - the standard way strings live in Modbus.
    """
    data = text.encode("ascii", errors="replace")
    data = data[: count * 2].ljust(count * 2, b"\x00")
    return [struct.unpack(">H", data[i : i + 2])[0] for i in range(0, count * 2, 2)]


def registers_to_ascii(registers: list[int]) -> str:
    """Inverse of ascii_to_registers, for tests and tooling."""
    raw = b"".join(struct.pack(">H", r & 0xFFFF) for r in registers)
    return raw.split(b"\x00")[0].decode("ascii", errors="replace")
