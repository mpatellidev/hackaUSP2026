#!/usr/bin/env bash
# Sorriu+ (Linux/macOS): prepara e sobe a API e os dois apps web numa porta só.
#
#   ./iniciar.sh            prepara tudo, constrói os apps e serve em http://localhost:8000
#                           (paciente em /, clínicas em /clinica/, documentação da API em /docs)
#   ./iniciar.sh --dev      mesma preparação, mas com recarregamento: API 8000, paciente 5173, clínicas 5174
#   ./iniciar.sh --testes   roda fixtures, backend, typecheck, testes e build dos apps e sai
#   ./iniciar.sh --local    só localhost (sem liberar o celular na mesma rede)
#
# Pré-requisitos: Python 3.11+ com uv (ou venv) e Node.js 18+. Dados 100% fictícios; login DEMO inseguro.
set -euo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK="$APP/../backend"
DEV=0; TESTES=0; LOCAL=0
for a in "$@"; do
  case "$a" in
    --dev) DEV=1 ;; --testes) TESTES=1 ;; --local) LOCAL=1 ;;
    -h|--help) sed -n '2,10p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Opção desconhecida: $a (use --help)"; exit 1 ;;
  esac
done

passo() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
falha() { printf '\n\033[31mERRO: %s\033[0m\n' "$1" >&2; exit 1; }
tem() { command -v "$1" >/dev/null 2>&1; }

tem node && tem npm || falha "instale o Node.js 18+ (https://nodejs.org)."
if tem uv; then PY=(uv run python); UV=(uv run); else
  tem python3 || falha "instale o Python 3.11+ (ou o uv: https://docs.astral.sh/uv/)."
  PY=("$BACK/.venv/bin/python"); UV=("$BACK/.venv/bin/python" -m)
fi

passo "Backend: dependências, banco e dados fictícios"
cd "$BACK"
if tem uv; then uv sync; else
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/python scripts/instalar_backend.py
fi
[ -f .env ] || cp .env.example .env
"${UV[@]}" alembic upgrade head
"${PY[@]}" -m app.seed >/dev/null

passo "App: dependências"
cd "$APP"
[ -d node_modules ] || npm install

if [ "$TESTES" = 1 ]; then
  passo "Fixtures"; python3 "$BACK/docs/fixtures/validar.py"
  passo "Backend (pytest)"; (cd "$BACK" && "${UV[@]}" pytest -q)
  passo "Contrato (tipos do app em dia com a API)"
  npm run gen:api >/dev/null && git diff --exit-code -- packages/api-client/src/schema.d.ts || falha "rode 'npm run gen:api' e commite packages/api-client/src/schema.d.ts."
  passo "App (typecheck, testes e build)"; npm run typecheck && npm test && npm run build
  printf '\n\033[32mTudo certo.\033[0m\n'; exit 0
fi

HOST=0.0.0.0; [ "$LOCAL" = 1 ] && HOST=127.0.0.1
IP="$(python3 -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('10.255.255.255',1));print(s.getsockname()[0])" 2>/dev/null || echo localhost)"
mostrar() { printf '\n%s\n  %s\n' "$1" "$2"; [ "$LOCAL" = 1 ] || printf '  No celular (mesmo Wi-Fi): %s\n' "${2//localhost/$IP}"; }

if [ "$DEV" = 1 ]; then
  passo "Modo de desenvolvimento (Ctrl+C encerra)"
  mostrar "Paciente:" "http://localhost:5173/"; mostrar "Clínicas:" "http://localhost:5174/clinica/"
  exec npm run dev
fi

passo "Construindo os apps"
npm run build
passo "Subindo a API com os apps (Ctrl+C encerra)"
mostrar "Paciente:" "http://localhost:8000/"; mostrar "Clínicas:" "http://localhost:8000/clinica/"
cd "$BACK"
exec "${UV[@]}" uvicorn app.main:app --host "$HOST" --port 8000
