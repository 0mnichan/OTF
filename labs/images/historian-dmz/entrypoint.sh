#!/usr/bin/env bash
set -e
useradd -m -s /bin/bash svc_hist 2>/dev/null || true
echo "svc_hist:Spring2021!Hist" | chpasswd
# The historian flag (per-user, injected by the orchestrator as OTF_FLAG).
echo "${OTF_FLAG:-OTF{historian-default}}" > /home/svc_hist/flag.txt
chown svc_hist:svc_hist /home/svc_hist/flag.txt
# A remote-support runbook the historian admin left behind — the EWS pivot.
cat > /home/svc_hist/REMOTE_SUPPORT.txt <<NOTE
Vendor remote support for the plant EWS (ews.plant / 10.40.2.30):
  ssh support@ews.plant   (temporary commissioning account, password: support)
  Remember to disable this after go-live.   [it was never disabled]
NOTE
chown svc_hist:svc_hist /home/svc_hist/REMOTE_SUPPORT.txt
mkdir -p /run/sshd
exec /usr/sbin/sshd -D -e
