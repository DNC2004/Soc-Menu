@echo off
powershell -ExecutionPolicy Bypass - WindowsStyle Hidden - Command "Write-Host test"

@echo off
mkdir generated_files

for /L %%i in (1,1,100) do (
    echo Test file %%i > generated_files\file_%%i.txt
)

