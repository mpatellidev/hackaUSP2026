# Módulo cenários acadêmicos (issue #11)

Oportunidades acadêmicas publicadas por clínica-escola (contrato §9.1). **Protótipo, dados fictícios.** Não diagnostica, não prescreve, não promete vaga, custo ou tratamento. Interesse ≠ confirmação ≠ avaliação profissional ≠ agendamento.

## Estado da entrega
| Parte | Situação |
|---|---|
| Endpoints, schemas, regras, seed, testes | **Funcional** e **persistido no banco** (tabelas `cenarios` e `cenarios_interesses`, migração `0006`) |
| Auth e erros | Usa o `Actor` e o `ApiError` do core (token → papel e clínicas); sem sessão/erro próprios |
| Uso do sinal pela fila (#13) | **Feito**: `prioridade/fontes.py` chama `service.cenario_correspondente` |

## Executar
```bash
cd backend
uv run pytest app/modulos/cenarios
curl -s -X POST localhost:8000/api/v1/auth/demo/login -H 'content-type: application/json' -d '{"conta":"paciente.ana"}'  # token
curl -H "Authorization: Bearer <token>" "localhost:8000/api/v1/cenarios?cidade=São Paulo"
```

## Endpoints (`/api/v1`)
| Método e caminho | Quem | Regra |
|---|---|---|
| `GET /cenarios?cidade=&interesse=` | paciente / funcionário | Paciente: só `ativo`. Funcionário: todos da própria clínica. `cidade` ignora acento/caixa; `interesse` = especialidade autodeclarada. Lista vazia vem com `mensagem_vazia`. |
| `POST /cenarios` | **coordenação** | `clinica_id` vem do token; do corpo é ignorado. `publicado_em` é do servidor. |
| `GET /cenarios/{id}` | paciente / funcionário | Paciente: pausado → 404. Outra clínica → 404. |
| `PATCH /cenarios/{id}` | **coordenação** da dona | Inclui pausar/reativar (`estado`). Outra clínica → 404. |
| `POST /cenarios/{id}/interesses` | paciente | `201` na 1ª vez, `200` se repetir (idempotente; reativa se retirado). Cenário pausado → 404. |
| `DELETE /cenarios/{id}/interesses` | paciente | Marca `retirado` (200). Sem interesse → 404. |
| `GET /cenarios/{id}/interesses` | funcionário da dona | Só `paciente_id`, estado e data; sem dados pessoais. |
| `GET /cenarios/compatibilidade?paciente_id=&especialidade=` | funcionário | Sinal para a #13, restrito à clínica do token. |

Erros no formato do contrato: `401 nao_autenticado`, `403 acesso_negado`, `404 nao_encontrado`, `422 validacao` (`detalhes.campos`).

## Exemplos
Publicar (coordenação, `funcionario.coordenacao.c`):
```json
POST /api/v1/cenarios
{"titulo": "Orientação de rotina com estudantes", "descricao_leiga": "Atividade supervisionada por professores.",
 "requisitos": ["Ter 18 anos ou mais"], "publico": "adultos", "cidade": "São Paulo", "uf": "SP",
 "especialidade": "protese"}
```
Resposta `201`:
```json
{"id": "…", "clinica_id": "c1000000-0000-4000-8000-000000000003", "titulo": "Orientação de rotina com estudantes",
 "descricao_leiga": "Atividade supervisionada por professores.", "requisitos": ["Ter 18 anos ou mais"],
 "publico": "adultos", "cidade": "São Paulo", "uf": "SP", "especialidade": "protese",
 "estado": "ativo", "publicado_em": "2026-11-07T10:12:00-03:00", "meu_interesse": null}
```
Lista vazia (paciente):
```json
{"itens": [], "total": 0, "aviso": "Cenário acadêmico é um convite … não garante vaga, atendimento, custo ou prazo. Dados fictícios (demo).",
 "mensagem_vazia": "Nenhum cenário ativo encontrado para esse filtro. Tente outra cidade ou área, ou volte mais tarde."}
```
Interesse (`201`):
```json
{"id": "…", "cenario_id": "c2000000-0000-4000-8000-000000000001", "paciente_id": "a1000000-0000-4000-8000-000000000001",
 "estado": "registrado", "criado_em": "2026-11-07T10:15:00-03:00", "aviso": "Interesse registrado não é confirmação nem agendamento."}
```
Compatibilidade (entrada do score, **não é prioridade clínica**):
```json
{"correspondente": true, "cenario_id": "c2000000-0000-4000-8000-000000000001"}
```
`correspondente = true` quando o paciente tem interesse `registrado` em cenário `ativo` da clínica (e da especialidade, se informada).

## Seed
`seed.run(db)` (chamado por `app/seed.py`) lê `docs/fixtures/cenarios.json`, `interesses-cenario.json` e `fixtures/cenarios-extra.json` (IDs novos `c2…03`, `c2…04`), de forma idempotente (só insere o que falta). As fixtures de `docs/fixtures/` não foram alteradas. Atenção: só a clínica C tem conta de **coordenação**; os cenários das clínicas A e B só podem ser editados quando houver coordenação para elas.

## Integração
- **#13:** a fila usa `service.cenario_correspondente(repo, clinica_id, especialidade)` (cenário ativo da especialidade); `service.compatibilidade_academica` devolve `{"correspondente", "cenario_id"}` por paciente.
- **#12:** consome os endpoints acima; `meu_interesse` já vem na lista/detalhe do paciente.

## Limitações
Sem moderação de texto livre — o requisito/descrição é responsabilidade de quem publica e a coordenação deve evitar conteúdo diagnóstico; fuso de saída fixo -03:00.
