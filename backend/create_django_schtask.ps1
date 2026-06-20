<#
Creates a scheduled task to start the Django backend at user logon.
This avoids leaving a visible terminal open for the operator.
#>

$taskName = 'UptaietDjangoBackend'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$psPath = Join-Path $scriptDir 'run_django_hidden.ps1'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$psPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description 'Inicia el backend Django de UPTAIET en segundo plano cuando el usuario inicia sesión.' -Force

Write-Host "Tarea programada $taskName creada." -ForegroundColor Green
