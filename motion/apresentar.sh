#!/usr/bin/env bash
# Abre o deck do pitch (ou o trailer) no navegador, servido localmente.
#
#   motion/apresentar.sh            deck (slides.html)
#   motion/apresentar.sh --trailer  trailer em loop (index.html)
#   motion/apresentar.sh --porta 8091
#
# Se o app estiver rodando (app/iniciar.sh --dev), liga a demo ao vivo. O QR do fechamento
# aponta para o protótipo publicado (https://sorriu-web.vercel.app); QR=<url> troca, QR=0 esconde.
# Sem nada disso, o deck funciona sozinho e offline (telas do protótipo).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTA=8090; PAGINA=slides.html
while [ $# -gt 0 ]; do
  case "$1" in
    --trailer) PAGINA=index.html ;;
    --porta) PORTA="$2"; shift ;;
    -h|--help) sed -n '2,10p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Opção desconhecida: $1 (use --help)"; exit 1 ;;
  esac
  shift
done

responde() { curl -fsS -o /dev/null --max-time 1 "$1" 2>/dev/null; }
# app de verdade = o logo dele responde como imagem (um servidor antigo na mesma porta não conta)
app_no_ar() { curl -fsS --max-time 1 -o /dev/null -w '%{content_type}' "$1/src/design/logo.png" 2>/dev/null | grep -q image; }

PARAMS=()
if [ "$PAGINA" = slides.html ]; then
  for p in 5173 5175; do if app_no_ar "http://localhost:$p"; then PARAMS+=("paciente=http://localhost:$p"); break; fi; done
  app_no_ar "http://localhost:5174/clinica" && PARAMS+=("clinica=http://localhost:5174/clinica")
  # o QR do fechamento aponta para https://sorriu-web.vercel.app; QR=<url> troca (QR=0 esconde)
  [ -n "${QR:-}" ] && PARAMS+=("qr=$QR")
fi
QUERY=""; [ ${#PARAMS[@]} -gt 0 ] && QUERY="?$(IFS='&'; echo "${PARAMS[*]}")"
URL="http://localhost:$PORTA/$PAGINA$QUERY"

SERVIDOR=""
if responde "http://localhost:$PORTA/$PAGINA"; then
  echo "Usando o servidor que já está na porta $PORTA."
else
  python3 -m http.server "$PORTA" --bind 127.0.0.1 --directory "$DIR" >/dev/null 2>&1 &
  SERVIDOR=$!
  trap 'kill $SERVIDOR 2>/dev/null' EXIT INT TERM
  for _ in $(seq 1 20); do responde "http://localhost:$PORTA/$PAGINA" && break; sleep .2; done
fi

echo "Deck: $URL"
[ ${#PARAMS[@]} -gt 0 ] && printf '  %s\n' "${PARAMS[@]}"
echo "Teclas: → avança · ← volta · D app · A apêndice · P apresentador · N notas · F tela cheia"
if command -v xdg-open >/dev/null; then xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null; then open "$URL"
else echo "Abra o endereço acima no navegador."; fi

if [ -n "$SERVIDOR" ]; then echo "Ctrl+C encerra o servidor do deck."; wait "$SERVIDOR"; fi
