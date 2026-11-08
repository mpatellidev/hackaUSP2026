# Sorriu+

Conecta pessoas de baixa renda a **clínicas-escola de saúde** (cursos de medicina e áreas da saúde). A pessoa busca clínicas na sua cidade, envia um pedido, acompanha o status e, se a clínica não puder atender, **escolhe** outra. As clínicas publicam vagas ociosas e confirmam quem será atendido.

> ⚠️ **Protótipo de hackathon (HackaUSP 2026).** Dados 100% fictícios. Login é demonstrativo e inseguro. O app **não diagnostica, não prescreve, não garante vaga** e não substitui atendimento de urgência (SAMU **192**). A decisão clínica é sempre de profissionais.

Tudo roda na **web**: o app do paciente é responsivo (pensado para o celular) e o app das clínicas é feito para o computador. Em ambos, a apresentação "simula" um aplicativo no navegador.

## Estrutura
```
app/        Frontend web (React + Vite + TypeScript), workspaces npm
  paciente/        app do paciente (mobile-first): clínicas, pedidos, vagas, agenda, urgência, assistente
  clinica/         painel das clínicas-escola (desktop-first): pedidos, fila, vagas, agenda, urgências, profissionais
  packages/ui/         design system (tokens, componentes, emergência SAMU 192 estática)
  packages/api-client/ cliente da API com tipos gerados do OpenAPI, sessão e login
  iniciar.sh · iniciar.ps1   preparam e sobem tudo
backend/    API Python/FastAPI + banco (SQLite local, PostgreSQL/Supabase hospedado)
  docs/            contrato da API (contratos-mvp.md) e fixtures fictícias
  scripts/         instalação do backend sem uv (Windows)
arquitetura.md   decisões e desenho do sistema
frentes.md       como o time trabalha em paralelo (donos de pasta, protocolo)
AGENTS.md        regras do produto e do repositório (pessoas e IAs)
```

## Como rodar
Pré-requisitos: **Python 3.11+** (com [uv](https://docs.astral.sh/uv/), opcional) e **Node.js 18+**. Dados fictícios; senha de demonstração `demo1234`.

### Linux/macOS
```bash
cd app
./iniciar.sh            # prepara, constrói e serve em http://localhost:8000
./iniciar.sh --dev      # com recarregamento: API 8000, paciente 5173, clínicas 5174
./iniciar.sh --testes   # fixtures, backend, contrato, typecheck, testes e build
```
### Windows (PowerShell)
```powershell
cd app
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1
```
Endereços (modo padrão): **paciente** http://localhost:8000/ · **clínicas** http://localhost:8000/clinica/ · **API** http://localhost:8000/docs. O script imprime também o endereço da rede local: abra no celular (mesmo Wi-Fi) para testar o layout de celular. No **app do paciente**, entre com e-mail e senha (ex.: `ana.martins@example.com` e a senha inicial `DEMO_SENHA` do `backend/.env`) ou toque em **Criar conta**. No **painel das clínicas**, use uma conta da equipe (ex.: **Gabriela Nunes** ou **Dra. Joana Prado**) e a mesma senha inicial.

### Passo a passo manual
```bash
cd backend && uv sync && cp .env.example .env
uv run alembic upgrade head && uv run python -m app.seed    # banco e dados fictícios
cd ../app && npm install && npm run build                   # constrói os dois apps
cd ../backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Testes: `uv run pytest -q` (em `backend/`), `python3 backend/docs/fixtures/validar.py` (na raiz), `npm run typecheck && npm test` (em `app/`). Detalhes: [`backend/README.md`](backend/README.md).

### IA de verdade no assistente (opcional)
Por padrão o assistente roda em **modo mock** (respostas automáticas, sem rede e sem chave; não envia pedidos). Para usar IA, edite `backend/.env` e reinicie a API:
```
LLM_PROVIDER=gemini        # ou claude
GEMINI_API_KEY=...         # ou ANTHROPIC_API_KEY=...
```
As chaves ficam só no backend, nunca no frontend.

### Problemas comuns
| Sintoma | Causa e solução |
|---|---|
| `/` mostra "O frontend ainda não foi construído" | Rode `npm run build` em `app/` (ou use `./iniciar.sh`, que já faz). |
| Erro 500 em `/urgencias`, `/perfil`… num banco antigo | Rode `uv run alembic upgrade head` em `backend/` (o `iniciar.sh` já faz). |
| "Porta 8000 em uso" | Feche o servidor anterior (`pkill -f "uvicorn app.main"`) ou troque a porta. |
| O celular não abre o endereço da rede | Firewall do computador bloqueando a porta 8000 (ou 5173/5174 em `--dev`); confirme que estão no mesmo Wi-Fi. |
| "Assistente ainda não está configurado" | `LLM_PROVIDER` é `gemini`/`claude` sem a chave. Volte para `mock` ou preencha a chave. |

## Documentação
| Documento | Para quê |
|---|---|
| [`arquitetura.md`](arquitetura.md) | Como o sistema é montado e por quê |
| [`frentes.md`](frentes.md) | Frentes paralelas, dono de cada pasta, protocolo de merge |
| [`backend/docs/contratos-mvp.md`](backend/docs/contratos-mvp.md) | Escopo, convenções de API, estados, entidades, exemplos |
| [`backend/docs/fixtures/`](backend/docs/fixtures/) | Dados fictícios estáveis (UUIDs fixos) + `validar.py` |
| [`backend/README.md`](backend/README.md) | Rodar a API, auth DEMO, módulos, migrações |
| [`AGENTS.md`](AGENTS.md) | Regras para pessoas e IAs |

## Estado atual
| Parte | Situação |
|---|---|
| Backend: pedidos, encaminhamento com escolha, vagas, interesse, confirmação única, agendamento e cancelamento | Feito |
| Backend: prioridade/faltas/fila explicável, urgência, cenários, perfil, chat acessível (mock por padrão) | Feito |
| Backend 0.2: login com senha de demo, profissionais e agenda, avaliações, alertas, resumos (demo) | Feito |
| App do paciente: clínicas, pedido, status e histórico, alternativas, vagas e interesse, agenda e cancelamento, urgência, assistente | Feito |
| App das clínicas: pedidos, fila explicável, vagas e confirmação, agendamentos, urgências, profissionais e agenda | Feito |
| Telas P1 (perfil, cenários, avaliar, alertas no paciente; faltas, cenários, avaliações, resumos nas clínicas) | **Pendentes** (o backend já existe; ver `app/*/src/modulos/*/README.md`) |
| PostgreSQL/Supabase | Escrito, **não testado** num Postgres real |
| Deploy hospedado (Render/Fly + Supabase), testes ponta a ponta no navegador (Playwright) | **Pendentes** |
| Push, SMS, ligação automática, prontuário real, mapas/GPS | **Não existem** (visão futura) |

## Prioridades do produto
**P0 — percurso principal** (sem isso não há demo): login demo · clínicas por cidade · pedido · estados e histórico · indisponibilidade → alternativas → escolha do paciente → novo pedido · vaga → interesse → confirmação única · isolamento paciente/clínica · painel da clínica.

**P1 — completam o produto:** cenários acadêmicos · score/faltas/fila · urgência · perfil e cadastro · alertas · avaliações · resumo compartilhável demo · IA/áudio.
