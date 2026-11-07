# alertas

Alertas de vaga (contrato §9.7). **Alerta não é reserva, e não há push.** O paciente liga a preferência em `PUT /alertas/preferencia` (`receber`, `ligacao` = a clínica pode telefonar, sem ligação automática). Ao publicar uma vaga, `vagas.service.criar` chama `alertas.service.gerar_para_vaga`: um alerta por (paciente, vaga) para quem optou e tem pedido ativo na mesma clínica e especialidade.

Rotas: `GET /alertas`, `POST /alertas/{id}/lido`, `GET/PUT /alertas/preferencia`. Tabelas `alertas` e `alertas_preferencia` (migração `0010`).
