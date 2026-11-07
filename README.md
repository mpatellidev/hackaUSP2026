# UHealth

Conecta pessoas de baixa renda a **clínicas-escola de saúde** (cursos de medicina e áreas da saúde). A pessoa busca clínicas na sua cidade, envia um pedido, acompanha o status e, se a clínica não puder atender, **escolhe** outra. Clínicas publicam vagas ociosas e confirmam quem será atendido.

> ⚠️ **Protótipo de hackathon (HackaUSP 2026).** Dados 100% fictícios. Login é demonstrativo e inseguro. O app **não diagnostica, não prescreve, não garante vaga** e não substitui atendimento de urgência (SAMU **192**). A decisão clínica é sempre de profissionais.

## Documentação
| Documento | Para quê |
|---|---|
| [`docs/contratos-mvp.md`](docs/contratos-mvp.md) | Escopo, convenções de API, estados, entidades, fluxo e exemplos JSON |
| [`docs/fronteiras.md`](docs/fronteiras.md) | Dono de cada pasta, pontos de montagem, como mudar contratos |
| [`docs/fixtures/`](docs/fixtures/) | Dados fictícios estáveis (UUIDs fixos) + `validar.py` |
| [`AGENTS.md`](AGENTS.md) | Regras para pessoas e IAs |
| [`backend/README.md`](backend/README.md) | Como rodar a API, auth DEMO, estrutura de módulos |
| [`backend/app/modulos/acessibilidade/README.md`](backend/app/modulos/acessibilidade/README.md) | Chat acessível (#9): endpoints, ferramentas da IA, limitações |

## Estrutura
```
backend/   API Python/FastAPI + PostgreSQL/Supabase (SQLite só em dev local)   — issue #2 e módulos
           └─ app/modulos/acessibilidade/   chat acessível com IA (mock por padrão) — #9
web/       Chat acessível do paciente (React + Vite), cliente do backend         — #9
scripts/   Apoio ao iniciar.ps1 (instala as dependências do backend sem uv)
iniciar.ps1  Prepara e sobe a API e o chat no Windows (PowerShell)
iniciar.sh   Prepara e sobe API + chat + painel da clínica + app do paciente (Linux/macOS)
mobile/    App Android React Native/Expo para pacientes                        — issue #5 e módulos
desktop/   App Windows Tauri + React/Vite para clínicas                        — issue #7 e módulos
docs/      Contratos, fronteiras, fixtures
```

## Como rodar (Linux / macOS)

Pré-requisitos: **Python 3.11+** com [`uv`](https://docs.astral.sh/uv/) (ou `python3 -m venv`), **Node.js 18+** e `curl`.
```bash
./iniciar.sh            # prepara tudo, sobe os 4 serviços e imprime as URLs (Ctrl+C encerra)
./iniciar.sh --mock     # painel e app do paciente com dados simulados no próprio app
./iniciar.sh --local    # só localhost, sem liberar a rede
./iniciar.sh --testes   # fixtures + pytest + builds (web, desktop, mobile) e sai
```
O script cria `backend/.env`, roda as migrações e o seed (dados fictícios), instala o que falta e sobe, com `--host`:

| Serviço | URL | Conta de teste |
|---|---|---|
| API (docs) | http://localhost:8000/docs | |
| Chat do paciente (`web/`) | http://localhost:5173 | `paciente.ana` |
| App do paciente (`mobile/`, no navegador) | http://localhost:8081 | `paciente.ana` |
| Painel da clínica (`desktop/`, no navegador) | http://localhost:1420 | `funcionario.atendimento.a` / `.b`, `funcionario.profissional.a` |

**No celular (mesma rede Wi-Fi):** o script imprime o IP do computador e libera esse IP em `CORS_ORIGINS`; abra `http://IP-DO-PC:8081` (app), `:1420` (painel) ou `:5173` (chat) no navegador do celular. Se o firewall bloquear, libere as portas 8000, 5173, 1420 e 8081.

**Endereço da API nos clientes** (o navegador de quem abre precisa alcançá-lo; `iniciar.sh` já define):
| Cliente | Variável | Exemplo |
|---|---|---|
| `web/` | `VITE_API_URL` (sem `/api/v1`) | `http://192.168.0.10:8000` |
| `desktop/` | `VITE_API_MODO=api`, `VITE_API_URL` (**com** `/api/v1`) | `http://192.168.0.10:8000/api/v1` |
| `mobile/` | `EXPO_PUBLIC_API_MODO=api`, `EXPO_PUBLIC_API_URL` (sem `/api/v1`) | `http://192.168.0.10:8000` |

Manual (sem o script): `cd backend && uv sync && uv run alembic upgrade head && uv run python -m app.seed && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`; nos clientes, `npm install` e `npm run dev:rede` (desktop), `npm run dev -- --host` (web) ou `npm run web:rede` (mobile). Testes: `cd backend && uv run pytest -q`.

## UI de teste (navegador e celular)

A própria API serve uma UI de teste em HTML/JS puro (sem build, sem npm, funciona offline). Suba só a API e abra:

- **No computador:** http://localhost:8000/teste/ (a raiz `/` redireciona para lá)
- **No celular (mesma rede Wi-Fi):** `http://IP-DO-PC:8000/teste/`. A API precisa estar com `--host 0.0.0.0`. Para achar o IP: Linux `hostname -I`, macOS `ipconfig getifaddr en0`, Windows `ipconfig` (IPv4). Se o firewall bloquear, libere a porta 8000.

Cobre login demo (troca rápida de conta), visões de paciente e de clínica, urgência, cenários, fila de prioridade, faltas, chat (mock) e uma **jornada guiada** que executa o fluxo P0 passo a passo, com um console das requisições. Mesma origem da API: não precisa de CORS. Dados fictícios e login inseguro.

## Como rodar (Windows / PowerShell)

### Pré-requisitos
- **Python 3.11+** (em python.org, marque "Add python.exe to PATH") e **Node.js 18+**.
- Use `python`, não `python3`.
- Deixe o repositório numa pasta de caminho curto (ex.: `C:\Users\voce\Downloads\hackaUSP2026`): alguns pacotes têm nomes de arquivo muito longos e passam do limite de 260 caracteres do Windows em pastas muito fundas.
- **Não precisa do `uv`.**

### Jeito fácil: um comando
No PowerShell, na pasta do repositório:
```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1
```
O script instala o que falta (`backend\.venv`, `web\node_modules`), cria os `.env` com os valores padrão, prepara o banco com dados fictícios e abre a API e o site em **duas janelas** ("UHealth API" e "UHealth Web"). Quando tudo responde, ele abre o navegador em http://localhost:5173. Para parar, feche as duas janelas. Pode rodar de novo quando quiser: ele fecha a execução anterior antes.

Entre com uma conta fictícia de paciente (ex.: **Ana M.**). No primeiro acesso o chat faz 4 perguntas de perfil; depois use os botões ("Encontrar uma clínica", "Ver meus pedidos"…).

Testes (fixtures, API e build do site, sem abrir o app):
```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1 -Testes
```

### Jeito manual (os mesmos passos, comando a comando)
**Janela 1, API** (http://localhost:8000/docs):
```powershell
cd backend
python -m venv .venv                              # só na 1ª vez
.\.venv\Scripts\python.exe ..\scripts\instalar_backend.py
Copy-Item .env.example .env                       # só na 1ª vez (SQLite + chat em modo mock)
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
**Janela 2, site** (http://localhost:5173):
```powershell
cd web
Copy-Item .env.example .env                       # só na 1ª vez (VITE_API_URL=http://localhost:8000)
npm.cmd install
npm.cmd run dev
```
Testes manuais: `python docs\fixtures\validar.py` na raiz; `.\.venv\Scripts\python.exe -m pytest -q` dentro de `backend` (precisa ser de lá); `npm.cmd run build` dentro de `web`.

> Quem usa **uv** (Linux/Mac ou Windows com uv no PATH) pode seguir o `backend/README.md` (`uv sync`, `uv run ...`). É opcional.

### IA de verdade no chat (opcional)
Por padrão o chat roda em **modo mock** (respostas automáticas, sem rede, sem chave; não envia pedidos). Para usar IA, edite `backend\.env` e rode o `iniciar.ps1` de novo:
```
LLM_PROVIDER=gemini        # ou claude
GEMINI_API_KEY=...         # ou ANTHROPIC_API_KEY=...
```
As chaves ficam só no backend, nunca no `web/`.

### Problemas comuns
| Sintoma | Causa e solução |
|---|---|
| "a execução de scripts foi desabilitada neste sistema" | Rode exatamente `powershell -ExecutionPolicy Bypass -File .\iniciar.ps1` (não `.\iniciar.ps1` sozinho). |
| `uv` não é reconhecido | Não precisa dele: use o `iniciar.ps1` ou o jeito manual acima. (Instalado com pip, o `uv.exe` fica numa pasta fora do PATH; `python -m uv` funciona.) |
| "A porta 5173 (ou 8000) já está em uso por outro programa" | Outro programa ocupa a porta (por exemplo, um Vite antigo). Feche-o ou rode o `Stop-Process -Id ...` que o script mostra. As portas são fixas porque o backend só aceita chamadas das origens em `CORS_ORIGINS`. |
| `npm : ... npm.ps1 não pode ser carregado` | Use `npm.cmd` no lugar de `npm` (o script já faz isso). |
| No site: "Não foi possível conectar" | A janela "UHealth API" foi fechada ou mostra um erro. Rode o `iniciar.ps1` de novo. |
| `ModuleNotFoundError` estranho | Caminho da pasta longo demais (veja os pré-requisitos). Apague `backend\.venv`, mova o repositório para uma pasta curta e rode o script de novo. |
| "Assistente ainda não está configurado" | `LLM_PROVIDER` é `gemini`/`claude` sem a chave. Volte para `LLM_PROVIDER=mock` ou preencha a chave. |

> No Windows o `iniciar.ps1` sobe só a API e o chat. O painel (`desktop/`) e o app (`mobile/`) rodam com `npm run dev` / `npm run web` (veja o README de cada pasta); um script único para eles no Windows ainda não existe.

**Ainda NÃO existem / não foram testados:** APK do app do paciente (`npm run apk` depende da conta Expo/EAS); instalador do painel no Windows (gerado pelo CI, **nunca aberto em um Windows real**); teste em aparelho físico (o app foi aberto só no navegador); avaliações (#16), alertas (#17), resumo compartilhável (#15), as telas de perfil (#18) e a interface de cenários (#12). Cenários (#11), urgência (#14) e perfil (#18) têm backend montado e persistido no banco; falta só a interface. Bancos antigos precisam de `alembic upgrade head`.

## Prioridades
**P0 — percurso principal** (sem isso não há demo): auth demo · clínicas por cidade · pedido · estados e histórico · indisponibilidade → alternativas → escolha do paciente → novo pedido · vaga → interesse → confirmação única · isolamento paciente/clínica · painel da clínica.

**P1 — completam o produto:** cenários acadêmicos (#11, #12) · score/faltas/fila (#13) · urgência (#14) · perfil e cadastro (#18) · alertas (#17) · avaliações (#16) · resumo compartilhável demo (#15) · IA/áudio (#9).

## Estado atual
Integração (#10) em andamento no branch `feat/10-integracao`. Tudo com dados fictícios e login DEMO.

| Parte | Situação |
|---|---|
| Contratos, fixtures, fronteiras (#1) | Feito |
| Backend base: banco, seed, auth DEMO, isolamento (#2) | Feito |
| Pedidos, indisponibilidade, alternativas e encaminhamento escolhido (#3) | Feito; `agendada → concluida` permitido pelo funcionário |
| Vagas, interesse e confirmação única (#4) | Feito (`app/modulos/vagas/`): 409 em dupla confirmação, pedido só vira "agendada" após a confirmação. Sem emissão do evento `vaga_criada` (não há alertas) |
| Prioridade, faltas e fila explicável (#13) | Feito; lê urgência avaliada e cenários dos módulos |
| Chat acessível com IA (#9): backend + `web/` | Feito (mock por padrão; Gemini/Claude opcionais); router agora montado |
| Urgência (#14), cenários (#11) e perfil (#18), backend | Montados com `Actor`/`ApiError` do core e **persistidos no banco** (migrações 0005–0007); seed idempotente; a fila lê esses módulos pelos serviços |
| Agendamentos e cancelamento (#4) | `GET /agendamentos`, `POST /agendamentos/{id}/cancelar` (sem falta nem penalidade; vaga reabre; pedido volta a `em_analise`); contrato 0.1.3. Telas ainda não usam |
| App do paciente (`mobile/`, #5 e #6) | Clínicas, pedido (com público), andamento, alternativas, vagas/interesse e relato de urgência; roda no celular (Expo Go) e no navegador |
| Painel da clínica (`desktop/`, #7 e #8) | Solicitações, vagas e prioridade (confirma pelo interesse escolhido), urgências; responsivo; roda no navegador |
| Teste ponta a ponta da jornada P0 | `backend/tests/test_jornada_p0.py` (pytest) |
| Telas de perfil (#18), avaliações (#16), alertas (#17), resumos (#15), interface de cenários (#12) | Pendentes |
