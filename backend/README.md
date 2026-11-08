# UHealth — backend

API FastAPI do protótipo. **Dados 100% fictícios. Autenticação DEMO (contas fictícias com senha de demonstração): não é segura e não pode ir para produção.**
Contrato de referência: [`docs/contratos-mvp.md`](docs/contratos-mvp.md) (versão 0.2.0); fonte técnica: o OpenAPI em `/openapi.json`. Arquitetura geral: [`../arquitetura.md`](../arquitetura.md). Todos os módulos são montados em `app/registro.py`; o build dos apps web (`../app`) é servido por `app/spa.py` na mesma origem.

## Rodar localmente (SQLite, sem credenciais)
```bash
cd backend
uv sync
cp .env.example .env          # liga o modo demo (sem ele, login sem senha e /docs ficam fechados)
uv run alembic upgrade head   # cria as tabelas
uv run python -m app.seed     # dados fictícios; pode rodar várias vezes
uv run uvicorn app.main:app --reload
uv run pytest -q
```
Docs: http://localhost:8000/docs · Saúde: `GET /saude` (também `/api/v1/saude`). Com os apps construídos (`npm run build` em `../app`), a mesma porta serve o paciente em `/` e as clínicas em `/clinica/`; sem build, `/` explica o que fazer. Para tudo de uma vez: `../app/iniciar.sh`.

## Postgres / Supabase
Defina `DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@HOST:5432/postgres` (no ambiente, nunca no repositório) e rode os mesmos `alembic upgrade head` + `app.seed`.
**Não use SQLite no Render**: o disco é efêmero e os dados somem. *Status:* o caminho Postgres está escrito (índice parcial e tipos compatíveis), mas **não foi testado** num Postgres real nesta entrega.

## Login DEMO
`POST /api/v1/auth/login {"conta": "paciente.ana", "senha": "demo1234"}` → `token` (senha única de demonstração em `DEMO_SENHA`; `GET /api/v1/auth/contas` lista as contas fictícias). Com `DEMO_MODE=true` também vale `POST /api/v1/auth/demo/login {"conta": ...}` (sem senha); em ambiente hospedado use `DEMO_MODE=false` e troque `DEMO_SENHA`.

