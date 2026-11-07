# UHealth — backend (issue #2)

API FastAPI do protótipo. **Dados 100% fictícios. Autenticação DEMO, sem senha: não é segura e não pode ir para produção.**
Contrato de referência: `docs/contratos-mvp.md` (issue #1). Aqui só há a **fundação**: sem regras de solicitações, vagas, fila etc. (#3, #4, #13…).

## Rodar localmente (SQLite, sem credenciais)
```bash
cd backend
uv sync
cp .env.example .env          # opcional; o padrão já é SQLite em ./dev.db
uv run alembic upgrade head   # cria as tabelas
uv run python -m app.seed     # dados fictícios; pode rodar várias vezes
uv run uvicorn app.main:app --reload
uv run pytest -q
```
Docs: http://localhost:8000/docs · Saúde: `GET /saude` (também `/api/v1/saude`).

## Postgres / Supabase
Defina `DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@HOST:5432/postgres` (no ambiente, nunca no repositório) e rode os mesmos `alembic upgrade head` + `app.seed`.
**Não use SQLite no Render**: o disco é efêmero e os dados somem. *Status:* o caminho Postgres está escrito (índice parcial e tipos compatíveis), mas **não foi testado** num Postgres real nesta entrega.

## Login DEMO
`POST /api/v1/auth/demo/login {"conta": "paciente.ana"}` → `token`; envie `Authorization: Bearer <token>`. `GET /api/v1/auth/me` mostra papel/clínica **lidos do banco**; `papel`, `clinica_id` ou `paciente_id` enviados pelo cliente são ignorados. Contas: `docs/fixtures/contas-demo.json`
(`paciente.ana`, `paciente.eva`, `funcionario.atendimento.a`, `funcionario.profissional.b`, …). Sessão expira em `SESSION_TTL_HOURS` (padrão 8h); só o hash do token fica no banco.

## Estrutura e extensão (para as outras frentes)
- `app/models/<modulo>.py`: um arquivo de modelo por domínio; importe-o em `app/models/__init__.py` (1 linha).
- `app/routers/<modulo>.py` + 1 linha em `ROUTERS` (`app/routers/__init__.py`). Não mexa em `main.py`.
- `app/repositories/`: leituras **já escopadas** pelo `Actor` (`listar/obter` de pedidos). Use-as; acesso fora do escopo vira **404**.
- `app/core/auth.py`: `get_actor`, `require_paciente`, `require_funcionario`, `Actor.tem_funcao(clinica_id, "profissional")`.
- `app/core/errors.py`: `ApiError` no formato `{"erro": {"codigo", "mensagem", "detalhes"}}`.
- Migrações: `uv run alembic revision --autogenerate -m "<modulo>"` encadeada no `head`. Rode `alembic heads`; se houver 2 heads depois de um merge, combine com `alembic merge`.
- Invariantes no banco: no máximo 1 `Agendamento` não cancelado por vaga (índice único parcial); `InteresseVaga` único por (vaga, solicitação).

## Chat acessível (#9)
Módulo `app/modulos/acessibilidade/` (rotas em `/api/v1/acessibilidade/...`, só paciente). Padrão `LLM_PROVIDER=mock` (sem rede e sem chave); Gemini/Claude opcionais via `.env`. Detalhes: `app/modulos/acessibilidade/README.md`. Cliente web: `web/` na raiz.

## Limitações
- O seed lê `docs/fixtures/` (da #1) diretamente; rode os comandos a partir do checkout completo do repositório.
- Urgência (#14) e cenários (#11) guardam dados **em memória** (demo, a partir das fixtures): reiniciar a API volta ao estado inicial. A autenticação deles é adaptada em `app/integracao.py`.
- Vagas (#4) em `app/modulos/vagas/`: o evento `vaga_criada` para alertas (#17) ainda não é emitido (não há módulo de alertas).
- Sem rate limit; CORS por `CORS_ORIGINS` (veja `.env.example` para liberar o celular na mesma rede).
