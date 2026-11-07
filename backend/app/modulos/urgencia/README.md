# Módulo backend: urgência (#14)

Endpoints (contrato §9.4): `POST /urgencias`, `GET /urgencias`, `POST /urgencias/{id}/avaliacao`, `GET /urgencias/orientacao` (texto estático).

**Rodar testes** (a partir da raiz do repositório): `pip install fastapi pytest httpx && PYTHONPATH=backend pytest backend/app/modulos/urgencia`

**Integração**
- #2: `app.include_router(router, prefix="/api/v1")`, `app.add_exception_handler(ErroApi, tratar_erro_api)` e `app.dependency_overrides[obter_ator]` (token → `Ator` com papel/função/clínica do servidor). Sem override, a API devolve 401. Repositório em memória (fixtures); trocar por banco via `obter_repo`.
- #13: `urgencia_avaliada(repo, solicitacao_id)` e `solicitacoes_com_urgencia_avaliada(repo)`. Só `urgencia_confirmada` conta; relato pendente ou `sem_urgencia` não altera score nem penaliza.

**Limitações**: relato sem `solicitacao_id` não aparece para clínicas (sem clínica associada); sem persistência; textos de emergência aguardam validação clínica; não há classificador.
