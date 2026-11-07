# Agendamentos (#4)

`GET /agendamentos[?estado=agendado|concluido|cancelado]`, `GET /agendamentos/{id}`, `POST /agendamentos/{id}/cancelar {"motivo": str|null}` (contrato 0.1.3, §4.6 e §7.7). Dados fictícios (demo).

- Paciente dono → `cancelado_antecipado`, só antes do início da vaga. Funcionário da clínica → `cancelado_pela_clinica`. Outra pessoa/clínica → `404`. Já cancelado, concluído ou com falta registrada → `409 transicao_invalida`.
- Mesma transação: agendamento `cancelado`; vaga `aberta` (futura) ou `cancelada`; interesse confirmado `retirado`; pedido `agendada` → `em_analise`; evento `transicao` com autor e motivo administrativo.
- **Nunca** gera `RegistroFalta` nem altera o score. Não cria novo pedido nem encaminha sozinho (o paciente escolhe).
- Testes: `uv run pytest app/modulos/agendamentos` (o relógio é congelado nos testes).
