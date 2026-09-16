# Shared base image for all OT simulations: the physics + Modbus runtime.
# Room-specific images copy their entrypoint on top of this.
FROM python:3.11-slim

RUN pip install --no-cache-dir "pymodbus==3.6.9" && \
    useradd -r -u 10001 sim
WORKDIR /sim
COPY physics.py modbus_runtime.py flags.py /sim/

USER sim
# Room images override CMD with their entrypoint.
CMD ["python3", "-c", "print('sim-core base image; override CMD with a room entrypoint')"]
