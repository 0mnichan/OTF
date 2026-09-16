"""
A small Modbus/TCP runtime that exposes a physics model through registers and
emits the objective flag only when the simulated process reaches its goal.

Runs inside the lab containers. Uses pymodbus (installed in the image). The
physics itself lives in physics.py and is tested independently; this file is the
glue that a room-specific entrypoint configures.

Register/coil map is intentionally simple and documented per room in the content.
"""
from __future__ import annotations
import asyncio
import threading
import struct

from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
from pymodbus.server import StartAsyncTcpServer
from pymodbus.device import ModbusDeviceIdentification

from flags import flag_for, ascii_to_registers

FLAG_REGISTERS = 16  # holds an OTF{...} flag with room to spare


class SimRuntime:
    """
    Bridges a physics model to a Modbus datastore on a background thread.

    A room supplies:
      - a `tick(store)` callback that reads control registers/coils out of the
        store, advances the physics, and writes process values back in;
      - a device identity;
      - an optional `objective(store)` callback returning (reached: bool,
        flag_ref: str, base_register: int) so the flag is written into the store
        only once the physical objective is genuinely met.
    """

    def __init__(self, *, identity_product: str, tick, objectives=None,
                 hr=200, ir=64, co=64, di=64, tick_seconds=1.0, port=502):
        self.tick = tick
        self.objectives = objectives or []
        self.tick_seconds = tick_seconds
        self.port = port
        self._emitted = set()

        slave = ModbusSlaveContext(
            hr=ModbusSequentialDataBlock(0, [0] * hr),
            ir=ModbusSequentialDataBlock(0, [0] * ir),
            co=ModbusSequentialDataBlock(0, [0] * co),
            di=ModbusSequentialDataBlock(0, [0] * di),
        )
        self.context = ModbusServerContext(slaves=slave, single=True)

        self.identity = ModbusDeviceIdentification()
        self.identity.VendorName = "OTF"
        self.identity.ProductCode = "OTF-RTU"
        self.identity.VendorUrl = "https://otf.local"
        self.identity.ProductName = identity_product
        self.identity.ModelName = identity_product
        self.identity.MajorMinorRevision = "1.0"

    # -- store helpers (function code 3/4/1/2 map to hr/ir/co/di) --
    def get_hr(self, addr, n=1):
        return self.context[0].getValues(3, addr, n)

    def set_hr(self, addr, values):
        self.context[0].setValues(3, addr, values if isinstance(values, list) else [values])

    def get_ir(self, addr, n=1):
        return self.context[0].getValues(4, addr, n)

    def set_ir(self, addr, values):
        self.context[0].setValues(4, addr, values if isinstance(values, list) else [values])

    def get_co(self, addr, n=1):
        return self.context[0].getValues(1, addr, n)

    def set_co(self, addr, values):
        self.context[0].setValues(1, addr, values if isinstance(values, list) else [values])

    def write_flag(self, base_register, ref):
        regs = ascii_to_registers(flag_for(ref), FLAG_REGISTERS)
        self.set_hr(base_register, regs)

    def _loop(self):
        self.tick(self)
        for reached_fn, ref, base in self.objectives:
            if ref in self._emitted:
                continue
            if reached_fn(self):
                self.write_flag(base, ref)
                self._emitted.add(ref)

    async def _run(self):
        async def ticker():
            while True:
                try:
                    self._loop()
                except Exception as exc:  # keep the sim alive through a bad tick
                    print("tick error:", exc, flush=True)
                await asyncio.sleep(self.tick_seconds)

        asyncio.create_task(ticker())
        await StartAsyncTcpServer(
            context=self.context,
            identity=self.identity,
            address=("0.0.0.0", self.port),
        )

    def serve_forever(self):
        asyncio.run(self._run())
