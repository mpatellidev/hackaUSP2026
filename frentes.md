# Frentes de desenvolvimento — UHealth 0.2

Como quatro pessoas trabalham **ao mesmo tempo** sem conflito de arquivos, de contrato ou de estrutura. Pré-leitura: [`arquitetura.md`](arquitetura.md), [`backend/docs/contratos-mvp.md`](backend/docs/contratos-mvp.md), [`AGENTS.md`](AGENTS.md).

## Estado de partida
A Fundação ([#33](https://github.com/mpatellidev/hackaUSP2026/issues/33)) está **pronta**: monorepo `app/` com os dois apps e os dois pacotes compartilhados, backend 0.2 (senha de demo, profissionais e agenda, avaliações, alertas, resumos), API servindo os apps, CI e scripts. As telas **P0** dos dois apps funcionam com a API real. As frentes abaixo continuam daí.

| Frente | Quem | Escopo | Issue |
|---|---|---|---|
| F1 · Front Paciente | 1 pessoa | `app/paciente`: telas P1 e acabamento | [#34](https://github.com/mpatellidev/hackaUSP2026/issues/34) |
| F2 · Front Clínica | 1 pessoa | `app/clinica`: telas P1 e acabamento | [#35](https://github.com/mpatellidev/hackaUSP2026/issues/35) |
| F3 · Backend | 1 pessoa | `backend/` (exceto acessibilidade e spa) | [#36](https://github.com/mpatellidev/hackaUSP2026/issues/36) |
| F4 · IA, acessibilidade, plataforma e QA | 1 pessoa | acessibilidade, `app/packages/*`, E2E, CI, deploy | [#37](https://github.com/mpatellidev/hackaUSP2026/issues/37) |

**Por que não há conflito:** cada pasta tem **um único dono** (tabela abaixo); os contratos de todas as telas pendentes **já existem** no backend e nos tipos gerados; arquivos compartilhados são poucos, de uma linha por item e com dono definido.

## Dono de cada caminho

| Caminho | Dono | Outros podem? |
|---|---|---|
| `app/paciente/**` | F1 | não |
| `app/clinica/**` | F2 | não |
| `backend/app/{core,models,modulos/*,registro.py,seed.py}`, `backend/alembic/**`, `backend/tests/**` | F3 | não |
| `backend/app/modulos/acessibilidade/**`, `backend/app/spa.py` | F4 | não |
| `app/packages/api-client/src/schema.d.ts` | **gerado** (`npm run gen:api`) | quem muda o backend regenera no mesmo PR |
| `app/packages/**` (resto) | F4 | F1/F2 propõem por PR pequeno; F4 revisa e mergeia em até 30 min |
| `backend/docs/contratos-mvp.md`, `backend/docs/fixtures/**` | F3 (com bump de versão) | F4 para a §9.8 e o chat; IDs existentes nunca mudam |
| `arquitetura.md`, `frentes.md`, `README.md`, `AGENTS.md` | F4 | PR pequeno de qualquer frente, revisado pela F4 |
| `app/package.json`, `app/iniciar.*`, `.github/workflows/**` | F4 | não |

Arquivo fora da sua coluna? Abra um PR pequeno para o dono ou peça na conversa do time. **Nunca** edite "só uma linha" no arquivo alheio dentro do seu PR.

---

## F1 · Front Paciente — `app/paciente` — #34

Para quem: a pessoa que busca atendimento, no celular (375×812 primeiro). **Pronto (P0):** início, clínicas, pedido, status e histórico, alternativas (com escolha), vagas e interesse, agenda e cancelamento, urgência, assistente.

**Falta (P1)** — cada módulo já tem pasta com README e o backend pronto:

| Módulo | O quê | Endpoints |
|---|---|---|
| `perfil` | cidade, contato, renda opcional ("prefiro não informar" vale), acessibilidade | `/perfil` |
| `cenarios` | cenários acadêmicos compatíveis, demonstrar e retirar interesse | `/cenarios`, `/cenarios/compatibilidade`, `/cenarios/{id}/interesses` |
| `avaliar` | avaliar a clínica após pedido concluído; ver nota das clínicas | `/avaliacoes`, `/clinicas/{id}/avaliacoes` |
| `alertas` | ligar/desligar alertas de vaga, lista, marcar como lido (sem push) | `/alertas`, `/alertas/preferencia` |

Também: o assistente hoje trata 404 ao buscar perfil de chat; testes das telas P0 (hoje há só o da urgência); ajuste fino de layout em 360px e em escala de texto grande.
Pronto quando: jornada completa em 375×812 com a API real, carregando/vazio/erro em cada tela, `npm run typecheck && npm test` verdes.

## F2 · Front Clínica — `app/clinica` — #35

Para quem: atendimento, profissionais e coordenação das clínicas-escola, no computador. **Pronto (P0):** pedidos, fila explicável, vagas e confirmação única, agendamentos (concluir/cancelar), urgências (avaliar só `profissional`), profissionais, agenda e disponibilidade.

**Falta (P1):**

| Módulo | O quê | Endpoints |
|---|---|---|
| `faltas` | registrar (só `profissional`, com justificativa) e revisar; ver a penalidade explicada | `/faltas`, `/faltas/{id}/revisao` |
| `cenarios` | publicar e ver interessados (`coordenacao`) | `/cenarios*` |
| `avaliacoes` | ver as avaliações da própria clínica | `/clinicas/{id}/avaliacoes` |
| `resumos` | criar resumo fictício (`profissional`) e ver os compartilhados com a clínica | `/resumos*` |

Também: itens do menu por função (a API já barra; o menu é conveniência), testes das telas P0, vaga com profissional na lista de interessados.
Pronto quando: jornada da clínica em 1280px (e usável em 800px), confirmação dupla mostra a mensagem 409 da API, `npm run typecheck && npm test` verdes.

## F3 · Backend — `backend/` — #36

**Pronto:** todos os módulos do contrato 0.2.0 (ver `backend/README.md`).

| Entrega | Prioridade |
|---|---|
| PostgreSQL de verdade: migrações, seed e `pytest` num Postgres (Docker ou Supabase); corrigir o que for específico de SQLite | P0 |
| `response_model` em `GET /faltas` e em `/acessibilidade/tts` (hoje sem tipo no OpenAPI) | P1 |
| `GET /acessibilidade/chat/perfil` sem perfil salvo: `200` com valores padrão em vez de `404` | P1 |
| Pedido duplicado após cancelar um agendamento (documentado como limitação) | P1 |
| Contas/`DEMO_MODE=false` para o ambiente hospedado revisadas (senha, sessão, CORS) | P1 |

Regras: uma migração por PR, cadeia linear, teste de isolamento em todo endpoint novo; todo PR que muda schema roda `npm run gen:api` e atualiza o contrato com bump de versão.

## F4 · IA, acessibilidade, plataforma e QA — #37

| Entrega | Prioridade |
|---|---|
| Guardiã de `app/packages/ui` e `app/packages/api-client` (revisa PRs de F1/F2 rápido) | contínua |
| `acessibilidade`: chat, TTS e `POST /acessibilidade/simplificar` (§9.8) com fallback mock seguro (a rota `simplificar` ainda **não existe**) | P0 |
| E2E Playwright da jornada P0 (paciente pede à A → indisponível → escolhe B → vaga → interesse → B confirma → agendada → cancela) em 375 e 1280, contra o build servido pela API, no CI | P0 |
| Deploy único hospedado (Render/Fly + Supabase): Dockerfile, `render.yaml`, `.env` de produção, limites do plano gratuito no README | P0 |
| Roteiro da gravação (90 s) e checklist de "mock rotulado" | P1 |
| Acessibilidade das telas (leitor de tela, teclado, contraste nos três temas) | P1 |

---

## Protocolo de trabalho

- **Branch e PR:** `feat/<issue>-<assunto>` a partir da `main`; PRs pequenos (≤ ~400 linhas), um assunto por PR, CI verde para mergear. Atualize sua branch com a `main` (`git pull --rebase origin main`) antes de abrir e antes de mergear.
- **Ordem de merge quando há dependência:** backend (F3) → `gen:api` no mesmo PR → fronts. Se o endpoint ainda não existe, o front não espera: trabalha com o tipo gerado e mostra o erro da API.
- **Mudança de contrato:** PR da F3 com bump em `contratos-mvp.md`, changelog e `schema.d.ts` regenerado; marque F1/F2/F4. Quebra de compatibilidade (renomear ou remover campo) só com "ok" de quem consome.
- **Arquivos de registro** (`backend/app/registro.py`, `backend/app/models/__init__.py`, `backend/app/seed.py`, `app/*/src/rotas.tsx`): uma linha por item, em ordem alfabética, para conflitos de merge serem triviais.
- **Pacotes compartilhados:** precisa de componente novo? Crie primeiro **dentro do seu app**; se o outro app também precisar, a F4 promove para `@uhealth/ui`.
- **Pontos de encontro do time:** (1) no início, 10 min para conferir o estado de partida; (2) no meio do tempo, percorrer a jornada juntos; (3) 1 h antes do fim, congelar features e só corrigir bugs para a gravação.
- **Nada de segredos** em commits; `.env.example` sem valores secretos. Dados sempre fictícios. Rotule demo/mock.
