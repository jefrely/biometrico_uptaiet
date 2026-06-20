<#
Starts the Django backend in the background without showing a console window.
Uses WScript.Shell COM for reliable process launch on Windows.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Resolve-Path -Path (Join-Path $scriptDir '..\venv\Scripts\python.exe')
$managePy = Resolve-Path -Path (Join-Path $scriptDir 'manage.py')

# Use WScript.Shell COM - the reliable Windows way
$shell = New-Object -ComObject WScript.Shell
$command = "`"$pythonExe`" `"$managePy`" runserver 0.0.0.0:8000"

# 0 = Hidden window, False = Wait
$shell.Run($command, 0, $false)
