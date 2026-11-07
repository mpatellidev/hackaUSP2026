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
