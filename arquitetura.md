# Arquitetura — UHealth 0.2

Como o sistema é montado e por quê. Quem trabalha numa frente lê este arquivo, [`frentes.md`](frentes.md) e o contrato [`backend/docs/contratos-mvp.md`](backend/docs/contratos-mvp.md). Regras do produto: [`AGENTS.md`](AGENTS.md).

## 1. Decisões (e por quê)

| Decisão | Motivo |
|---|---|
| **Tudo é web.** A apresentação é gravada e "simula um app" no navegador. | Um só alvo de build e de teste; nada de APK, Expo Go ou instalador. |
| **Duas pastas de código: `app/` (frontend) e `backend/`.** Docs, scripts e testes ficam junto de quem os usa. | Cada responsabilidade tem um lugar só; a raiz guarda apenas README, AGENTS, este arquivo, `frentes.md` e o CI. |
| **Dois apps React + Vite + TypeScript:** `app/paciente` (responsivo, mobile-first) e `app/clinica` (administração, desktop-first). | Mesmo stack permite compartilhar código e visual. "Mobile" e "desktop" significam **público e layout**, não plataforma. |
| **Workspaces npm** com dois pacotes: `app/packages/ui` e `app/packages/api-client`. | Os bugs da integração vieram de tipos escritos à mão divergindo do backend. Um cliente e um visual compartilhados eliminam essa classe de erro. |
| **O backend é a fonte da verdade do contrato.** Os tipos TypeScript são **gerados** do `/openapi.json` (`npm run gen:api`). | Mudou um schema Pydantic → regenera → o TypeScript quebra na compilação, não na demonstração. O CI falha se o arquivo gerado estiver desatualizado. |
| **Um só serviço em produção:** o FastAPI serve `/api/v1`, o paciente em `/` e a clínica em `/clinica/`. | Mesma origem: sem CORS, um deploy, uma URL para a gravação. |
| **Banco:** SQLite local, PostgreSQL (Supabase) hospedado, mesmo código via `DATABASE_URL` + Alembic. | Ambiente local sem dependências; hospedado sem mudar código. |
| **Auth demo com senha de demonstração.** Contas fictícias, uma senha única (`DEMO_SENHA`, só o hash no banco); login sem senha só com `DEMO_MODE=true`. | O link hospedado não fica aberto a quem souber o nome da conta, sem custo de um provedor de auth. Continua sendo **demo**, rotulado. |
| **Profissionais e agenda** são entidades (contrato 0.2.0). | A administração precisa ver a disponibilidade; vagas podem apontar um profissional. |

## 2. Visão geral

```
              navegador (celular ou computador) — mesma origem
   ┌───────────────────────────┬───────────────────────────────┐
   │ /            app/paciente │ /clinica/        app/clinica   │
   │ responsivo, mobile-first  │ administração, desktop-first   │
   └────────────┬──────────────┴───────────────┬───────────────┘
                │  app/packages/api-client (tipos gerados + fetch + sessão + erros)
                │  app/packages/ui (tokens, temas, componentes, SAMU 192 estático)
                ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ FastAPI  /api/v1  (backend/app)                              │
   │  core/ (config, db, auth Actor, errors ApiError, time)       │
   │  registro.py → ROUTERS de modulos/<m>/                       │
   │  spa.py → serve os builds de app/*/dist (produção)           │
   └────────────┬────────────────────────────────────────────────┘
                ▼
     SQLite (local) | PostgreSQL/Supabase (hospedado)   ← Alembic
     IA opcional (Gemini/Claude) e TTS: só no servidor, mock por padrão
```

## 3. Estrutura do repositório

