"""
Pure process-physics models for OTF labs.

Kept dependency-free and free of any Modbus/network code so the physics can be
unit-tested directly (see tests/). The Modbus runtime imports these and exposes
their state through registers; the flag logic watches their state and emits a
flag only when the *real* simulated process reaches an objective condition.
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class TankModel:
    """
    A single gravity-drained tank with a pumped inlet - the Clearwater clarifier.

    Level is a percentage of tank height. Inflow happens only while the pump is
    commanded on; outflow is roughly constant (gravity feed) whenever there is
    water to drain. All rates are in percent-of-tank per simulation tick.
    """
    level: float = 60.0            # current measured level, %
    inflow_rate: float = 3.0       # % per tick while pump runs
    outflow_rate: float = 1.6      # % per tick, gravity drain
    pump_on: bool = False
    overflow_at: float = 110.0     # weir height; above this the tank overflows
    min_level: float = 0.0

    overflowed: bool = False       # latches true once the tank has overflowed
    peak_level: float = 60.0       # highest level reached this run

    def step(self) -> None:
        """Advance the simulation one tick."""
        delta = 0.0
        if self.pump_on:
            delta += self.inflow_rate
        if self.level > self.min_level:
            delta -= self.outflow_rate
        self.level = max(self.min_level, self.level + delta)
        self.peak_level = max(self.peak_level, self.level)
        if self.level >= self.overflow_at:
            self.overflowed = True


@dataclass
class LevelControlLogic:
    """
    The PLC's job: hold the tank near setpoint by switching the pump.

    A simple bang-bang controller with a deadband, which is exactly how a great
    many real level loops actually work. The attack surface is the setpoint:
    raise it and this logic will drive the pump to 'catch up', flooding the tank
    using the plant's own control program.
    """
    setpoint: float = 60.0
    deadband: float = 2.0

    def update(self, tank: TankModel) -> None:
        if tank.level < self.setpoint - self.deadband:
            tank.pump_on = True
        elif tank.level > self.setpoint + self.deadband:
            tank.pump_on = False
        # within the deadband: hold current pump state (hysteresis)


@dataclass
class HighHighAlarm:
    """
    Independent alarm comparison. Fires when the measured level crosses the
    threshold. The threshold is a writable value in the real device, which is
    the whole point: raise it and the alarm never fires even as the tank floods.
    """
    threshold: float = 95.0
    latched: bool = False

    def update(self, tank: TankModel) -> bool:
        if tank.level >= self.threshold:
            self.latched = True
        return self.latched


@dataclass
class ConveyorInterlock:
    """
    The Ladder Logic Autopsy model: a conveyor that must stop on a jam - unless
    the maintenance bypass defeats the interlock.
    """
    running: bool = True
    jam_detected: bool = False
    maint_bypass: bool = False
    ran_through_jam: bool = False   # latches when the interlock is defeated live

    def step(self) -> None:
        # Interlock: stop on jam, UNLESS the bypass is set (the back door).
        if self.jam_detected and not self.maint_bypass:
            self.running = False
        else:
            self.running = True
        if self.jam_detected and self.running:
            self.ran_through_jam = True


@dataclass
class ReactorModel:
    """
    Bridgehead's reactor: a heated vessel with a temperature that responds to a
    setpoint. The trip fires on the TRUE temperature; the *reported* temperature
    can be driven apart from it, which is the manipulation-of-view objective.
    """
    temperature: float = 180.0     # deg C, true process value
    reported: float = 180.0        # what the historian/HMI is told
    setpoint: float = 180.0
    trip_point: float = 260.0
    heat_rate: float = 6.0
    cool_rate: float = 2.5
    tripped: bool = False

    def step(self) -> None:
        if self.temperature < self.setpoint:
            self.temperature = min(self.setpoint, self.temperature + self.heat_rate)
        elif self.temperature > self.setpoint:
            self.temperature = max(self.setpoint, self.temperature - self.cool_rate)
        if self.temperature >= self.trip_point:
            self.tripped = True