**Padrões de segurança:** sem `.env`, `DEMO_MODE` é `false` (fechado). Fora do modo demo, a senha padrão `demo1234` (pública no repositório) **não é aceita**: o login responde 503 até `DEMO_SENHA` ser definida (rode o seed de novo para gravar o novo hash), e `/docs`, `/redoc` e `/openapi.json` ficam desligados. Limites por processo: 10 senhas erradas por IP a cada 5 min, 30 chamadas/min por usuário em `/acessibilidade/chat` e `/acessibilidade/tts` (429 `muitas_tentativas`). Toda resposta leva cabeçalhos de segurança (CSP, anti-iframe, nosniff; HSTS em HTTPS), definidos em `app/core/seguranca.py`; página nova que carregar algo de outro domínio precisa ser liberada na CSP.
Envie `Authorization: Bearer <token>`; envie `Authorization: Bearer <token>`. `GET /api/v1/auth/me` mostra papel/clínica **lidos do banco**; `papel`, `clinica_id` ou `paciente_id` enviados pelo cliente são ignorados. Contas: `docs/fixtures/contas-demo.json`
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
spa.py            serve app/paciente/dist em / e app/clinica/dist em /clinica/ (fallback do React Router; /api/* desconhecido = 404)
alembic/versions/  0001 base · 0002 prioridade · 0003 chat · 0004 publico_alvo · 0005 urgência · 0006 cenários · 0007 perfil · 0008 senha · 0009 profissionais · 0010 avaliações, alertas e resumos
docs/              contratos-mvp.md e fixtures/ (dados fictícios estáveis + validar.py)
scripts/           instalar_backend.py (instala dependências sem uv, usado pelo iniciar.ps1)
```
Módulos: `auth`, `saude`, `solicitacoes`, `vagas`, `agendamentos`, `prioridade`, `urgencia`, `cenarios`, `perfil`, `acessibilidade`, `profissionais`, `avaliacoes`, `alertas`, `resumos`.

- **Auth e erros únicos:** use `Depends(get_actor)` (`Actor`: `usuario_id`, `papel`, `vinculos{clinica_id: funcao}`, `tem_funcao`, `clinica_principal`) e `raise ApiError(status, codigo, mensagem)` (ou `nao_encontrado()`, `acesso_negado()`, `transicao_invalida()`, `erro_validacao()`). Formato `{"erro": {"codigo", "mensagem", "detalhes"}}` instalado num lugar só. Papel e clínica vêm do token, nunca do corpo.
- **Novo módulo:** crie `app/modulos/<m>/`, adicione 1 linha em `ROUTERS` (`app/registro.py`), 1 linha em `app/models/__init__.py` se tiver tabela, uma migração `NNNN_<m>_<descricao>` encadeada no `head` (`uv run alembic revision --autogenerate -m "<m>"`; `alembic heads` deve mostrar uma só) e `seed.run(db)` em `app/seed.py` se tiver dados fictícios. Não mexa em `main.py`.
- **Isolamento:** `modulos/solicitacoes/repositorio.py` lê pedidos **já escopados** pelo `Actor` (fora do escopo = 404). Agendamentos seguem a mesma regra.
- **Fila (#13):** `prioridade/fontes.py` lê urgência, cenários e perfil **pelos serviços dos módulos** (banco), nunca de JSON.
- **Persistência:** tudo está no banco (inclusive urgência, cenários e perfil); reiniciar a API **não** volta ao estado inicial. O seed é idempotente (`python -m app.seed` várias vezes).
- Invariantes no banco: no máximo 1 `Agendamento` não cancelado por vaga (índice único parcial); `InteresseVaga` único por (vaga, solicitação); 1 avaliação de urgência por relato; 1 interesse de cenário por (cenário, paciente).

## Agendamentos e cancelamento (contrato 0.1.3)
`GET /agendamentos[?estado=]`, `GET /agendamentos/{id}`, `POST /agendamentos/{id}/cancelar {"motivo"?}`. Paciente dono → `cancelado_antecipado` (só antes do início da vaga); funcionário da clínica → `cancelado_pela_clinica`. Nunca gera falta ou penalidade; vaga reabre (se futura); pedido `agendada` volta a `em_analise`. Veja `app/modulos/agendamentos/service.py` e o contrato §4.6.

## Chat acessível (#9)
Módulo `app/modulos/acessibilidade/` (rotas em `/api/v1/acessibilidade/...`, só paciente). Padrão `LLM_PROVIDER=mock` (sem rede e sem chave); Gemini/Claude opcionais via `.env`. Detalhes: `app/modulos/acessibilidade/README.md`. Cliente: módulo `assistente` do app do paciente (`../app/paciente`).

## Módulos da 0.2.0
- **profissionais:** profissionais fictícios, agenda e disponibilidade; `Vaga.profissional_id` opcional.
- **avaliacoes:** só após pedido `concluida`; reenviar edita; público sem nome.
- **alertas:** o evento `vaga_criada` (em `vagas.service.criar`) gera um alerta por (paciente, vaga) para quem optou; sem push.
- **resumos:** resumo fictício com aceite do paciente, revogação e auditoria (`EventoAcesso`).

## Limitações
- O seed lê `docs/fixtures/` (dentro de `backend/`) por `core.config.FIXTURES_DIR`.
- Bancos existentes (ex.: `dev.db` antigo) precisam de `uv run alembic upgrade head` (o `iniciar.sh` já faz); as migrações usam `ADD COLUMN` simples e têm teste com dados (`tests/test_migracoes.py`).
- Respostas de `GET /faltas` e do endpoint de áudio ainda não têm modelo no OpenAPI.
- Postgres: caminho escrito, **não testado** num Postgres real.
- Sem rate limit. `CORS_ORIGINS` só importa para clientes de outra origem: os apps usam a mesma origem (build servido pela API ou proxy do Vite).