```
app/                       package.json (workspaces) · tsconfig.base.json · iniciar.sh · iniciar.ps1
  paciente/                @uhealth/paciente  — Vite, base "/", porta dev 5173
    src/App.tsx · Casca.tsx · rotas.tsx (registro único)
    src/modulos/<m>/       telas + rotas.tsx de cada módulo
      assistente/chat/     chat acessível (perfil de comunicação, áudio, Libras)
  clinica/                 @uhealth/clinica   — Vite, base "/clinica/", porta dev 5174
    src/…                  mesma forma do paciente
  packages/ui/             @uhealth/ui — tokens, componentes, FaixaDemo, CartaoEmergencia
  packages/api-client/     @uhealth/api-client — schema.d.ts (gerado), cliente, sessão, login, rótulos
backend/
  app/                     main.py · registro.py · seed.py · spa.py · core/ · models/ · modulos/<m>/
  alembic/versions/        migrações lineares NNNN_<modulo>_<descricao>
  docs/                    contratos-mvp.md · fixtures/ (+ validar.py)
  scripts/                 instalar_backend.py (Windows sem uv)
  tests/                   testes de núcleo (auth, isolamento, jornada P0, migrações, spa)
.github/workflows/         backend.yml · app.yml
```

## 4. Backend

Módulos (`backend/app/modulos/<m>/`, cada um com `router.py`, `schemas.py`, `service.py`, `models.py`/`repositorio.py` se tiver tabela, `seed.py` se tiver dados fictícios e `tests/`): `auth`, `saude`, `solicitacoes`, `vagas`, `agendamentos`, `prioridade`, `urgencia`, `cenarios`, `perfil`, `acessibilidade`, `profissionais`, `avaliacoes`, `alertas`, `resumos`. O registro é `app/registro.py` (uma linha por módulo); modelos entram em `app/models/__init__.py`; seeds em `app/seed.py`.

Regras invioláveis:
- **Quem age vem do token** (`Depends(get_actor)` → `Actor`); nunca de `papel`/`clinica_id`/`paciente_id` no corpo.
- **Um formato de erro:** `ApiError` → `{"erro": {"codigo", "mensagem", "detalhes"?}}`, mensagem pt-BR pronta para a pessoa.
- **Isolamento:** recurso de outra pessoa ou clínica → `404`.
- **Fila:** `(urgencia_avaliada desc, score desc, criado_em asc, id asc)`. Só `prioridade` ordena; quem precisa de ordem chama `prioridade`.
- **Transições** só pela tabela do contrato §5, num ponto único por entidade, dentro de transação.
- **Migrações:** cadeia linear; `ADD COLUMN` simples (nada de recriar tabela referenciada: `tests/test_migracoes.py` carrega dados no esquema antigo e migra). Só a F3 cria migrações.
- **Respostas tipadas:** toda rota nova declara `response_model`; é isso que torna os tipos do frontend úteis. Respostas demo/mock trazem `modo`, `fonte` e/ou `aviso`.
- **Eventos entre módulos** são chamadas explícitas de serviço (ex.: `vagas.service.criar` → `alertas.service.gerar_para_vaga`), sem barramento.

## 5. Contrato e cliente compartilhado

Fluxo de uma mudança de API:
1. Quem altera `schemas.py`/`router.py` atualiza também `backend/docs/contratos-mvp.md` (bump de versão + changelog) **no mesmo PR**.
2. No mesmo PR roda `npm run gen:api` (em `app/`): exporta o OpenAPI do FastAPI e regenera `app/packages/api-client/src/schema.d.ts` (arquivo gerado, commitado, sem o prefixo `/api/v1`).
3. CI (`app.yml`): `npm run gen:api && git diff --exit-code` falha se esqueceram.
4. O TypeScript dos apps aponta tudo o que precisa mudar.

`@uhealth/api-client`:
- `criarApi({ baseUrl = "/api/v1", obterToken, aoNaoAutenticado })` → `{ cliente, dados, semCorpo }`. `cliente` é o `openapi-fetch` tipado pelos paths; `dados(...)` desembrulha e lança `ErroApi { status, codigo, mensagem, detalhes }` (sem conexão vira `status 0, codigo "sem_conexao"`).
- `ProvedorUHealth` (sessão + TanStack Query): token em `sessionStorage`, restaurado por `GET /auth/me`; 401 encerra a sessão; `papelEsperado` impede abrir o app da clínica com conta de paciente e vice-versa. `TelaLogin` é compartilhada.
- **Nada** de regra de negócio: ordenar fila, decidir estado ou "achar" que algo está agendado é proibido no cliente.

