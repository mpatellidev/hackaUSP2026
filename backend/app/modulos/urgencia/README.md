# Módulo backend: urgência (#14)

Endpoints (contrato §9.4): `POST /urgencias`, `GET /urgencias`, `POST /urgencias/{id}/avaliacao`, `GET /urgencias/orientacao` (texto estático). Dados fictícios (demo).

**Rodar testes:** `cd backend && uv run pytest app/modulos/urgencia`

**Como funciona**
- Auth e erros do core (`Actor`, `ApiError`). Só `funcao = profissional` da clínica do pedido avalia (senão `403`; outra clínica `404`). Autor e horário da avaliação vêm do servidor.
- Persistido no banco: tabelas `urgencia_relatos` e `urgencia_avaliacoes` (migração `0005`); seed idempotente de `docs/fixtures/urgencias.json`.
- #13: a fila lê `service.status_urgencia(repo, solicitacao_id)` (`avaliada` | `autodeclarada` | `nenhuma`), `urgencia_avaliada` e `solicitacoes_com_urgencia_avaliada`. Só `urgencia_confirmada` conta e passa à frente de qualquer score; relato pendente só sinaliza; `sem_urgencia` é neutro. Relato de urgência **nunca** pune.

**Limitações**: relato sem `solicitacao_id` não aparece para clínicas (sem clínica associada); textos de emergência aguardam validação clínica; não há classificador.
