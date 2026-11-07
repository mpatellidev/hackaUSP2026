#!/usr/bin/env bash
# UHealth (Linux/macOS): prepara e sobe backend + web (chat) + desktop (web) + mobile (web). Espelho do iniciar.ps1.
#
# Uso (na pasta do repositório):
#   ./iniciar.sh              # prepara tudo, sobe os 4 serviços e imprime as URLs (Ctrl+C encerra)
#   ./iniciar.sh --testes     # só roda os testes (fixtures, backend, builds) e sai
#   ./iniciar.sh --mock       # desktop e mobile em modo mock (sem usar o backend)
#   ./iniciar.sh --local      # só localhost (sem liberar o celular na rede)
#
# Pré-requisitos: Python 3.11+ e uv (ou python -m venv), Node.js 18+ e npm. Dados 100% fictícios; login DEMO inseguro.
# Portas fixas (o backend só aceita origens de CORS_ORIGINS): API 8000, chat 5173, desktop 1420, mobile 8081.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTES=0; MOCK=0; LOCAL=0
for a in "$@"; do
  case "$a" in
    --testes) TESTES=1 ;; --mock) MOCK=1 ;; --local) LOCAL=1 ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Opção desconhecida: $a (use --help)"; exit 1 ;;
  esac
done

passo() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
falha() { printf '\n\033[31mERRO: %s\033[0m\n' "$1" >&2; exit 1; }
tem() { command -v "$1" >/dev/null 2>&1; }

PIDS=()
encerrar() { echo; echo "Encerrando..."; for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; wait 2>/dev/null || true; }
trap encerrar EXIT INT TERM

ip_da_rede() {
  if tem ip; then ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' && return; fi
  if tem ipconfig; then ipconfig getifaddr en0 2>/dev/null && return; fi
  hostname -I 2>/dev/null | awk '{print $1}'
}

porta_livre() {
  local porta="$1" nome="$2"
  if tem ss && ss -ltn "sport = :$porta" 2>/dev/null | grep -q LISTEN; then
    falha "a porta $porta ($nome) já está em uso. Feche o programa que a usa e rode de novo."
  fi
}

esperar() {
  local url="$1" limite="${2:-60}" i=0
  while [ "$i" -lt "$limite" ]; do
    if curl -fsS -o /dev/null --max-time 2 "$url" 2>/dev/null; then return 0; fi
    printf '.'; sleep 1; i=$((i + 1))
  done
  return 1
}

# ------------------------------------------------------------------ pré-requisitos
passo "Conferindo Python e Node.js"
tem node && tem npm || falha "Node.js 18+ e npm não encontrados."
tem curl || falha "curl não encontrado."
USA_UV=0
if tem uv; then USA_UV=1; elif ! tem python3; then falha "Instale o uv (https://docs.astral.sh/uv/) ou o Python 3.11+."; fi

# ------------------------------------------------------------------ backend
passo "Preparando o backend"
cd "$RAIZ/backend"
[ -f .env ] || cp .env.example .env
if [ "$USA_UV" = 1 ]; then
  uv sync --quiet
  PY=(uv run python); ALEMBIC=(uv run alembic); UVICORN=(uv run uvicorn); PYTEST=(uv run pytest)
else
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/python "$RAIZ/scripts/instalar_backend.py"
  PY=(.venv/bin/python); ALEMBIC=(.venv/bin/python -m alembic); UVICORN=(.venv/bin/python -m uvicorn); PYTEST=(.venv/bin/python -m pytest)
fi
"${ALEMBIC[@]}" upgrade head
"${PY[@]}" -m app.seed

# ------------------------------------------------------------------ dependências dos clientes
passo "Instalando dependências dos clientes (só o que falta)"
for d in web desktop mobile; do
  if [ ! -d "$RAIZ/$d/node_modules" ]; then (cd "$RAIZ/$d" && npm install --no-audit --no-fund --loglevel=error); fi
done