## 6. Frontend

Stack fixa: React 18, Vite 5, TypeScript estrito, `react-router-dom` 6, `@tanstack/react-query` 5, Vitest + Testing Library. Sem biblioteca de componentes externa: só `@uhealth/ui`.

- **Módulos de rota:** cada app tem `src/rotas.tsx` (registro único, uma linha por módulo) e `src/modulos/<m>/rotas.tsx` exportando `{ caminho, elemento, aba? }`.
- **`@uhealth/ui`:** tokens e temas (teal `#14BEB9`, Lexend + Atkinson Hyperlegible; claro, escuro, alto contraste; escala de texto), `Botao`, `Cartao`, `Selo`, `Aviso`, `Campo*`, `Carregando/Vazio/Erro`, `Abas`, `MenuLateral`, `Tabela`, `Preferencias`, `FaixaDemo` e `CartaoEmergencia` (SAMU 192, **texto estático embutido**: funciona sem rede e sem IA).
- **Paciente:** uma coluna até 480px, abas inferiores, alvos ≥ 44px; precisa ficar bom em 375×812.
- **Clínica:** menu lateral ≥ 800px, barra superior abaixo disso; tabelas viram cartões em telas estreitas.
- **Dev:** `npm run dev` (em `app/`) sobe API (8000), paciente (5173) e clínica (5174); o Vite faz proxy de `/api`, então o código usa sempre `/api/v1` relativo e não há CORS nem URL por ambiente.
- Textos pt-BR simples; "agendada" só quando a API devolveu.

## 7. Ambientes e deploy

| | Local | Hospedado (apresentação) |
|---|---|---|
| Comando | `app/iniciar.sh` (ou `--dev`) | um serviço web (Render/Fly) |
| Banco | SQLite `backend/dev.db` | PostgreSQL Supabase (`DATABASE_URL`) |
| Login | senha de demo; sem senha com `DEMO_MODE=true` | `DEMO_MODE=false` e `DEMO_SENHA` própria |
| Frontends | Vite dev com proxy, ou o build servido pela API | build servido pela API |
| IA | `LLM_PROVIDER=mock` | mock ou chave no ambiente do serviço |

Build de produção: `cd app && npm ci && npm run build`, depois `cd backend && uv sync && alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Variáveis em `backend/.env.example`. Os arquivos de deploy (Dockerfile/`render.yaml`) e os limites dos planos gratuitos ainda **não** foram escritos (F4).

## 8. Qualidade

| Camada | Ferramenta | Roda no CI |
|---|---|---|
| Fixtures | `python3 backend/docs/fixtures/validar.py` | `backend.yml` |
| Backend | `uv run pytest -q` (inclui jornada P0, isolamento, migrações com dados, spa) | `backend.yml` |
| Migrações | `alembic upgrade head` + `alembic check` + seed duas vezes | `backend.yml` |
| Contrato | `npm run gen:api && git diff --exit-code` | `app.yml` |
| App | `npm run typecheck && npm test && npm run build` | `app.yml` |
| Tudo local | `app/iniciar.sh --testes` | — |

Ainda não há teste ponta a ponta no navegador (Playwright); a jornada P0 é coberta no backend por `tests/test_jornada_p0.py` e foi percorrida à mão nos apps.

## 9. Regras de produto que a arquitetura protege

- Não diagnostica, não prescreve, não garante vaga; emergência = SAMU 192 estático em `@uhealth/ui`, sem rede/IA.
- Urgência **avaliada por profissional** sempre antes do score; relato nunca é punido; cancelamento antecipado nunca gera falta.
- Paciente escolhe antes de ir a outra clínica (sem cascata automática).
- Pedido ≠ interesse ≠ agendamento ≠ alerta; "agendada" só com confirmação do backend.
- Papel e `clinica_id` vêm do token. Mock/demo rotulado na UI e na API. Nada de push, prontuário real ou ligação automática.
- `especialidade` é campo: nada fixo em odontologia.
