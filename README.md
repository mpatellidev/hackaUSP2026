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
iniciar.ps1  Prepara e sobe tudo no Windows (PowerShell)
mobile/    App Android React Native/Expo para pacientes                        — issue #5 e módulos
desktop/   App Windows Tauri + React/Vite para clínicas                        — issue #7 e módulos
docs/      Contratos, fronteiras, fixtures
```

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

**Ainda NÃO existem:** `mobile/` (`npx expo start`, #5) e `desktop/` (`npm run tauri dev`, #7).

## Prioridades
**P0 — percurso principal** (sem isso não há demo): auth demo · clínicas por cidade · pedido · estados e histórico · indisponibilidade → alternativas → escolha do paciente → novo pedido · vaga → interesse → confirmação única · isolamento paciente/clínica · painel da clínica.

**P1 — completam o produto:** cenários acadêmicos (#11, #12) · score/faltas/fila (#13) · urgência (#14) · perfil e cadastro (#18) · alertas (#17) · avaliações (#16) · resumo compartilhável demo (#15) · IA/áudio (#9).

## Estado atual
| Parte | Situação |
|---|---|
| Contratos, fixtures, fronteiras (#1) | Feito |
| Backend base: banco, seed, auth DEMO, isolamento (#2) | Feito |
| Prioridade, faltas e fila explicável (#13) | Feito |
| Chat acessível com IA (#9): backend + `web/` | Feito (mock por padrão; Gemini/Claude opcionais) |
| Rotas de pedidos (#3), vagas (#4), mobile (#5), desktop (#7) e demais módulos | Pendentes |
