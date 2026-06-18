@echo off
setlocal

:: ── Configuración ──────────────────────────────────────
set PGPASSWORD=UptaietRubio2026*
set PGDUMP="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
set USUARIO=uptaiet_user
set BASE=uptaiet_biometrico
set DESTINO=C:\biometrico_uptaiet\backups\
set LOG=%DESTINO%backup_log.txt

:: ── Crear carpeta si no existe ──────────────────────────
if not exist %DESTINO% mkdir %DESTINO%

:: ── Obtener fecha y hora con PowerShell (formato fijo) ──
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd_HHhmm\""') do set STAMP=%%i

set ARCHIVO=backup_%STAMP%.sql

:: ── Ejecutar backup ─────────────────────────────────────
%PGDUMP% -U %USUARIO% -d %BASE% -f "%DESTINO%%ARCHIVO%"

:: ── Registrar resultado ─────────────────────────────────
if %ERRORLEVEL% == 0 (
    echo [%date% %time%] EXITOSO: %ARCHIVO% >> %LOG%
    echo Backup exitoso: %ARCHIVO%
) else (
    echo [%date% %time%] ERROR al generar backup >> %LOG%
    echo ERROR: Fallo el backup
)

:: ── Eliminar backups con mas de 30 dias ─────────────────
forfiles /p "%DESTINO%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul

endlocal