if [ "$TESTES" = 1 ]; then
  passo "Fixtures"; (cd "$RAIZ" && python3 docs/fixtures/validar.py)
  passo "Backend (pytest)"; "${PYTEST[@]}" -q
  passo "Web (build)"; (cd "$RAIZ/web" && npm run build)
  passo "Desktop (testes e build)"; (cd "$RAIZ/desktop" && npm test && npm run build)
  passo "Mobile (tsc e export web)"; (cd "$RAIZ/mobile" && npx tsc --noEmit && npx expo export --platform web)
  echo; echo "Tudo certo."; exit 0
fi

# ------------------------------------------------------------------ rede e CORS
if [ "$LOCAL" = 1 ]; then HOST_BIND="127.0.0.1"; IP="localhost"; else HOST_BIND="0.0.0.0"; IP="$(ip_da_rede || true)"; IP="${IP:-localhost}"; fi
if [ "$IP" != "localhost" ]; then
  CORS_EXTRA="http://$IP:8081,http://$IP:1420,http://$IP:5173"
  # acrescenta ao CORS do .env (sem editar o arquivo): variável de ambiente vence o .env
  BASE_CORS="$(grep -E '^CORS_ORIGINS=' .env | head -1 | cut -d= -f2-)"
  export CORS_ORIGINS="${BASE_CORS:+$BASE_CORS,}$CORS_EXTRA"
fi

for par in "8000:API" "5173:chat web" "1420:desktop" "8081:mobile"; do porta_livre "${par%%:*}" "${par#*:}"; done

API_LOCAL="http://$IP:8000"
if [ "$MOCK" = 1 ]; then MODO=mock; else MODO=api; fi

# ------------------------------------------------------------------ subir tudo
LOGS="$RAIZ/.logs-iniciar"; mkdir -p "$LOGS"

passo "Subindo a API (porta 8000)"
"${UVICORN[@]}" app.main:app --host "$HOST_BIND" --port 8000 >"$LOGS/api.log" 2>&1 &
PIDS+=($!)
esperar "http://localhost:8000/saude" 60 || falha "a API não respondeu. Veja $LOGS/api.log"
echo " API pronta."

passo "Subindo chat web (5173), desktop web (1420) e mobile web (8081)"
(cd "$RAIZ/web" && VITE_API_URL="$API_LOCAL" npm run dev -- --host "$HOST_BIND" >"$LOGS/web.log" 2>&1) & PIDS+=($!)
(cd "$RAIZ/desktop" && VITE_API_MODO="$MODO" VITE_API_URL="$API_LOCAL/api/v1" npm run dev -- --host "$HOST_BIND" >"$LOGS/desktop.log" 2>&1) & PIDS+=($!)
(cd "$RAIZ/mobile" && CI=1 EXPO_PUBLIC_API_MODO="$MODO" EXPO_PUBLIC_API_URL="$API_LOCAL" npx expo start --web --port 8081 --host "$( [ "$LOCAL" = 1 ] && echo localhost || echo lan )" >"$LOGS/mobile.log" 2>&1) & PIDS+=($!)

esperar "http://localhost:5173" 60 || falha "o chat web não subiu. Veja $LOGS/web.log"
esperar "http://localhost:1420" 60 || falha "o desktop web não subiu. Veja $LOGS/desktop.log"
echo; echo "Aguardando o mobile (a primeira compilação demora um pouco)..."
esperar "http://localhost:8081" 180 || falha "o mobile web não subiu. Veja $LOGS/mobile.log"

cat <<FIM

============================================================
 UHealth no ar  (dados FICTÍCIOS · login DEMO, sem senha)
============================================================
 API (docs)        http://localhost:8000/docs
 Chat do paciente  http://localhost:5173
 Painel da clínica http://localhost:1420        (conta: funcionario.atendimento.a)
 App do paciente   http://localhost:8081        (conta: paciente.ana)
FIM
if [ "$IP" != "localhost" ]; then
cat <<FIM

 No celular (mesma rede Wi-Fi):
   App do paciente   http://$IP:8081
   Painel da clínica http://$IP:1420
   Chat do paciente  http://$IP:5173
FIM
fi
echo; echo " Modo dos apps: $MODO · logs em $LOGS · Ctrl+C encerra tudo."
wait
