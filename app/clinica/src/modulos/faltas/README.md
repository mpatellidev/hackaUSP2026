# clinica · faltas (P1, parcial)

Registrar falta (só profissional, depois do horário, com justificativa) e revisar (profissional ou coordenação). Cancelamento nunca gera falta.

**Feito:** registrar falta na tela de Agendamentos (`modulos/agendamentos/Agendamentos.tsx`, `POST /faltas`). A falta confirmada entra no comparecimento do score.
**Falta:** a revisão (`GET /faltas`, `POST /faltas/{id}/revisao`), sem rota nem item de menu ainda. Ao implementar, exporte `rotas` e acrescente uma linha em `src/rotas.tsx`.

Ver [`frentes.md`](../../../../frentes.md).
