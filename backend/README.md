# UHealth — backend (issue #2)

API FastAPI do protótipo. **Dados 100% fictícios. Autenticação DEMO, sem senha: não é segura e não pode ir para produção.**
Contrato de referência: `docs/contratos-mvp.md` (issue #1). Reúne a fundação (#2) e os módulos de cada frente (#3, #4, #9, #11, #13, #14, #18), todos montados em `app/registro.py`.

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

## Arquitetura
```
app/
  main.py          cria o app: CORS, handlers de erro, ROUTERS em /api/v1 e atalho /saude
  registro.py      REGISTRO ÚNICO: lista ROUTERS (um módulo = uma linha)
  seed.py          dados fictícios (fixtures + seed de cada módulo), idempotente
  core/            config.py (Settings/.env, inclusive chat/IA) · db.py · auth.py (Actor) · errors.py (ApiError) · time.py
  models/          modelos do núcleo (usuários, clínicas, solicitações, vagas/agendamentos); __init__ importa todos os modelos
  modulos/<m>/     router.py · schemas.py · service.py · models.py · repositorio.py (se preciso) · seed.py · tests/
alembic/versions/  0001 base · 0002 prioridade · 0003 chat · 0004 publico_alvo · 0005 urgência · 0006 cenários · 0007 perfil
```
Módulos: `auth`, `saude`, `solicitacoes` (#3), `vagas` (#4), `agendamentos` (#4), `prioridade` (#13), `urgencia` (#14), `cenarios` (#11), `perfil` (#18), `acessibilidade` (#9).

- **Auth e erros únicos:** use `Depends(get_actor)` (`Actor`: `usuario_id`, `papel`, `vinculos{clinica_id: funcao}`, `tem_funcao`, `clinica_principal`) e `raise ApiError(status, codigo, mensagem)` (ou `nao_encontrado()`, `acesso_negado()`, `transicao_invalida()`, `erro_validacao()`). Formato `{"erro": {"codigo", "mensagem", "detalhes"}}` instalado num lugar só. Papel e clínica vêm do token, nunca do corpo.
- **Novo módulo:** crie `app/modulos/<m>/`, adicione 1 linha em `ROUTERS` (`app/registro.py`), 1 linha em `app/models/__init__.py` se tiver tabela, uma migração `NNNN_<m>_<descricao>` encadeada no `head` (`uv run alembic revision --autogenerate -m "<m>"`; `alembic heads` deve mostrar uma só) e `seed.run(db)` em `app/seed.py` se tiver dados fictícios. Não mexa em `main.py`.
- **Isolamento:** `modulos/solicitacoes/repositorio.py` lê pedidos **já escopados** pelo `Actor` (fora do escopo = 404). Agendamentos seguem a mesma regra.
- **Fila (#13):** `prioridade/fontes.py` lê urgência, cenários e perfil **pelos serviços dos módulos** (banco), nunca de JSON.
- **Persistência:** tudo está no banco (inclusive urgência, cenários e perfil); reiniciar a API **não** volta ao estado inicial. O seed é idempotente (`python -m app.seed` várias vezes).
- Invariantes no banco: no máximo 1 `Agendamento` não cancelado por vaga (índice único parcial); `InteresseVaga` único por (vaga, solicitação); 1 avaliação de urgência por relato; 1 interesse de cenário por (cenário, paciente).

## Agendamentos e cancelamento (contrato 0.1.3)
`GET /agendamentos[?estado=]`, `GET /agendamentos/{id}`, `POST /agendamentos/{id}/cancelar {"motivo"?}`. Paciente dono → `cancelado_antecipado` (só antes do início da vaga); funcionário da clínica → `cancelado_pela_clinica`. Nunca gera falta ou penalidade; vaga reabre (se futura); pedido `agendada` volta a `em_analise`. Veja `app/modulos/agendamentos/service.py` e o contrato §4.6.

## Chat acessível (#9)
Módulo `app/modulos/acessibilidade/` (rotas em `/api/v1/acessibilidade/...`, só paciente). Padrão `LLM_PROVIDER=mock` (sem rede e sem chave); Gemini/Claude opcionais via `.env`. Detalhes: `app/modulos/acessibilidade/README.md`. Cliente web: `web/` na raiz.

## Limitações
- O seed lê `docs/fixtures/` (da #1) diretamente; rode os comandos a partir do checkout completo do repositório.
- Bancos existentes (ex.: `dev.db` antigo) precisam de `uv run alembic upgrade head` para ganhar as tabelas de urgência, cenários e perfil (o `iniciar.sh` já faz isso).
- Vagas (#4) em `app/modulos/vagas/`: o evento `vaga_criada` para alertas (#17) ainda não é emitido (não há módulo de alertas).
- Sem rate limit; CORS por `CORS_ORIGINS` (veja `.env.example` para liberar o celular na mesma rede).
