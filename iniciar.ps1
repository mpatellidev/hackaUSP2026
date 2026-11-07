<#
  UHealth: prepara e sobe a API e o chat web no Windows. Não precisa do uv.

  Uso (no PowerShell, na pasta do repositório):
    powershell -ExecutionPolicy Bypass -File .\iniciar.ps1            # prepara tudo e abre o app
    powershell -ExecutionPolicy Bypass -File .\iniciar.ps1 -Testes    # roda os testes e não abre o app

  Pode rodar quantas vezes quiser: só instala o que falta.
#>
param([switch]$Testes)

$ErrorActionPreference = 'Stop'
$raiz = $PSScriptRoot
$back = Join-Path $raiz 'backend'
$web = Join-Path $raiz 'web'
$py = Join-Path $back '.venv\Scripts\python.exe'

function Passo([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Falha([string]$texto) { Write-Host "`nERRO: $texto" -ForegroundColor Red; exit 1 }
function Rodar([string]$exe, [string[]]$argumentos, [string]$pasta) {
    Push-Location $pasta
    try {
        & $exe @argumentos
        if ($LASTEXITCODE -ne 0) { Falha "o comando falhou: $exe $($argumentos -join ' ')" }
    } finally { Pop-Location }
}
function PortaOcupada([int]$porta) {
    Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}
function FecharExecucaoAnterior {
    # Janelas abertas por uma execução anterior deste script (título "UHealth API/Web (porta ...)").
    $janelas = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
        Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match "WindowTitle = 'UHealth (API|Web) \(porta" }
    foreach ($j in $janelas) {
        Write-Host "Fechando a janela anterior do UHealth (processo $($j.ProcessId))." -ForegroundColor Yellow
        taskkill /T /F /PID $j.ProcessId | Out-Null
    }
    if ($janelas) { Start-Sleep -Seconds 2 }
}
function LiberarPorta([int]$porta, [string]$nome) {
    $con = PortaOcupada $porta
    if (-not $con) { return }
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($con.OwningProcess)"
    # Só fecha sozinho se for o próprio UHealth desta pasta (ex.: aberto à mão num terminal).
    if ($proc.CommandLine -and $proc.CommandLine.Contains($raiz) -and $proc.CommandLine -match 'uvicorn|vite') {
        $alvo = $proc
        $pai = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)"
        if ($pai -and $pai.CommandLine -and $pai.CommandLine.Contains($raiz) -and $pai.CommandLine -match 'uvicorn') {
            $alvo = $pai   # uvicorn --reload: o processo pai recriaria o filho
        }
        Write-Host "Fechando execução anterior do UHealth na porta $porta (processo $($alvo.ProcessId))." -ForegroundColor Yellow
        taskkill /T /F /PID $alvo.ProcessId | Out-Null
        Start-Sleep -Seconds 2
        return
    }
    Write-Host "A porta $porta ($nome) já está em uso por outro programa (processo $($proc.ProcessId)):" -ForegroundColor Yellow
    Write-Host "   $($proc.CommandLine)"
    Falha "feche esse programa (ou rode: Stop-Process -Id $($proc.ProcessId)) e execute o iniciar.ps1 de novo."
}
function Esperar([string]$url, [int]$segundos) {
    $limite = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $limite) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
            Write-Host ''
            return $true
        } catch {
            Write-Host '.' -NoNewline
            Start-Sleep -Seconds 1
        }
    }
    Write-Host ''
    return $false
}

# ---------------------------------------------------------------- pré-requisitos
Passo 'Conferindo Python e Node.js'
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Falha 'Python não encontrado. Instale o Python 3.11+ em python.org e marque "Add python.exe to PATH".'
}
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)"
if ($LASTEXITCODE -ne 0) { Falha 'É preciso Python 3.11 ou mais novo (comando "python").' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { Falha 'Node.js não encontrado. Instale o Node 18+ em nodejs.org.' }
Write-Host "Python: $(python --version)   Node: $(node --version)"

# ---------------------------------------------------------------- backend
Passo 'Backend: ambiente Python (backend\.venv)'
if (-not (Test-Path $py)) { Rodar 'python' @('-m', 'venv', '.venv') $back }
if (-not (Test-Path (Join-Path $back '.venv\Lib\site-packages\pip'))) {
    Rodar $py @('-m', 'ensurepip', '--upgrade') $back   # .venv criado pelo uv vem sem pip
}
Rodar $py @((Join-Path $raiz 'scripts\instalar_backend.py')) $back

if (-not (Test-Path (Join-Path $back '.env'))) {
    Copy-Item (Join-Path $back '.env.example') (Join-Path $back '.env')
    Write-Host 'Criado backend\.env (SQLite + chat em modo mock, sem chave).'
}

Passo 'Backend: banco de dados (migrações e dados fictícios)'
Rodar $py @('-m', 'alembic', 'upgrade', 'head') $back
Rodar $py @('-m', 'app.seed') $back

# ---------------------------------------------------------------- web
Passo 'Web: dependências (web\node_modules)'
if (-not (Test-Path (Join-Path $web '.env'))) {
    Copy-Item (Join-Path $web '.env.example') (Join-Path $web '.env')
    Write-Host 'Criado web\.env (VITE_API_URL=http://localhost:8000).'
}
if (-not (Test-Path (Join-Path $web 'node_modules\.bin\vite.cmd'))) { Rodar 'npm.cmd' @('install', '--no-audit', '--no-fund') $web }

# ---------------------------------------------------------------- testes (opcional)
if ($Testes) {
    Passo 'Testes'
    Rodar 'python' @('docs\fixtures\validar.py') $raiz
    Rodar $py @('-m', 'pytest', '-q') $back
    Rodar 'npm.cmd' @('run', 'build') $web
    Write-Host "`nTudo certo: testes do backend e build do web passaram." -ForegroundColor Green
    exit 0
}

# ---------------------------------------------------------------- subir
Passo 'Subindo a API e o site (cada um abre numa janela; feche a janela para parar)'
FecharExecucaoAnterior
LiberarPorta 8000 'API'
LiberarPorta 5173 'site'

$cmdApi = "`$host.UI.RawUI.WindowTitle = 'UHealth API (porta 8000)'; & '$py' -m uvicorn app.main:app --reload --port 8000"
$cmdWeb = "`$host.UI.RawUI.WindowTitle = 'UHealth Web (porta 5173)'; npm.cmd run dev"
Start-Process powershell -WorkingDirectory $back -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $cmdApi)
Start-Process powershell -WorkingDirectory $web -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $cmdWeb)

Write-Host 'Esperando a API' -NoNewline
if (-not (Esperar 'http://127.0.0.1:8000/saude' 120)) { Falha 'a API não respondeu. Veja a mensagem na janela "UHealth API".' }
Write-Host 'API ok: http://localhost:8000/docs' -ForegroundColor Green
Write-Host 'Esperando o site' -NoNewline
if (-not (Esperar 'http://localhost:5173/' 120)) { Falha 'o site não respondeu. Veja a mensagem na janela "UHealth Web".' }
Write-Host 'Site ok: http://localhost:5173' -ForegroundColor Green

Start-Process 'http://localhost:5173'
Write-Host "`nPronto! Entre com uma conta fictícia de paciente (ex.: Ana M.)." -ForegroundColor Green
