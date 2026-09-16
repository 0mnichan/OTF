#!/usr/bin/env bash
#
# Build every OTF lab image locally. The orchestrator loads images by name from
# the local Docker daemon (it never pulls from a registry), so this must run on
# the host that will run labs before any room's lab can spawn.
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building sim-core base image"
docker build -t otf/sim-core:latest labs/base/sim-core

echo "==> Building attacker + analyst shells"
docker build -t otf/attacker-shell:latest labs/base/attacker-shell
docker build -t otf/analyst-shell:latest labs/images/analyst-shell

echo "==> Generating room artifacts (PCAPs, grader captures)"
python3 labs/generators/gen_modbus_101.py content/rooms/modbus-101/artifacts/plant-poll.pcap
python3 labs/generators/gen_substation.py content/rooms/silent-substation/artifacts/substation-incident.pcap
python3 labs/generators/gen_grader_captures.py labs/images/analyst-shell/grader/captures

echo "==> Building PLC / HMI images"
for img in modbus-plc clearwater-plc clearwater-hmi bottling-plc meridian-plc; do
  echo "    - otf/$img"
  docker build -t "otf/$img:latest" "labs/images/$img"
done

echo "==> Building Bridgehead pivot hosts"
for img in foothold-workstation historian-dmz engineering-workstation; do
  echo "    - otf/$img"
  docker build -t "otf/$img:latest" "labs/images/$img"
done

echo "==> Done. Images:"
docker images --filter=reference='otf/*' --format '    {{.Repository}}:{{.Tag}}  {{.Size}}'
