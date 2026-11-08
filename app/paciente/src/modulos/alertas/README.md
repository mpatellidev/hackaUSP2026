# paciente · alertas (P1, pronto)

Tela `/alertas` (atalho do sino no topo da busca, com a contagem de não lidos): preferência de alerta de vaga, lista de alertas e "Marcar como lido". "Ver vaga" abre as vagas do pedido ativo na mesma clínica e especialidade. Alerta não é reserva e não há push; a opção de ligação é só uma preferência para a clínica.

**Endpoints:** `GET/PUT /alertas/preferencia`, `GET /alertas`, `POST /alertas/{id}/lido`.

Ver [`frentes.md`](../../../../frentes.md).
