<#
Crea un acceso directo en el escritorio para abrir el sistema en el navegador.
#>

$desktop = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desktop 'UPTAIET Web.lnk'
$targetPath = 'C:\Windows\System32\cmd.exe'
$arguments = '/c start http://127.0.0.1:8000'

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($linkPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $desktop
$shortcut.WindowStyle = 1
$shortcut.IconLocation = 'C:\Windows\System32\shell32.dll, 1'
$shortcut.Description = 'Abrir UPTAIET en el navegador'
$shortcut.Save()

Write-Host "Acceso directo creado en el escritorio: $linkPath" -ForegroundColor Green
