# Contratos do MVP — UHealth

> **Versão `0.1.3-rascunho`** · protótipo de hackathon · dados 100% fictícios.
> Este é o documento de referência das issues #1–#18. Mudanças seguem o processo em [`fronteiras.md`](fronteiras.md#como-mudar-um-contrato).

| Versão | Mudança |
|---|---|
| 0.1.3-rascunho | Pedido `enviada` também pode demonstrar interesse em vaga (§5, §7.3). Cancelamento de agendamento definido (§4.6, §5, §7.7, §10): `POST /agendamentos/{id}/cancelar`, `GET /agendamentos`, `GET /agendamentos/{id}`; pedido `agendada` volta a `em_analise`. |
| 0.1.2-rascunho | `Solicitacao.publico_alvo` explicita o público escolhido no pedido e permite filtrar alternativas sem inferência. |
| 0.1.1-rascunho | Falta verificada passa a ser definida: `Agendamento.desfecho`, penalidade só no score (§9.3); cancelamento antecipado sem penalidade. |
| 0.1.0-rascunho | Primeira publicação (issue #1): convenções, estados, entidades núcleo e interfaces mínimas das extensões. |

## 1. Escopo e limites

**O que é.** UHealth conecta pessoas de baixa renda a **clínicas-escola de saúde** (cursos de medicina e áreas da saúde: clínica geral, pediatria, ginecologia/obstetrícia, cardiologia, dermatologia, ortopedia, oftalmologia, saúde mental etc.). O produto é **geral para saúde**, não específico de uma especialidade. Odontologia é só mais um valor possível de `especialidade`.

> **Nota sobre as issues.** O texto original das issues falava em "solicitação odontológica", em "Sorriso Aberto" e usava um exemplo de terceiro molar; elas foram atualizadas para saúde geral e UHealth. Se algum resíduo restar, **vale este contrato**. Nenhuma frente deve fixar UI, modelo de dados ou textos em odontologia.

**O que o MVP faz:** busca de clínicas por cidade escolhida manualmente; pedido de atendimento; acompanhamento de status; indisponibilidade da clínica com alternativas; vagas ociosas com interesse e confirmação; cenários acadêmicos; fila explicável; relato de urgência; resumo compartilhável (demo); avaliação de clínicas; alertas; acessibilidade (texto simples, áudio).

**O que o MVP NÃO faz (e a UI nunca deve sugerir):**
- Não diagnostica, não prescreve, não dá orientação clínica personalizada.
- Não garante vaga, atendimento, custo ou prazo. **Pedido ≠ agendamento.**
- Não substitui atendimento de urgência. Sinal grave → orientação estática de emergência (**SAMU 192**), fora da fila.
- Não envia SMS, WhatsApp ou push (o app atualiza sob demanda). Botão de telefone só abre o discador.
- Não é prontuário real, não tem conformidade clínica ou legal validada (LGPD, CFM etc.).

**Regras de decisão (valem para todas as frentes):**
1. A verificação e a priorização clínica são **humanas** (funcionário com função `profissional`).
2. **Urgência avaliada por profissional vem sempre antes** de score e falta.
3. Relato de urgência pelo paciente gera revisão humana e **nunca** gera punição.
4. O **paciente escolhe** antes de ser encaminhado a outra clínica. Recusa/indisponibilidade não cria novo pedido sozinha. Sem cascata automática.
5. Só **falta verificada** por humano (com justificativa e revisão possível) entra no score.
6. Dados socioeconômicos são opcionais ("prefiro não informar") e nunca ficam visíveis a outros pacientes.
7. Tudo que é mock, demo ou simulado é **rotulado** como tal na UI e na API (`modo: "demo"`).

## 2. Convenções de API

- Base: `/api/v1`. JSON UTF-8. OpenAPI em `/docs` e `/openapi.json`. Saúde: `GET /saude`.
- Campos em `snake_case` sem acento (`clinica_id`, `criado_em`). Valores de enum em `snake_case` sem acento. Textos para pessoas em pt-BR.
- **IDs:** UUID v4 em string minúscula.
- **Horários:** ISO 8601 **com fuso** (`2026-11-07T10:12:00-03:00`). A entrada aceita qualquer offset; o servidor armazena em UTC e responde em `America/Sao_Paulo` (`-03:00`). Horário sem fuso → erro `validacao`.
- **Listas:** `{"itens": [...], "total": 3}`; filtros por query string (`?cidade=São Paulo&estado=enviada`). Sem paginação no MVP.
- **Autoria:** quem faz a ação é sempre derivado do token, nunca do corpo.
- **Resposta de criação:** `201` com o recurso criado. **Transições:** `200` com o recurso atualizado.

### Erros

Formato único em qualquer erro:

```json
{
  "erro": {
    "codigo": "vaga_ja_preenchida",
    "mensagem": "Esta vaga já foi preenchida. Veja outras vagas disponíveis.",
    "detalhes": {"vaga_id": "f1000000-0000-4000-8000-000000000001"}
  }
}
```

`mensagem` é texto pt-BR pronto para o usuário (sem jargão, sem stack trace). `detalhes` é opcional e nunca contém dados de outras pessoas.

| HTTP | `codigo` | Quando |
|---|---|---|
| 400/422 | `validacao` | Corpo inválido, horário sem fuso, enum desconhecido. `detalhes.campos` lista os campos. |
| 401 | `nao_autenticado` | Token ausente, inválido ou expirado. |
| 403 | `acesso_negado` | Papel/clínica sem permissão (ex.: funcionário de A vendo pedido de B). Para recursos de outra pessoa, preferir 404 para não revelar existência. |
| 404 | `nao_encontrado` | Recurso inexistente **ou** fora do escopo do usuário. |
| 409 | `transicao_invalida` | Mudança de estado não permitida pela tabela da seção 5. |
| 409 | `solicitacao_duplicada` | Já existe pedido ativo do mesmo paciente na mesma clínica e especialidade. |
| 409 | `vaga_ja_preenchida` | Vaga já tem confirmação (inclui corrida concorrente). |
| 409 | `clinica_sem_recebimento` | Clínica com `recebendo_pedidos: false`. |
| 503 | `servico_indisponivel` | Dependência opcional fora do ar (ex.: IA). Com resposta segura de fallback quando possível. |

## 3. Autenticação demonstrativa

> ⚠️ **Autenticação DEMO. Não é segura e não pode ir para produção.** Não há senha. Qualquer pessoa que conheça o nome da conta entra. Toda resposta de autenticação carrega `"modo": "demo"` e as UIs devem exibir o selo "Conta fictícia · demonstração".

- `POST /auth/demo/login` com `{"conta": "paciente.ana"}` → `200`:
  ```json
  {
    "modo": "demo",
    "token": "<opaco, gerado pelo servidor>",
    "expira_em": "2026-11-07T18:00:00-03:00",
    "usuario": {"id": "a1000000-0000-4000-8000-000000000001", "papel": "paciente", "nome_exibicao": "Ana M."}
  }
  ```
- Envio: `Authorization: Bearer <token>`. `GET /auth/me` devolve o usuário (e, para funcionário, `clinica_id` e `funcao`).
- **Papel e `clinica_id` vêm sempre do servidor**, a partir do token. Qualquer `papel`, `clinica_id` ou `paciente_id` enviado no corpo para fins de autorização é **ignorado**.
- **Papéis:** `paciente`; `funcionario` com `funcao` ∈ `atendimento` (pedidos e vagas), `profissional` (também avalia urgência e registra falta efetiva), `coordenacao` (também gerencia cenários e vínculos).
- **Regras de acesso:** paciente vê só os próprios dados; funcionário vê só dados da própria clínica (via `vinculos`). Clínica não vê perfil socioeconômico bruto de pacientes de outras clínicas.
- Contas: [`fixtures/contas-demo.json`](fixtures/contas-demo.json). Nenhuma chave de serviço no cliente.

## 4. Entidades núcleo

Todas têm `id` (UUID) e, quando aplicável, `criado_em`. Exemplos completos em [`fixtures/`](fixtures/).

### 4.1 Usuario
```json
{"id": "a1000000-0000-4000-8000-000000000001", "papel": "paciente", "nome_exibicao": "Ana M.", "ativo": true}
```
Funcionário: `"papel": "funcionario", "funcao": "atendimento"`. Vínculo funcionário↔clínica em `VinculoClinica` (`usuario_id`, `clinica_id`, `funcao`).

### 4.2 Clinica
```json
{
  "id": "c1000000-0000-4000-8000-000000000001",
  "nome": "Clínica-Escola A",
  "cidade": "São Paulo", "uf": "SP",
  "publico": ["adultos"],
  "especialidades": ["clinica_geral", "cardiologia", "dermatologia"],
  "custo_informado": "gratuito",
  "recebendo_pedidos": true,
  "telefone": "(11) 0000-0001"
}
```
- `custo_informado` ∈ `gratuito | a_confirmar | pago_informado`. É **informado pela clínica**; a UI diz que custo e serviços dependem de confirmação da instituição.
- `publico` ⊂ `adultos | criancas | gestantes | idosos`.
- `especialidades` é vocabulário aberto e versionado (v0): `clinica_geral, pediatria, ginecologia_obstetricia, cardiologia, dermatologia, ortopedia, oftalmologia, saude_mental, odontologia, fisioterapia, nutricao`. Novos valores entram por PR neste documento.
- Telefone sempre fictício `(DD) 0000-XXXX`.
- `GET /clinicas?cidade=&especialidade=` — lista (paciente autenticado). `GET /clinicas/{id}`.

### 4.3 Solicitacao (pedido)
```json
{
  "id": "b1000000-0000-4000-8000-000000000002",
  "paciente_id": "a1000000-0000-4000-8000-000000000001",
  "clinica_id": "c1000000-0000-4000-8000-000000000002",
  "estado": "agendada",
  "especialidade": "clinica_geral",
  "publico_alvo": "adultos",
  "descricao_administrativa": "Consulta de rotina de clínica geral",
  "solicitacao_origem_id": "b1000000-0000-4000-8000-000000000001",
  "criado_em": "2026-11-04T11:30:00-03:00",
  "atualizado_em": "2026-11-07T08:50:00-03:00"
}
```
- `descricao_administrativa`: texto curto (≤ 280) em linguagem geral. **Sem dados clínicos sensíveis no MVP** (sem sintomas detalhados, exames, diagnósticos). A UI orienta isso.
- `publico_alvo` ∈ `adultos | criancas | gestantes | idosos`: escolha explícita do paciente para confirmar se a clínica atende o público pretendido. Não é inferido nem usado para priorização clínica.
- `solicitacao_origem_id`: preenchido só em pedido criado por encaminhamento escolhido (seção 6).
- Criação: `POST /solicitacoes` `{"clinica_id", "especialidade", "publico_alvo", "descricao_administrativa"}` — `paciente_id` vem do token. Cria o evento `criada`.

### 4.4 EventoSolicitacao (histórico)
```json
{
  "id": "e1000000-0000-4000-8000-000000000003",
  "solicitacao_id": "b1000000-0000-4000-8000-000000000001",
  "tipo": "transicao",
  "estado_anterior": "em_analise",
  "estado_novo": "indisponivel",
  "autor_usuario_id": "a1000000-0000-4000-8000-000000000011",
  "autor_papel": "funcionario",
  "motivo": "Sem agenda disponível neste período.",
  "criado_em": "2026-11-04T09:05:00-03:00"
}
```
`tipo` ∈ `criada | transicao | encaminhamento_escolhido | interesse_registrado | confirmacao`. Todo evento tem autor e horário. Histórico é **append-only**: nunca se apaga nem edita. `GET /solicitacoes/{id}/eventos`.
`motivo` é **administrativo** (ex.: "sem agenda", "falta contato"); nunca clínico.

### 4.5 Vaga
```json
{
  "id": "f1000000-0000-4000-8000-000000000001",
  "clinica_id": "c1000000-0000-4000-8000-000000000002",
  "especialidade": "clinica_geral",
  "inicio": "2026-11-12T14:00:00-03:00", "fim": "2026-11-12T14:30:00-03:00",
  "estado": "preenchida"
}
```
`estado` ∈ `aberta | preenchida | cancelada`.

### 4.6 InteresseVaga e Agendamento
```json
{"id": "d1000000-0000-4000-8000-000000000001", "vaga_id": "f1000000-…-0001", "solicitacao_id": "b1000000-…-0002", "paciente_id": "a1000000-…-0001", "estado": "confirmado"}
```
`InteresseVaga.estado` ∈ `registrado | confirmado | nao_selecionado | retirado`.
`Agendamento` (`vaga_id`, `solicitacao_id`, `paciente_id`, `clinica_id`, `estado` ∈ `agendado | concluido | cancelado`, `desfecho` ∈ `pendente | compareceu | falta_registrada | cancelado_antecipado | cancelado_pela_clinica`, `confirmado_por`, `confirmado_em`) só existe depois da confirmação por funcionário. `desfecho` é preenchido por humano; `falta_registrada` exige um `RegistroFalta` confirmado (§9.3).

### 4.7 Pedido × interesse × agendamento × alerta

| Conceito | O que significa | Quem cria | Garante atendimento? |
|---|---|---|---|
| **Pedido** (`Solicitacao`) | Paciente pede atendimento a uma clínica | Paciente | Não |
| **Alerta** (`Alerta`, #17) | Aviso dentro do app de que surgiu vaga | Sistema, após vaga criada | Não |
| **Interesse** (`InteresseVaga`) | Paciente diz que quer aquela vaga | Paciente | Não |
| **Agendamento** (`Agendamento`) | Clínica confirmou **uma** pessoa na vaga | Funcionário | Sim, no horário confirmado |

A UI só escreve "agendada" quando o backend devolve `estado: "agendada"`.

## 5. Máquina de estados da solicitação

Estados: `enviada`, `em_analise`, `precisa_contato`, `indisponivel`, `aguardando_confirmacao`, `agendada`, `concluida`.
**Pedido ativo** = `enviada`, `em_analise` ou `precisa_contato`.

```
enviada ──► em_analise ◄──► precisa_contato
   │             │                 │
   └─────────────┴────────┬────────┘
                          ▼
                    indisponivel  (terminal para este pedido)

enviada / em_analise / precisa_contato ──(paciente demonstra interesse em vaga)──► aguardando_confirmacao
aguardando_confirmacao ──(funcionário confirma a vaga)──► agendada ──► concluida
aguardando_confirmacao ──(interesse retirado ou vaga dada a outra pessoa, sem outro interesse)──► em_analise
```

| De | Para | Quem | Observações |
|---|---|---|---|
| `enviada` | `em_analise` | funcionário da clínica | |
| `enviada`, `em_analise`, `precisa_contato` | `indisponivel` | funcionário da clínica | `motivo` administrativo obrigatório |
| `em_analise` | `precisa_contato` | funcionário da clínica | `motivo` obrigatório (ex.: "faltam informações de contato") |
| `precisa_contato` | `em_analise` | funcionário da clínica | |
| `enviada`, `em_analise`, `precisa_contato` | `aguardando_confirmacao` | **sistema**, ao paciente registrar interesse | Interesse não é agendamento; a clínica ainda confirma depois |
| `aguardando_confirmacao` | `agendada` | funcionário, ao confirmar a vaga | Único caminho para `agendada` |
| `aguardando_confirmacao` | `em_analise` | sistema | Interesse retirado / vaga dada a outro e nenhum outro interesse `registrado` |
| `agendada` | `concluida` | funcionário da clínica | Habilita avaliação da clínica (#16) |

Qualquer outra transição → `409 transicao_invalida`. Estados `indisponivel` e `concluida` são terminais. A falta **não cria estado novo**: o pedido segue para `concluida` e o desfecho vai no `Agendamento.desfecho` (§4.6). A penalidade existe só como componente do score (§9.3), nunca como bloqueio de pedido.

## 6. Encaminhamento com escolha do paciente

Fluxo da recusa: clínica A marca `indisponivel` → o paciente é **informado** → o paciente **vê alternativas** → o paciente **escolhe** (ou não) → só então nasce um novo pedido.

1. `GET /solicitacoes/{id}/alternativas` (paciente dono; só se `estado = indisponivel`). Sugestão por critérios **simples e explícitos**, devolvidos na resposta:
   ```json
   {"criterios": ["mesma_cidade", "publico_compativel", "recebendo_pedidos", "mesma_especialidade"],
    "itens": [{"clinica": {"id": "c1000000-0000-4000-8000-000000000002", "nome": "Clínica-Escola B", "cidade": "São Paulo", "custo_informado": "a_confirmar", "telefone": "(11) 0000-0002"}}],
    "aviso": "Sugestão não é garantia de vaga nem de atendimento."}
   ```
   Lista vazia é resposta válida (a UI mostra estado "sem alternativas agora").
2. `POST /solicitacoes/{id}/encaminhar` `{"clinica_destino_id": "..."}` — **somente o paciente dono**. Antes de enviar, a UI mostra quais informações serão compartilhadas (**dados mínimos**: nome de exibição, cidade, contato preferido, especialidade, descrição administrativa). Cria uma **nova** `Solicitacao` com `solicitacao_origem_id` e o evento `encaminhamento_escolhido`. `201`.
3. Se o paciente **não** escolher, o pedido original permanece `indisponivel`, com histórico; nada é enviado.
4. Proibido: encaminhamento automático, em cascata, ou feito pela clínica. Duplicata → `409 solicitacao_duplicada`.
5. Resumo clínico/prontuário só acompanha o encaminhamento pelo fluxo de consentimento da #15.

## 7. Vagas, interesse e confirmação

1. **Publicar:** funcionário da clínica → `POST /vagas` `{"especialidade", "inicio", "fim"}` (`clinica_id` do token). Emite evento `vaga_criada` (consumido pela #17 para criar alertas).
2. **Ver:** paciente com **pedido ativo** na clínica → `GET /vagas?clinica_id=`. Sem pedido ativo → lista vazia/`403`.
3. **Interesse:** `POST /vagas/{id}/interesses` `{"solicitacao_id"}` — paciente dono do pedido ativo. Cria `InteresseVaga.registrado` e leva o pedido a `aguardando_confirmacao` (o pedido pode estar `enviada`, `em_analise` ou `precisa_contato`). **Não é agendamento.**
4. **Confirmar:** funcionário → `POST /vagas/{id}/confirmar` `{"interesse_id"}`. Em **uma transação** (ou restrição única): interesse → `confirmado`, vaga → `preenchida`, pedido → `agendada`, cria `Agendamento`. Os demais interesses → `nao_selecionado`. **No máximo um confirmado por vaga**; segunda tentativa → `409 vaga_ja_preenchida`. Recusar/não selecionar não altera outros pacientes.
5. **Priorização para oferta:** a ordem sugerida dos interessados vem do serviço da #13 (nunca de uma fila paralela); urgência avaliada sempre primeiro. A decisão final é do funcionário.
6. Sem SMS/WhatsApp/push; o app atualiza sob demanda.

## 8. Fluxo ponta a ponta (roteiro da #10)

Persona: **Ana** (`paciente.ana`). Dados em [`fixtures/`](fixtures/): `solicitacoes.json` (pedidos 1 e 2), `eventos.json`, `vagas.json`, `interesses.json`, `agendamentos.json`.

| # | Ator | Ação | Resultado |
|---|---|---|---|
| 1 | Ana | Escolhe a cidade São Paulo e vê as clínicas | Clínica-Escola A e B "recebendo pedidos"; C fechada |
| 2 | Ana | `POST /solicitacoes` → Clínica A | Pedido 1 `enviada` (evento `criada`) |
| 3 | Atendimento A | Abre o pedido no desktop; marca `em_analise` | Evento `transicao` |
| 4 | Atendimento A | Marca `indisponivel`, motivo "Sem agenda disponível neste período." | Pedido 1 `indisponivel` |
| 5 | Ana | Vê o aviso e `GET …/alternativas` | Clínica-Escola B sugerida; **nada enviado ainda** |
| 6 | Ana | Confirma o que será compartilhado e `POST …/encaminhar` → B | Pedido 2 `enviada`, `solicitacao_origem_id` = pedido 1 |
| 7 | Atendimento B | Marca `em_analise`; publica vaga 12/11 14h | Vaga 1 `aberta`; alerta para pacientes elegíveis |
| 8 | Ana | Abre a vaga e demonstra interesse | Interesse `registrado`; pedido 2 `aguardando_confirmacao` |
| 9 | Atendimento B | Confirma Ana | Vaga `preenchida`; pedido 2 `agendada`; interesse de Eva → `nao_selecionado` |
| 10 | Ana | Atualiza o app | Vê "agendada" e o histórico completo dos dois pedidos |

Casos de erro a exercitar: Atendimento A tenta ver o pedido 2 → 404; segunda confirmação da vaga 1 → `409 vaga_ja_preenchida`; Eva (outra paciente) consulta pedido de Ana → 404.

## 9. Interfaces mínimas das extensões

Só forma de entrada/saída. **Regras funcionais pertencem à issue dona.** Cada módulo registra seu próprio roteador (ver [`fronteiras.md`](fronteiras.md#pontos-de-montagem)).

### 9.1 Cenários acadêmicos — #11 (backend) / #12 (telas)
```json
{
  "id": "c2000000-0000-4000-8000-000000000001", "clinica_id": "c1000000-0000-4000-8000-000000000001",
  "titulo": "Consulta supervisionada de rotina com estudantes",
  "descricao_leiga": "Estudantes de medicina, acompanhados por professores, fazem uma consulta de rotina. A avaliação é sempre feita por profissionais.",
  "requisitos": ["Ter 18 anos ou mais"], "publico": "adultos",
  "cidade": "São Paulo", "uf": "SP", "especialidade": "clinica_geral",
  "estado": "ativo", "publicado_em": "2026-11-01T09:00:00-03:00"
}
```
`estado` ∈ `ativo | pausado`. Requisitos **não diagnósticos**: o app nunca conclui condição de saúde a partir de texto ou foto. Interesse (`InteresseCenario`: `registrado | retirado`) é separado de confirmação, avaliação profissional e agendamento. Saída para a #13: `compatibilidade_academica` ∈ `{"correspondente": bool, "cenario_id": uuid|null}` — **sinal de entrada**, sem prioridade clínica.
Endpoints: `GET /cenarios?cidade=&interesse=` (paciente: só `ativo`), `POST/PATCH /cenarios` (funcionário; coordenação), `POST /cenarios/{id}/interesses`.

### 9.2 Perfil — #18 (telas) com autenticação da #2
```json
{
  "usuario_id": "a1000000-0000-4000-8000-000000000001",
  "cidade": "São Paulo", "uf": "SP", "contato_preferido": "telefone",
  "socioeconomico": {"informado": true, "faixa_renda_familiar": "ate_1_salario_minimo", "finalidade": "Apoiar a fila explicável (#13). Opcional."},
  "acessibilidade": {"texto": "grande", "linguagem": "simples", "audio": true, "tema": "sistema"}
}
```
`socioeconomico`: `{"informado": false, "prefiro_nao_informar": true}` é válido e **não impede solicitação**. `contato_preferido` ∈ `app | telefone`. `acessibilidade.texto` ∈ `normal | grande | extra_grande`; `linguagem` ∈ `simples | detalhada`; `tema` ∈ `sistema | claro | escuro | alto_contraste`. Escolhas do usuário, sem inferir por idade/escolaridade. **Não coletar** documento, endereço preciso ou dado clínico. `GET/PUT /perfil` (apenas o próprio usuário).

### 9.3 Prioridade, score e faltas — #13 (backend), consumido por #7/#8
```json
{
  "solicitacao_id": "b1000000-0000-4000-8000-000000000004", "clinica_id": "c1000000-0000-4000-8000-000000000001",
  "urgencia_avaliada": true, "score": 41.0, "versao_pesos": "demo-0.1",
  "componentes": [{"nome": "tempo_espera", "valor": 26, "peso": 1.0, "fonte": "solicitacao.criado_em"}]
}
```
Componentes: `socioeconomico`, `necessidade_academica`, `tempo_espera`, `falta_verificada` (valor desconhecido = 0, documentado). **Ordenação:** `(urgencia_avaliada desc, score desc, criado_em asc, id asc)` — urgência avaliada precede qualquer score. Pesos são **ilustrativos**, versionados e **não são critério clínico**. `GET /clinicas/{id}/fila` (funcionário da clínica) devolve itens ordenados + `aviso`.
`RegistroFalta`: `{id, paciente_id, agendamento_id, registrada_por, justificativa, estado: confirmada|revertida, revisao}`. Só `profissional`, só com justificativa, sempre revisável com auditoria. Ausência de resposta, cancelamento antecipado, problema da clínica e relato de urgência não confirmado **nunca** geram falta.

**Penalidade por falta (sistema de score).** A falta é o único "problema" que pesa no score, e só quando `RegistroFalta.estado = confirmada`. Fluxo: `profissional` registra a falta com justificativa → entra como componente `falta_verificada` (valor negativo, peso configurável, ex. `-10` por falta confirmada, com teto) → pode ser **revertida** em revisão, o que remove a penalidade e fica auditado. A penalidade só reduz o `score`; **não bloqueia pedidos** e **nunca passa à frente de `urgencia_avaliada`**. O paciente vê o motivo e pode contestar. Valores são ilustrativos (`versao_pesos`).

### 9.4 Urgência — #14
`RelatoUrgencia`: `{id, paciente_id, solicitacao_id|null, estado: aguardando_avaliacao|avaliada, criado_em}`. `AvaliacaoUrgencia`: `{id, relato_id, avaliador_usuario_id, classificacao: urgencia_confirmada|sem_urgencia, observacao_administrativa, avaliado_em}`. **Só `funcao = profissional` cria avaliação** (senão `403`). Sinal grave: o **app** mostra texto estático revisado com **SAMU 192**, sem depender de rede, IA, vaga ou fila. Rótulo inicial "aguardando avaliação", sem prometer contato imediato.
`POST /urgencias`, `GET /urgencias` (paciente: próprios; funcionário: da clínica), `POST /urgencias/{id}/avaliacao`.

### 9.5 Resumo compartilhável (demo) — #15
`ResumoProntuario` `{id, paciente_id, clinica_autora_id, campos: [{nome, valor}], criado_por, criado_em}` (conteúdo fictício) · `Compartilhamento` `{id, resumo_id, clinica_destino_id, campos_compartilhados[], finalidade, aceite: aceito|recusado, aceito_em, revogado_em|null}` · `EventoAcesso` `{id, resumo_id, usuario_id, clinica_id, tipo: consulta|criacao|aceite|recusa|revogacao, criado_em}`. Envio **só ao destino escolhido pelo paciente**, após ver campos e destino. Revogação vale para acessos futuros; histórico preservado. Aviso fixo: "registro de escolha não basta para exigências legais; não é prontuário real". Dados de saúde **nunca** vão à IA.

### 9.6 Avaliação de clínica — #16
`AvaliacaoClinica` `{id, clinica_id, paciente_id, solicitacao_id, nota: 1..5, comentario|null, criado_em}`. Só com solicitação `concluida` do próprio paciente; uma por paciente e atendimento (editável pelo autor). `GET /clinicas/{id}/avaliacoes` → `{media|null, quantidade, itens[]}` sem nome nem dado de saúde. Comentários fictícios.

### 9.7 Alertas — #17
`Alerta` `{id, paciente_id, vaga_id, clinica_id, evento_origem: "vaga_criada", lido: bool, criado_em}`. Gerado a partir do evento `vaga_criada` para pacientes com pedido ativo elegível que **optaram** por esse aviso; um alerta por (paciente, vaga). `GET /alertas`, `POST /alertas/{id}/lido`. Alerta ≠ reserva. Push real só se configurado **e** testado; senão não se chama funcional.

### 9.8 Mensagem simplificada — #9 (IA/acessibilidade)
`POST /acessibilidade/simplificar` `{"texto", "nivel": "simples|detalhada"}` → `{"original", "adaptado", "fonte": "mock|gemini", "aviso"}`. O original **sempre** acompanha o adaptado; nunca diagnostica, prevê vaga ou orienta clinicamente. Chave do Gemini só no servidor; modo `mock` sem rede é o padrão.

**Chat acessível (#9)** — só paciente (funcionário → `403`). `GET/PUT /acessibilidade/chat/perfil` (`escolaridade`, `faixa_etaria`, `deficiencias[]`, `prefere_audio`; todos com "prefiro não dizer"). `POST /acessibilidade/chat` `{"message", "conversation_id"?}` → `{"modo": "demo", "fonte": "mock|gemini|claude", "aviso", "conversation_id", "messages": [{"text", "audio"?}], "quick_replies": [{"label", "value"}], "ui_prefs"}`. A IA age como o paciente do token: lê clínicas, pedidos, histórico e agendamentos **confirmados**, e pode **enviar pedido** (§4.3, com confirmação explícita). Nunca cria, muda ou cancela agendamento; sinal grave → SAMU 192.

## 10. Pontos em aberto (decidir antes da integração)

- ~~Desfecho de falta~~ resolvido na 0.1.1 (ver §4.6 e §9.3). Resta decidir o fluxo de **cancelamento** de agendamento (endpoint e quem pode), a cargo da #4.
- Vocabulário de `especialidades` pode crescer; mudanças via PR neste documento.
- Expiração real de token demo e política de sessão (decisão da #2).
- Numeração: títulos das issues vão de "00" a "17", os números reais do GitHub são +1 (título "00" = #1). Neste repositório sempre se usa o **número do GitHub**.

## 11. O que é real, mock e visão futura

| Item | Situação no MVP |
|---|---|
| API, banco, autorização por papel/clínica | Real (protótipo) |
| Login | **Demo**, sem senha |
| Dados | **Fictícios** |
| Gemini | Opcional; `mock` por padrão |
| Push, SMS, WhatsApp | **Não existe** |
| Ligação | Só abre o discador |
| Prontuário compartilhável | **Prova de conceito** |
| Pesos do score | **Ilustrativos**, sem validação clínica |
| Mapas/GPS | **Visão futura** (cidade manual no MVP) |

## 12. Glossário

*Pedido/solicitação*: pedido de atendimento a uma clínica. *Interesse*: manifestação sobre uma vaga. *Agendamento*: horário confirmado por funcionário. *Alerta*: aviso no app. *Encaminhamento*: novo pedido a outra clínica **escolhido pelo paciente**. *Urgência avaliada*: urgência registrada por profissional. *Falta efetiva*: não comparecimento registrado e confirmado por humano.
