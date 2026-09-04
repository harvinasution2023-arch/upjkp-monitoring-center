$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

Write-Host "Menyiapkan database UPJKP..." -ForegroundColor Cyan
python .\scripts\init_database.py

Write-Host "Menjalankan UPJKP Monitoring Center..." -ForegroundColor Green
Write-Host "Buka http://127.0.0.1:8765 pada browser." -ForegroundColor DarkGray
python .\backend\server.py
