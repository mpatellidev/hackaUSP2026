# Arquitetura — UHealth (alvo 0.2)

Fonte única de como o sistema é montado. Quem trabalha numa frente lê este arquivo, [`frentes.md`](frentes.md) e [`contratos-mvp.md`](contratos-mvp.md) antes de abrir código. Regras do produto: [`../AGENTS.md`](../AGENTS.md).

> Estado: o **backend** já está na forma descrita aqui (PR da integração #10). Os **apps web** e os **pacotes compartilhados** são criados pela **Fundação** (ver `frentes.md`, Fase 0) antes das quatro frentes começarem. Até lá, `web/`, `mobile/`, `desktop/` e `backend/app/ui_teste/` continuam existindo como legado.

## 1. Decisões (e por quê)

| Decisão | Motivo |
|---|---|
| **Tudo é web.** A apresentação é gravada e "simula um app" no navegador. | Um só alvo de build e de teste; nada de APK, Expo Go ou instalador. |
| **Dois apps React + Vite + TypeScript:** `apps/paciente` (responsivo, mobile-first) e `apps/clinica` (administração das clínicas-escola, desktop-first). | Mesmo stack nos dois lados permite compartilhar código e visual. "Mobile" e "desktop" passam a significar **público e layout**, não plataforma. |
| **Monorepo com npm workspaces** e dois pacotes: `packages/api-client` e `packages/ui`. | Os bugs da integração (#10) vieram de tipos escritos à mão divergindo do backend (`publico_alvo`, URL `/api/v1` duplicada). Um cliente e um visual compartilhados eliminam essa classe de erro. |
| **O backend é a fonte da verdade do contrato.** Tipos TS são **gerados** do `/openapi.json`. | Mudou o schema Pydantic → regenera → o TypeScript dos apps quebra na compilação, não na demo. |
| **Um só serviço em produção:** o FastAPI serve `/api/v1`, o app do paciente em `/` e o da clínica em `/clinica/`. | Mesma origem: sem CORS, um deploy, uma URL para a gravação. |
| **Banco:** SQLite local, PostgreSQL (Supabase) hospedado, mesmo código via `DATABASE_URL` + Alembic. | Ambiente local sem dependências; hospedado sem mudar código. |
| **Auth demo + senha simples:** contas fictícias com senha (hash) no hospedado; login sem senha só local (`DEMO_MODE`). | O link hospedado não fica aberto a qualquer um que saiba o nome da conta, sem custo de um provedor de auth. Continua sendo **demo**, rotulado. |
| **Profissionais + agenda** viram entidades (contrato 0.2.0). | A administração precisa ver disponibilidade dos profissionais; vagas podem apontar um profissional. |

## 2. Visão geral

```
                 navegador (celular ou PC) — mesma origem
   ┌────────────────────────────┬──────────────────────────────┐
   │  /           apps/paciente │  /clinica/     apps/clinica   │
   │  responsivo, mobile-first  │  administração, desktop-first │
   └─────────────┬──────────────┴──────────────┬───────────────┘
                 │  packages/api-client (tipos gerados + fetch + token + erros)
                 │  packages/ui (tokens, temas, componentes, SAMU 192 estático)
                 ▼
   ┌────────────────────────────────────────────────────────────┐
   │ FastAPI  /api/v1  (backend/app)                             │
   │  core/ (config, db, auth Actor, errors ApiError, time)      │
   │  registro.py → ROUTERS de modulos/<m>/                      │
   │  spa.py → serve os builds de apps/* (prod)                  │
   └─────────────┬──────────────────────────────────────────────┘
                 ▼
     SQLite (local) | PostgreSQL/Supabase (hospedado)   ← Alembic
     IA opcional (Gemini/Claude) e TTS: só no servidor, mock por padrão
```

## 3. Estrutura do repositório (alvo após a Fundação)

```
apps/
  paciente/        React+Vite — F1  (porta dev 5173, base "/")
  clinica/         React+Vite — F2  (porta dev 5174, base "/clinica/")
packages/
  api-client/      tipos gerados + cliente HTTP + hooks — F4 (guardião)
  ui/              design system (tokens de ui/, componentes) — F4 (guardião)
backend/           FastAPI — F3 (exceto modulos/acessibilidade e spa.py: F4)
docs/              contratos, arquitetura, frentes, fixtures — mudança só por PR de contrato
e2e/               Playwright, jornada ponta a ponta — F4
package.json       workspaces + scripts raiz — F4
iniciar.sh / iniciar.ps1   sobem tudo local — F4
```

**Removidos pela Fundação:** `web/` (o chat é portado para `apps/paciente`), `mobile/` (Expo), `desktop/src-tauri` e `.github/workflows/desktop-windows.yml` (Tauri). O código de telas, textos e regras de `mobile/src`, `desktop/src` e `backend/app/ui_teste/` é a **referência** para portar; não se perde, fica no histórico do git. `backend/app/ui_teste/` sai quando os dois apps cobrirem a jornada (responsabilidade da F4).

## 4. Backend

```
backend/app/
  main.py            create_app(): CORS (só dev), handlers de erro, /api/v1 + ROUTERS, spa
  registro.py        REGISTRO ÚNICO de módulos (uma linha por módulo)
  core/              config.py · db.py · auth.py (Actor) · errors.py (ApiError) · time.py
  models/            entidades núcleo compartilhadas (clinicas, usuarios, solicitacoes, vagas)
  modulos/<m>/       router.py · schemas.py · service.py · models.py? · repositorio.py? · seed.py? · tests/
  seed.py            chama seed.run(db) de cada módulo; idempotente; lê docs/fixtures
alembic/versions/    NNNN_<modulo>_<descricao>.py, cadeia linear
```

Módulos atuais: `saude`, `auth`, `solicitacoes`, `vagas`, `agendamentos`, `prioridade`, `urgencia`, `cenarios`, `perfil`, `acessibilidade`. Entram na 0.2: `profissionais` (com agenda), `avaliacoes`, `alertas`, `resumos`.

Regras invioláveis do backend:
- **Quem age vem do token** (`Depends(get_actor)` → `Actor`); nunca de `papel`/`clinica_id`/`paciente_id` no corpo.
- **Um formato de erro:** `ApiError` → `{"erro": {"codigo", "mensagem", "detalhes"?}}`, mensagem pt-BR pronta para a pessoa. Novos códigos são documentados no contrato §2.
- **Isolamento:** recurso de outra pessoa/clínica → `404`.
- **Fila:** `(urgencia_avaliada desc, score desc, criado_em asc, id asc)`. Nenhum módulo reordena a fila por conta própria; quem precisa de ordem chama `prioridade`.
- **Transições** só pela tabela do contrato §5, num ponto único por entidade (service do dono), dentro de transação.
- **Migrações:** cadeia linear; **só a F3 cria migrações** (inclusive para a F4). Número = próximo da head; o PR que cria migração roda `alembic upgrade head` em banco limpo.
- Respostas demo/mock trazem `modo`, `fonte` e/ou `aviso`.

## 5. Contrato e cliente compartilhado

Fluxo de uma mudança de API:

1. F3 altera `schemas.py`/`router.py` e `docs/contratos-mvp.md` (bump de versão + changelog) no **mesmo PR**.
2. No mesmo PR roda `npm run gen:api` (raiz): sobe a app FastAPI em memória, exporta `/openapi.json` e gera `packages/api-client/src/schema.d.ts`. O arquivo gerado é commitado.
3. CI: `npm run gen:api && git diff --exit-code` falha se alguém esqueceu de regenerar.
4. F1/F2 atualizam `main`, e o TypeScript aponta tudo o que precisa mudar.

`packages/api-client` expõe:
- `criarCliente({ baseUrl = "/api/v1", obterToken, aoNaoAutenticado })` — um `fetch` tipado pelos paths do OpenAPI; erro sempre vira `ErroApi { status, codigo, mensagem, detalhes }`.
- Sessão: token em `sessionStorage` (`uhealth.sessao.<app>`), restaurada por `GET /auth/me`; 401 → sai da sessão.
- Hooks finos sobre TanStack Query (`useConsulta`, `useMutacao`) com invalidação por chave de recurso.
- **Nada** de regra de negócio: ordenar fila, decidir estado ou "achar" que algo está agendado é proibido no cliente.

## 6. Frontend

Stack fixa nos dois apps: React 18, Vite 5, TypeScript estrito, `react-router-dom` 6, `@tanstack/react-query` 5, Vitest + Testing Library. Sem biblioteca de componentes externa: só `packages/ui`.

- **Rotas por módulo:** cada app tem `src/rotas.tsx` (registro único, dono = o app) e `src/modulos/<m>/` com telas e `rotas.ts` exportando `{caminho, rotulo, elemento, papel?}`.
- **`packages/ui`:** tokens e temas copiados de `ui/` (teal `#14BEB9`, Lexend + Atkinson Hyperlegible, temas sistema/escuro/alto contraste, escala de texto), componentes base (Botao, Campo, Cartao, Selo de estado, Carregando/Vazio/Erro, Abas, Dialogo), `FaixaDemo` ("dados fictícios · demo") e `CartaoEmergencia` (SAMU 192, **texto estático embutido**, funciona sem rede e sem IA).
- **Paciente:** layout de uma coluna até 480px, navegação inferior por abas, alvos ≥ 44px. Precisa ficar bom em 375×812 (é o que aparece na gravação).
- **Clínica:** barra lateral ≥ 800px, barra superior abaixo disso; tabelas legíveis em 1280px.
- **Dev:** `npm run dev` na raiz sobe API (8000) + paciente (5173) + clínica (5174); o Vite faz proxy de `/api` para 8000, então o código usa sempre `/api/v1` relativo e não há CORS nem URL por ambiente.
- Textos pt-BR simples; estados do pedido exibidos com rótulos do contrato; "agendada" só quando a API devolveu.

## 7. Ambientes e deploy

| | Local | Hospedado (apresentação) |
|---|---|---|
| Comando | `./iniciar.sh` ou `npm run dev` | um serviço web (Render/Fly) |
| Banco | SQLite `backend/dev.db` | PostgreSQL Supabase (`DATABASE_URL`) |
| Login | demo sem senha + com senha | só com senha (`DEMO_MODE=false` desativa o login sem senha) |
| Fronts | Vite dev com proxy | `npm run build` gera `apps/*/dist`, servidos por `backend/app/spa.py` |
| IA | `LLM_PROVIDER=mock` | mock ou chave no ambiente do serviço |

Build de produção (um comando, usado pelo serviço hospedado e pela E2E): `npm ci && npm run build && cd backend && uv sync && alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Variáveis em `backend/.env.example` (sem segredos). Limites do plano gratuito (hibernação, expiração do Postgres) ficam documentados no README pela F4.

## 8. Qualidade

| Camada | Ferramenta | Dono | Roda no CI |
|---|---|---|---|
| Fixtures | `python docs/fixtures/validar.py` | todos | sim |
| Backend | `uv run pytest -q` (inclui jornada P0) | F3 (F4 no módulo acessibilidade) | sim |
| Contrato | `npm run gen:api && git diff --exit-code` | F3 | sim |
| Pacotes e apps | `npm run typecheck && npm test` (Vitest) | F1/F2/F4 | sim |
| Ponta a ponta | Playwright sobre o build único, viewport 375 e 1280 | F4 | sim (após a Fundação) |

Workflow único `.github/workflows/ci.yml` (Fundação) em PR e push na `main`.

## 9. Regras de produto que a arquitetura protege

- Não diagnostica, não prescreve, não garante vaga; emergência = SAMU 192 estático no `packages/ui`, sem rede/IA.
- Urgência **avaliada por profissional** sempre antes do score; relato nunca é punido; cancelamento antecipado nunca gera falta.
- Paciente escolhe antes de ir a outra clínica (sem cascata automática).
- Pedido ≠ interesse ≠ agendamento ≠ alerta; "agendada" só com confirmação do backend.
- Papel e `clinica_id` vêm do token. Mock/demo rotulado na UI e na API. Nada de push, prontuário real ou ligação automática.
- `especialidade` é campo: nada fixo em odontologia.
