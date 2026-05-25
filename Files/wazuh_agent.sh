#!/bin/bash

set -e

echo "[1/5] Installing prerequisites..."
apt update && apt install curl gnupg apt-transport-https -y

echo "[2/5] Adding Wazuh GPG key..."
rm -f /usr/share/keyrings/wazuh.gpg

curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg

chmod 644 /usr/share/keyrings/wazuh.gpg

echo "[3/5] Adding Wazuh repository..."
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" > /etc/apt/sources.list.d/wazuh.list

cat /etc/apt/sources.list.d/wazuh.list

echo "[4/5] Installing Wazuh agent..."
WAZUH_MANAGER="192.168.1.x" WAZUH_AGENT_NAME="labCyber-$(hostname)" apt install wazuh-agent -y

echo "[5/5] Enabling and starting service..."
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent
systemctl status wazuh-agent