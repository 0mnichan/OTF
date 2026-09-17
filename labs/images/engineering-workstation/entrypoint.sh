#!/usr/bin/env bash
set -e
useradd -m -s /bin/bash support 2>/dev/null || true
echo "support:support" | chpasswd
echo "${OTF_FLAG:-OTF{ews-default}}" > /home/support/flag.txt
# The reactor project's tag table - the authoritative register map.
cat > /home/support/reactor_project.tags <<TAGS
# Meridian Reactor R-1 - controller tag map (exported from project)
# tag                 modbus                comment
REACTOR_TEMP_PV       IR:4                  measured temperature (deg C)
REACTOR_TEMP_SP       HR:30                 temperature setpoint  [operators set this]
REACTOR_TEMP_RPT      HR:34                 value reported to historian/HMI
TRIP_ACTIVE           DI:1                  SIS trip status
# PLC: plc.plant (10.40.1.10:502), also speaks S7comm on 102
TAGS
chown -R support:support /home/support
mkdir -p /run/sshd
exec /usr/sbin/sshd -D -e
