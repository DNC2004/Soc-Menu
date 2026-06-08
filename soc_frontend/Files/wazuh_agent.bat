@echo off

set "TMPFILE=%TEMP%\wazuh-agent.msi"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"Invoke-WebRequest -Uri 'https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi' -OutFile '%TMPFILE%'"

msiexec.exe /i "%TMPFILE%" /q WAZUH_MANAGER="192.168.1.20" WAZUH_AGENT_NAME="NOME-AGENTE"

echo Installation triggered.
pause
