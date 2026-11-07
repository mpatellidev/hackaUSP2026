<#
  UHealth (Windows): prepara e sobe a API e os dois apps web numa porta só. Não precisa do uv.

  Uso (PowerShell, na pasta app):
    powershell -ExecutionPolicy Bypass -File .\iniciar.ps1            # prepara, constrói e serve em http://localhost:8000
    powershell -ExecutionPolicy Bypass -File .\iniciar.ps1 -Testes    # roda fixtures, backend, typecheck, testes e build e sai
    powershell -ExecutionPolicy Bypass -File .\iniciar.ps1 -Local     # só localhost (sem liberar o celular na rede)

  Paciente em /, clínicas em /clinica/, documentação da API em /docs. Pré-requisitos: Python 3.11+ e Node.js 18+.
  Dados 100% fictícios; login DEMO inseguro. Pode rodar quantas vezes quiser: só instala o que falta.
#>
param([switch]$Testes, [switch]$Local)

$ErrorActionPreference = 'Stop'
$app = $PSScriptRoot
$back = Join-Path (Split-Path $app -Parent) 'backend'
$py = Join-Path $back '.venv\Scripts\python.exe'

function Passo([string]$t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Falha([string]$t) { Write-Host "`nERRO: $t" -ForegroundColor Red; exit 1 }
function Rodar([string]$exe, [string[]]$args_, [string]$pasta) {
    Push-Location $pasta
    try { & $exe @args_; if ($LASTEXITCODE -ne 0) { Falha "o comando falhou: $exe $($args_ -join ' ')" } } finally { Pop-Location }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Falha 'instale o Node.js 18+ (https://nodejs.org).' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Falha 'instale o Python 3.11+ (marque "Add python.exe to PATH").' }

Passo 'Backend: dependências, banco e dados fictícios'
if (-not (Test-Path $py)) { Rodar 'python' @('-m', 'venv', '.venv') $back }
Rodar $py @('scripts\instalar_backend.py') $back
if (-not (Test-Path (Join-Path $back '.env'))) { Copy-Item (Join-Path $back '.env.example') (Join-Path $back '.env') }
Rodar $py @('-m', 'alembic', 'upgrade', 'head') $back
Rodar $py @('-m', 'app.seed') $back

Passo 'App: dependências'
if (-not (Test-Path (Join-Path $app 'node_modules'))) { Rodar 'npm.cmd' @('install') $app }

if ($Testes) {
    Passo 'Fixtures'; Rodar 'python' @('backend\docs\fixtures\validar.py') (Split-Path $app -Parent)
    Passo 'Backend (pytest)'; Rodar $py @('-m', 'pytest', '-q') $back
    Passo 'App (typecheck, testes e build)'
    Rodar 'npm.cmd' @('run', 'typecheck') $app; Rodar 'npm.cmd' @('test') $app; Rodar 'npm.cmd' @('run', 'build') $app
    Write-Host "`nTudo certo." -ForegroundColor Green; exit 0
}

Passo 'Construindo os apps'
Rodar 'npm.cmd' @('run', 'build') $app

$bind = if ($Local) { '127.0.0.1' } else { '0.0.0.0' }
Passo 'Subindo a API com os apps (Ctrl+C encerra)'
Write-Host '  Paciente: http://localhost:8000/'
Write-Host '  Clínicas: http://localhost:8000/clinica/'
if (-not $Local) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
    if ($ip) { Write-Host "  No celular (mesmo Wi-Fi): http://${ip}:8000/" }
}
Rodar $py @('-m', 'uvicorn', 'app.main:app', '--host', $bind, '--port', '8000') $back
