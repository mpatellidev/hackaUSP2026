# Frentes de desenvolvimento — UHealth 0.2

Como quatro pessoas trabalham **ao mesmo tempo** sem conflito de arquivos, de contrato ou de estrutura. Pré-leitura: [`arquitetura.md`](arquitetura.md), [`contratos-mvp.md`](contratos-mvp.md), [`../AGENTS.md`](../AGENTS.md). Este documento substitui a tabela de donos de [`fronteiras.md`](fronteiras.md) a partir do merge da Fundação.

## Visão rápida

| Fase | Quem | O quê | Começa quando |
|---|---|---|---|
| 0 · Fundação (#33) | 1 pessoa (integração) | monorepo, pacotes, esqueletos, contrato 0.2.0 com stubs, CI | após o merge do PR da integração (#10) |
| F1 · Front Paciente (#34) | 1 pessoa | `apps/paciente` | merge da Fundação |
| F2 · Front Clínica (#35) | 1 pessoa | `apps/clinica` | merge da Fundação |
| F3 · Backend (#36) | 1 pessoa | `backend/` (exceto acessibilidade e spa) | merge da Fundação |
| F4 · IA, acessibilidade, plataforma e QA (#37) | 1 pessoa | `backend/app/modulos/acessibilidade`, `packages/*`, `e2e/`, CI, deploy | merge da Fundação |

**Por que não há conflito:** cada pasta tem **um único dono** (tabela abaixo); todo contrato novo já existe como **stub tipado** quando as frentes começam; arquivos compartilhados são poucos, de uma linha por item e com dono definido.

## Dono de cada caminho

| Caminho | Dono | Outros podem? |
|---|---|---|
| `apps/paciente/**` | F1 | não |
| `apps/clinica/**` | F2 | não |
| `backend/app/{core,models,modulos/*,registro.py,seed.py}`, `backend/alembic/**`, `backend/tests/**` | F3 | não (exceto a linha abaixo) |
| `backend/app/modulos/acessibilidade/**` | F4 | não |
| `backend/app/spa.py`, `backend/app/ui_teste*` | F4 | não |
| `packages/api-client/src/schema.d.ts` | **gerado** (`npm run gen:api`) | quem muda o backend regenera no mesmo PR |
| `packages/api-client/**` (resto), `packages/ui/**` | F4 | F1/F2 propõem por PR pequeno, F4 revisa e mergeia em até 30 min |
| `docs/contratos-mvp.md`, `docs/fixtures/**` | F3 (com bump de versão) | F4 para §9.8/chat; IDs existentes nunca mudam |
| `docs/arquitetura.md`, `docs/frentes.md`, `README.md` | F4 | PR pequeno de qualquer frente, revisado pela F4 |
| `package.json` raiz, `.github/workflows/**`, `e2e/**`, `iniciar.*` | F4 | não |

Arquivo fora da sua coluna? Abra um PR pequeno para o dono ou peça na conversa do time. **Nunca** edite "só uma linha" no arquivo alheio dentro do seu PR.

---

## Fase 0 · Fundação (antes de tudo) — #33

Objetivo: quando as frentes começarem, **pastas, contratos, tipos, componentes base, rotas e CI já existem**. Ninguém cria estrutura depois.

Entregas:
1. **Monorepo:** `package.json` raiz com workspaces `apps/*` e `packages/*`; scripts `dev`, `build`, `typecheck`, `test`, `gen:api`, `e2e`.
2. **`packages/ui`:** tokens/temas/escala de `ui/`, fontes, componentes base, `FaixaDemo`, `CartaoEmergencia` (SAMU 192 estático), `LayoutPaciente` (abas inferiores) e `LayoutClinica` (barra lateral/superior).
3. **`packages/api-client`:** gerador do OpenAPI, cliente tipado, `ErroApi`, sessão em `sessionStorage`, hooks TanStack Query, tela de login reutilizável (conta + senha, ou só conta no modo demo).
4. **`apps/paciente` e `apps/clinica`:** esqueleto com login, layout, `src/rotas.tsx` e **uma pasta por módulo** já criada (lista em F1/F2) com tela placeholder "em construção"; proxy `/api` no Vite.
5. **`backend/app/spa.py`:** serve `apps/paciente/dist` em `/` e `apps/clinica/dist` em `/clinica/` (fallback para `index.html`); `/teste/` continua até a F4 removê-lo.
6. **Contrato 0.2.0** (`docs/contratos-mvp.md`) + **stubs no backend** que respondem `501 {"erro":{"codigo":"nao_implementado"}}` com schemas Pydantic completos, para os tipos já existirem no `api-client`:
   - `Profissional {id, clinica_id, nome_exibicao, especialidade, vinculo: docente|residente|estudante_supervisionado, ativo}` e `BlocoAgenda {id, profissional_id, inicio, fim, estado: disponivel|reservado|indisponivel}`; `Vaga.profissional_id` opcional. Rotas: `GET/POST /profissionais`, `PATCH /profissionais/{id}`, `GET/POST /profissionais/{id}/agenda`, `PATCH /agenda/{id}`, `GET /clinicas/{id}/disponibilidade?data=`.
   - `POST /auth/login {conta, senha}` (senha fictícia por conta em `docs/fixtures/contas-demo.json`, hash no seed); `/auth/demo/login` só com `DEMO_MODE=true`.
   - Avaliações (§9.6), alertas (§9.7) e resumos (§9.5) com schemas completos.
   - Fixtures novas: `profissionais.json`, `agenda.json` (IDs novos, nada existente muda).
7. **Remoções:** `web/`, `mobile/`, `desktop/` (Tauri e workflow). Telas antigas ficam no histórico como referência.
8. **CI** `.github/workflows/ci.yml`: fixtures, pytest, `gen:api` sem diff, typecheck, testes dos workspaces, build.
9. `iniciar.sh`/`iniciar.ps1` e README atualizados para `npm run dev`.

Pronto quando: `npm ci && npm run build && npm test` e `uv run pytest -q` verdes; `npm run dev` abre login nos dois apps; com o build, `uvicorn` serve `/`, `/clinica/` e `/api/v1`.

---

## F1 · Front Paciente — `apps/paciente` — #34

Para quem: a pessoa que busca atendimento, no celular (layout 375px primeiro). Tudo o que o paciente faz acontece aqui, inclusive o chat.

Módulos (pastas já criadas pela Fundação):

| Módulo | Prioridade | Endpoints |
|---|---|---|
| `inicio` (resumo: pedidos ativos, próximo agendamento, atalho de urgência) | P0 | `/solicitacoes`, `/agendamentos` |
| `clinicas` (busca por cidade/especialidade, custos, contatos, avaliações) | P0 | `/clinicas`, `/clinicas/{id}`, `/clinicas/{id}/avaliacoes` |
| `pedidos` (enviar com `publico_alvo`, lista, detalhe com histórico) | P0 | `/solicitacoes`, `/solicitacoes/{id}`, `/eventos` |
| `alternativas` (quando indisponível, paciente **escolhe**) | P0 | `/solicitacoes/{id}/alternativas`, `/encaminhar` |
| `vagas` (vagas informadas, demonstrar interesse) | P0 | `/vagas`, `/vagas/{id}/interesses` |
| `agendamentos` (lista, detalhe, cancelar) | P0 | `/agendamentos`, `/agendamentos/{id}/cancelar` |
| `urgencia` (relato + texto estático SAMU 192) | P0 | `/urgencias` |
| `assistente` (chat portado de `web/`: perfil de comunicação, quick replies, áudio) | P1 | `/acessibilidade/chat*` |
| `perfil` (cidade, contato, socioeconômico opcional, acessibilidade) | P1 | `/perfil` |
| `cenarios` (cenários acadêmicos compatíveis, interesse) | P1 | `/cenarios`, `/cenarios/compatibilidade` |
| `avaliar` (avaliar clínica após `concluida`) e `alertas` | P1 | `/avaliacoes`, `/alertas` |

Não faz: regra de negócio no cliente, ordenar fila, mostrar "agendada" sem resposta do backend, prometer push ou ligação automática.
Pronto quando: jornada do paciente completa em 375×812 com dados reais da API, estados de carregando/vazio/erro em cada tela, `npm run typecheck && npm test -w apps/paciente` verdes.

## F2 · Front Clínica — `apps/clinica` — #35

Para quem: atendimento, profissionais e coordenação das clínicas-escola, no PC.

| Módulo | Prioridade | Endpoints |
|---|---|---|
| `pedidos` (lista por estado, detalhe, histórico, mudar estado: em análise, precisa contato, indisponível, concluída) | P0 | `/solicitacoes*` |
| `fila` (fila explicável com componentes do score e aviso) | P0 | `/clinicas/{id}/fila`, `/solicitacoes/{id}/prioridade` |
| `vagas` (publicar, interessados na ordem sugerida, confirmar **um**) | P0 | `/vagas*` |
| `agendamentos` (lista, concluir, cancelar pela clínica) | P0 | `/agendamentos*`, `PATCH /solicitacoes/{id}/estado` |
| `urgencias` (fila de relatos; avaliar — só `profissional`) | P0 | `/urgencias*` |
| `profissionais` (cadastro fictício, agenda, disponibilidade do dia) | P0 | `/profissionais*`, `/agenda/*`, `/clinicas/{id}/disponibilidade` |
| `faltas` (registrar — só `profissional`; revisar — `profissional`/`coordenacao`) | P1 | `/faltas*` |
| `cenarios` (publicar e ver interessados — `coordenacao`) | P1 | `/cenarios*` |
| `avaliacoes` e `resumos` (visualizar; resumo só com escolha do paciente) | P1 | `/clinicas/{id}/avaliacoes`, `/resumos*` |

Menus aparecem conforme `funcao` vinda de `/auth/me` (a API também barra: o menu é conveniência, não segurança).
Pronto quando: jornada da clínica completa em 1280px (e usável em 800px), confirmação dupla mostra a mensagem 409 da API, `npm run typecheck && npm test -w apps/clinica` verdes.

## F3 · Backend — `backend/` — #36

| Entrega | Prioridade |
|---|---|
| `profissionais` + agenda + disponibilidade (substituir stubs), `Vaga.profissional_id` | P0 |
| Login com senha (hash) + `DEMO_MODE` controlando o login sem senha | P0 |
| PostgreSQL: migrações e seed rodando em Postgres (Supabase), sem SQL específico de SQLite | P0 |
| `avaliacoes` (§9.6, só após `concluida`), `alertas` (§9.7, sem push real), `resumos` (§9.5, demo e auditável) | P1 |
| Pontos em aberto herdados: chat sem perfil → 200 com padrão; pedido duplicado após cancelamento | P1 |

Regras: uma migração por PR, cadeia linear; todo endpoint novo com teste de isolamento; todo PR que muda schema roda `npm run gen:api` e atualiza o contrato.
Pronto quando: nenhum `501` restante; `uv run pytest -q` verde em SQLite e num Postgres local (docker) ou Supabase.

## F4 · IA, acessibilidade, plataforma e QA — #37

| Entrega | Prioridade |
|---|---|
| Guardião de `packages/ui` e `packages/api-client` (revisa PRs de F1/F2 rápido) | contínua |
| `acessibilidade`: chat, TTS, `POST /acessibilidade/simplificar` (§9.8), fallback mock seguro | P0 |
| E2E Playwright da jornada P0 (paciente pede à A → indisponível → escolhe B → vaga → interesse → B confirma → agendada → cancela) em 375 e 1280 | P0 |
| Deploy único hospedado (Render/Fly + Supabase), `.env.example`, limites do plano gratuito no README | P0 |
| Remover `backend/app/ui_teste*` quando F1+F2 cobrirem a jornada | P1 |
| Roteiro da gravação (90 s) e checklist de "mock rotulado" | P1 |

Pronto quando: E2E verde no CI contra o build único; URL hospedada abre os dois apps; README explica como subir local e hospedado.

---

## Protocolo de trabalho

- **Branch e PR:** `feat/<issue>-<assunto>` a partir da `main`; PRs pequenos (≤ ~400 linhas), um assunto por PR, CI verde para mergear. Atualize sua branch com a `main` (`git pull --rebase origin main`) antes de abrir e antes de mergear.
- **Ordem de merge quando há dependência:** backend (F3) → `gen:api` no mesmo PR → fronts. Um front nunca espera: enquanto o endpoint é stub `501`, a tela mostra "em construção" a partir do erro tipado.
- **Mudança de contrato:** PR da F3 com bump em `contratos-mvp.md`, changelog e `schema.d.ts` regenerado; marque F1/F2/F4. Quebra de compatibilidade (renomear/remover campo) só com "ok" de quem consome.
- **Arquivos de registro** (`registro.py`, `models/__init__.py`, `seed.py`, `apps/*/src/rotas.tsx`): uma linha por item, em ordem alfabética, para conflitos de merge serem triviais.
- **Pacotes compartilhados:** precisa de componente novo? Crie primeiro **dentro do seu app** em `src/componentes/`; se o outro app também precisar, a F4 promove para `packages/ui`.
- **Pontos de encontro do time:** (1) logo após a Fundação, 10 min para conferir o contrato 0.2.0; (2) no meio do tempo, rodar a E2E juntos; (3) 1 h antes do fim, congelar features e só corrigir bugs para a gravação.
- **Nada de segredos** em commits; `.env.example` sem valores. Dados sempre fictícios. Rotule demo/mock.

## Mapa das issues antigas

As issues #1–#18 estão fechadas. O que ficou pendente delas foi absorvido assim:

| Antiga | Vai para |
|---|---|
| #5, #6 (mobile), #12 (telas de cenários), #18 (perfil) — telas do paciente | F1 |
| #7, #8 (desktop), #12 (telas de cenários da coordenação) | F2 |
| #15 resumos, #16 avaliações, #17 alertas, #18 perfil (backend), contrato 0.2.0 | F3 |
| #9 IA/acessibilidade, #10 integração/QA/deploy | F4 |
