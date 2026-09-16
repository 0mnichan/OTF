# In-browser attacker shell: a ttyd terminal preloaded with OT tooling.
# Delivered to the player through Traefik; no VPN client required.
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      nmap tshark tcpdump netcat-openbsd curl iproute2 iputils-ping \
      git vim less jq ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Modbus / OT python tooling.
RUN pip3 install --no-cache-dir --break-system-packages \
      "pymodbus==3.6.9" "scapy==2.5.0" "modbus-cli==0.1.6" || \
    pip3 install --no-cache-dir --break-system-packages "pymodbus==3.6.9" "scapy==2.5.0"

# ttyd for the browser terminal.
ARG TTYD_VERSION=1.7.4
RUN curl -fsSL -o /usr/local/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64" \
    && chmod +x /usr/local/bin/ttyd

# nmap NSE modbus scripts ship with nmap; add a couple of convenience helpers.
COPY toolbox/ /opt/toolbox/
COPY motd /etc/motd
RUN useradd -m -s /bin/bash operator && \
    echo 'cat /etc/motd' >> /home/operator/.bashrc && \
    echo 'export PATH=$PATH:/opt/toolbox' >> /home/operator/.bashrc && \
    mkdir -p /home/operator/artifacts /home/operator/work && \
    chown -R operator:operator /home/operator

WORKDIR /home/operator
USER operator
EXPOSE 7681
# --writable lets the player type; -t disables auth (network isolation is the boundary).
CMD ["ttyd", "-p", "7681", "-W", "-t", "titleFixed=OTF attacker shell", "bash"]
