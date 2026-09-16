#!/usr/bin/env bash
set -e
# Plant the "saved connection profile" an engineer would leave behind. The
# password here is what lets the player pivot to the historian.
mkdir -p /home/operator/.config/histclient
cat > /home/operator/.config/histclient/connection.ini <<PROFILE
; PI/historian client — saved connection (do not commit real creds like this!)
[historian.dmz]
host = 172.16.8.20
user = svc_hist
password = Spring2021!Hist
port = 22
PROFILE
chown -R operator:operator /home/operator/.config
exec ttyd -p 7681 -W -t titleFixed="WIN-ENG01 (Level 4)" bash
