# Vagas e prioridade — issue #8

Exporte `rotas` para `desktop/src/rotas.ts`; a issue #7 mantém o menu central.

O mock demonstra publicação, confirmação única e fila explicável. Em modo API usa as rotas de vagas da #4
(`GET/POST /vagas`, `GET /vagas/{id}/interesses`, `POST /vagas/{id}/confirmar`) e a fila exclusiva da #13.
A confirmação usa o `interesse_id` escolhido pelo funcionário na lista de interessados (ordem sugerida pela #13).
