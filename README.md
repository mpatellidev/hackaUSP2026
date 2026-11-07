<<<<<<< HEAD
# hackaUSP2026 — Chat Acessível de Agendamento

Chat que ajuda a marcar, consultar, remarcar e cancelar atendimentos, conectado ao Google Gemini
(com o Claude como alternativa).
A forma de responder se adapta ao perfil da pessoa: escolaridade, idade e deficiência.

```
apps/
├─ api/   FastAPI + Gemini (Python)
└─ web/   React + Vite + TypeScript
```

## Como rodar

### 1. API
```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate          # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -e ".[dev]"
cp .env.example .env            # preencha GEMINI_API_KEY
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

### 2. Web
```bash
cd apps/web
npm install
npm run dev                     # http://localhost:5173
```

Usuários de teste (senha `senha123`): `maria@exemplo.com`, `joao@exemplo.com`, `ana@exemplo.com`.

### Testes
```bash
cd apps/api && pytest
```

## Como funciona

1. **Login**: a pessoa entra (hoje com um login local provisório).
2. **Perfil**: no primeiro acesso o chat faz 4 perguntas com botões (escolaridade, idade,
   deficiência, se quer áudio) e salva no banco. Nos próximos acessos, mostra os dados salvos e
   pergunta se quer continuar com eles ou atualizar.
3. **Conversa**: as mensagens vão para a IA com instruções de adaptação geradas a partir do
   perfil ([adaptation.py](apps/api/app/profile/adaptation.py)). A IA usa ferramentas (chamada de funções) para
   consultar serviços e horários, agendar, cancelar e remarcar, e também para:
   - `explicar_em_audio`: envia um áudio explicativo junto com a mensagem;
   - `oferecer_opcoes`: mostra botões de resposta rápida.

### Provedor de IA

| Variável | Padrão | O que faz |
|---|---|---|
| `LLM_PROVIDER` | `gemini` | `gemini` ou `claude` |
| `GEMINI_MODEL` | `gemini-3.5-flash` | modelo principal (rápido, ~1s por chamada) |
| `GEMINI_THINKING_LEVEL` | `low` | quanto o modelo "pensa" antes de responder; mais alto = mais lento |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.1-flash-lite` | usados em ordem se o principal estiver sobrecarregado (429/503) |

Cada provedor fica em [apps/api/app/ai/engines/](apps/api/app/ai/engines/); o restante do chat não muda ao trocar.

### Adaptações por perfil

| Perfil | Na resposta da IA | Na interface |
|---|---|---|
| Escolaridade fundamental | palavras simples, frases curtas, exemplos | — |
| 60 anos ou mais | um passo por vez, confirma entendimento | fonte maior |
| Deficiência visual | sem emojis nem referências visuais, datas por extenso, opções numeradas | áudio automático, alto contraste, fonte grande |
| Deficiência auditiva | texto completo sem depender de áudio, ordem direta | widget VLibras (Libras); áudio nunca toca sozinho |
| Motora | sempre oferece botões | ditado por voz |
| Intelectual / TEA | linguagem literal, uma pergunta por vez, resumos | — |

A pessoa também pode ajustar tudo na barra superior (tamanho do texto, contraste, áudio automático, Libras).

### Áudio
- `TTS_PROVIDER=none` (padrão): o navegador fala o texto (`speechSynthesis`, pt-BR).
- `TTS_PROVIDER=openai` + `OPENAI_API_KEY`: o servidor gera MP3 (com cache). Se falhar, cai para o navegador.
- A transcrição do áudio fica sempre disponível na tela.
- Ditado por voz (microfone) via `SpeechRecognition`, funciona no Chrome e no Edge.

## Partes provisórias (para integrar com o projeto real)

| O quê | Hoje | Para integrar |
|---|---|---|
| Agendamento | [mock_provider.py](apps/api/app/scheduling/mock_provider.py): serviços e horários fictícios, em memória | implementar `SchedulingProvider` em [http_provider.py](apps/api/app/scheduling/http_provider.py) e usar `SCHEDULING_PROVIDER=http` |
| Login | [local_provider.py](apps/api/app/auth/local_provider.py): usuários seed + JWT | implementar [external_provider.py](apps/api/app/auth/external_provider.py) para validar o token do sistema real, `AUTH_PROVIDER=external`; no front, receber o token e chamar `tokenStore.set()` |

O chat só conhece as interfaces ([scheduling/base.py](apps/api/app/scheduling/base.py),
[auth/base.py](apps/api/app/auth/base.py)), então trocar a implementação não muda o restante.
=======
# UHealth

Conecta pessoas de baixa renda a **clínicas-escola de saúde** (cursos de medicina e áreas da saúde). A pessoa busca clínicas na sua cidade, envia um pedido, acompanha o status e, se a clínica não puder atender, **escolhe** outra. Clínicas publicam vagas ociosas e confirmam quem será atendido.

> ⚠️ **Protótipo de hackathon (HackaUSP 2026).** Dados 100% fictícios. Login é demonstrativo e inseguro. O app **não diagnostica, não prescreve, não garante vaga** e não substitui atendimento de urgência (SAMU **192**). A decisão clínica é sempre de profissionais.

## Documentação
| Documento | Para quê |
|---|---|
| [`docs/contratos-mvp.md`](docs/contratos-mvp.md) | Escopo, convenções de API, estados, entidades, fluxo e exemplos JSON (v0.1.1-rascunho) |
| [`docs/fronteiras.md`](docs/fronteiras.md) | Dono de cada pasta, pontos de montagem, como mudar contratos |
| [`docs/fixtures/`](docs/fixtures/) | Dados fictícios estáveis (UUIDs fixos) + `validar.py` |
| [`AGENTS.md`](AGENTS.md) | Regras para pessoas e IAs |

## Estrutura
```
backend/   API Python/FastAPI + PostgreSQL/Supabase (SQLite só em dev local)   — issue #2 e módulos
mobile/    App Android React Native/Expo para pacientes                        — issue #5 e módulos
desktop/   App Windows Tauri + React/Vite para clínicas                        — issue #7 e módulos
docs/      Contratos, fronteiras, fixtures
```

## Comandos
Disponível **hoje**:
```bash
python3 docs/fixtures/validar.py     # valida as fixtures fictícias
```
**Esperados, ainda NÃO existem** (cada pasta será criada pela issue indicada; o nome exato pode mudar):
```bash
cd backend && uvicorn app.main:app --reload        # API em http://localhost:8000 (/docs)  — #2
cd mobile  && npx expo start                        # app Android                           — #5
cd desktop && npm run tauri dev                     # app Windows                           — #7
```

## Prioridades
**P0 — percurso principal** (sem isso não há demo): auth demo · clínicas por cidade · pedido · estados e histórico · indisponibilidade → alternativas → escolha do paciente → novo pedido · vaga → interesse → confirmação única · isolamento paciente/clínica · painel da clínica.

**P1 — completam o produto:** cenários acadêmicos (#11, #12) · score/faltas/fila (#13) · urgência (#14) · perfil e cadastro (#18) · alertas (#17) · avaliações (#16) · resumo compartilhável demo (#15) · IA/áudio (#9).

## Estado atual
Só a **fundação documental** (issue #1) existe: contratos, fixtures e fronteiras. **Nenhum** backend, app mobile ou desktop foi implementado ainda.

> A pasta `ui/` (protótipo visual HTML com tokens de design) é referência local e não faz parte deste PR.
>>>>>>> 22df24d595b0336bccd02695021a999e2e692e01
