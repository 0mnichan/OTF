FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash nmap netcat-openbsd openssh-client curl iproute2 iputils-ping \
      python3 grep less ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ARG TTYD_VERSION=1.7.4
RUN curl -fsSL -o /usr/local/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64" \
    && chmod +x /usr/local/bin/ttyd
RUN useradd -m -s /bin/bash operator
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 7681
CMD ["/entrypoint.sh"]
