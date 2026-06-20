@echo off
REM Inicia el servidor Django y abre el navegador en localhost
cd /d "%~dp0"
call venv\Scripts\activate.bat
start "UPTAIET" python backend\manage.py runserver 0.0.0.0:8000
start "UPTAIET" http://127.0.0.1:8000
