# Blue-team analyst workstation for forensics/detection rooms.
FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip tshark tcpdump suricata zeek-common \
      curl vim less jq ca-certificates \
    && rm -rf /var/lib/apt/lists/* || \
    (apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip tshark tcpdump curl vim less jq ca-certificates \
     && rm -rf /var/lib/apt/lists/*)
ARG TTYD_VERSION=1.7.4
RUN curl -fsSL -o /usr/local/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64" \
    && chmod +x /usr/local/bin/ttyd
COPY grader/ /grader/
RUN useradd -m -s /bin/bash analyst && \
    mkdir -p /home/analyst/artifacts /home/analyst/work && \
    printf '#!/usr/bin/env bash\npython3 /grader/grade.py\n' > /usr/local/bin/grade && \
    chmod +x /usr/local/bin/grade && \
    chown -R analyst:analyst /home/analyst
# The room's incident capture and the held-out grading captures are mounted or
# baked at build time by infra/build-labs.sh.
WORKDIR /home/analyst
USER analyst
EXPOSE 7681
CMD ["ttyd", "-p", "7681", "-W", "-t", "titleFixed=OTF analyst", "bash"]
