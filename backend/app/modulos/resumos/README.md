# resumos

Resumo compartilhável **fictício** com escolha do paciente e auditoria (contrato §9.5). Não é prontuário real e nada daqui vai para a IA.

- Criar: `POST /resumos` (só `profissional` da clínica do pedido).
- Paciente decide: `POST /resumos/{id}/compartilhamentos` (clínica, campos, finalidade; aceitar ou recusar) e `POST /compartilhamentos/{id}/revogar` (vale para acessos futuros; o histórico fica).
- Clínica destinatária vê só os campos escolhidos; cada consulta gera `EventoAcesso`. O paciente vê a auditoria em `GET /resumos/{id}/eventos`.

Tabelas `resumos`, `resumos_compartilhamentos` e `resumos_eventos_acesso` (migração `0010`).
