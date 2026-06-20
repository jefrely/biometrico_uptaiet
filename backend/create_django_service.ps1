<#
Creates a Windows service that runs the Django backend via NSSM if available.
If NSSM is not installed, the script will instruct the administrator how to install it.
#>

$serviceName = 'UptaietDjango'
$serviceDisplayName = 'UPTAIET Django Backend'
$serviceDescription = 'Servicio para iniciar el backend Django de UPTAIET en segundo plano.'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $scriptDir '..\venv\Scripts\python.exe'
$managePy = Join-Path $scriptDir 'manage.py'
$nssmPath = 'C:\Program Files\nssm\win64\nssm.exe'

if (-Not (Test-Path $nssmPath)) {
    Write-Host "NSSM no está instalado en $nssmPath. Descarga NSSM desde https://nssm.cc/download y coloca el ejecutable en esa ruta." -ForegroundColor Yellow
    return
}

& $nssmPath install $serviceName $pythonExe "$managePy" "runserver 0.0.0.0:8000"
& $nssmPath set $serviceName AppStdout "C:\Users\Public\uptaiet-service.log"
& $nssmPath set $serviceName AppStderr "C:\Users\Public\uptaiet-service.log"
& $nssmPath set $serviceName AppEnvironmentExtra "DJANGO_SETTINGS_MODULE=config.settings"
& $nssmPath set $serviceName Start SERVICE_AUTO_START

Write-Host "Servicio $serviceName creado. Inicia con: sudo Start-Service $serviceName" -ForegroundColor Green
