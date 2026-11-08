# Modelo de dados e endpoints — Sorriu+ (visão relacional)

Mapa **funcionalidade → tabelas → endpoints** para enxergar rápido o que **já existe** e o que **falta**.
Fonte: modelos SQLAlchemy em `backend/app/models/` e `backend/app/modulos/*/models.py`, rotas em `backend/app/modulos/*/router.py`, pendências em `frentes.md` e `README.md` (estado em 2026-11-07, contrato 0.2.0).

> É uma **ideia relacional** (tabelas, chaves e relações), não o DDL exato. O contrato oficial continua sendo o OpenAPI do backend e o `contratos-mvp.md`.

**Legenda de status**
- `existe` — implementado no backend (e, no caso do front, tela pronta)
- `falta_front` — backend pronto, tela ainda não existe (P1)
- `falta` — não existe em lugar nenhum ainda (planejado)
- `ajuste` — existe, mas com pendência conhecida
- `visao_futura` — fora do protótipo, não deve ser prometido na UI

Convenções: toda rota abaixo tem o prefixo `/api/v1` (exceto `GET /saude`). `id` é UUID em texto. Papel (`paciente` | `funcionario`) e `clinica_id` vêm **sempre do token**.

---

## 1. Tabelas (modelo relacional)

```json
{
  "tabelas": {
    "usuarios": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "papel": "paciente | funcionario",
        "nome_exibicao": "texto",
        "conta_demo": "texto UNIQUE (login fictício)",
        "senha_hash": "texto | null (pbkdf2, senha única de demo)",
        "ativo": "bool",
        "criado_em": "timestamp"
      }
    },
    "clinicas": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "nome": "texto",
        "cidade": "texto",
        "uf": "texto",
        "publico": "json[] (adultos, criancas, gestantes, idosos)",
        "especialidades": "json[] (campo livre, não fixo em odontologia)",
        "custo_informado": "gratuito | a_confirmar | pago_informado",
        "recebendo_pedidos": "bool",
        "telefone": "texto (sempre fictício)"
      }
    },
    "vinculos_clinica": {
      "status": "existe",
      "descricao": "N:N usuário-funcionário ↔ clínica",
      "pk": "id",
      "unique": ["usuario_id", "clinica_id"],
      "colunas": {
        "id": "uuid",
        "usuario_id": "FK usuarios.id",
        "clinica_id": "FK clinicas.id",
        "funcao": "atendimento | profissional | coordenacao"
      }
    },
    "sessoes_demo": {
      "status": "existe",
      "descricao": "Sessão de login DEMO (não segura)",
      "pk": "token_hash",
      "colunas": {
        "token_hash": "texto (só o hash é salvo)",
        "usuario_id": "FK usuarios.id",
        "expira_em": "timestamp",
        "criado_em": "timestamp"
      }
    },
    "perfis": {
      "status": "existe",
      "descricao": "1:1 com usuarios",
      "pk": "usuario_id",
      "colunas": {
        "usuario_id": "PK + FK usuarios.id",
        "cidade": "texto | null",
        "uf": "texto | null",
        "contato_preferido": "app | telefone | null",
        "socioeconomico": "json (renda opcional; 'prefiro não informar' vale)",
        "acessibilidade": "json",
        "atualizado_em": "timestamp"
      }
    },
    "solicitacoes": {
      "status": "existe",
      "descricao": "Pedido de atendimento do paciente a uma clínica",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "paciente_id": "FK usuarios.id",
        "clinica_id": "FK clinicas.id",
        "estado": "enviada | em_analise | precisa_contato | indisponivel | aguardando_confirmacao | agendada | concluida",
        "especialidade": "texto",
        "publico_alvo": "adultos | criancas | gestantes | idosos",
        "descricao_administrativa": "texto (sem dado clínico sensível)",
        "solicitacao_origem_id": "FK solicitacoes.id | null (encaminhamento escolhido pelo paciente)",
        "criado_em": "timestamp",
        "atualizado_em": "timestamp | null"
      }
    },
    "eventos_solicitacao": {
      "status": "existe",
      "descricao": "Histórico imutável do pedido",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "solicitacao_id": "FK solicitacoes.id",
        "tipo": "criada | transicao | encaminhamento_escolhido | interesse_registrado | confirmacao",
        "estado_anterior": "estado | null",
        "estado_novo": "estado | null",
        "autor_usuario_id": "FK usuarios.id",
        "autor_papel": "paciente | funcionario",
        "motivo": "texto | null (administrativo, nunca clínico)",
        "criado_em": "timestamp"
      }
    },
    "profissionais": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "clinica_id": "FK clinicas.id",
        "nome_exibicao": "texto",
        "especialidade": "texto",
        "vinculo": "docente | residente | estudante_supervisionado",
        "ativo": "bool"
      }
    },
    "agenda_blocos": {
      "status": "existe",
      "descricao": "Horários da agenda de um profissional",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "profissional_id": "FK profissionais.id",
        "inicio": "timestamp",
        "fim": "timestamp",
        "estado": "disponivel | reservado | indisponivel"
      }
    },
    "vagas": {
      "status": "existe",
      "descricao": "Horário publicado pela clínica",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "clinica_id": "FK clinicas.id",
        "especialidade": "texto",
        "inicio": "timestamp",
        "fim": "timestamp",
        "estado": "aberta | preenchida | cancelada",
        "criado_por": "FK usuarios.id",
        "profissional_id": "FK profissionais.id | null",
        "criado_em": "timestamp"
      }
    },
    "interesses_vaga": {
      "status": "existe",
      "descricao": "Paciente demonstra interesse numa vaga (≠ agendamento)",
      "pk": "id",
      "unique": ["vaga_id", "solicitacao_id"],
      "colunas": {
        "id": "uuid",
        "vaga_id": "FK vagas.id",
        "solicitacao_id": "FK solicitacoes.id",
        "paciente_id": "FK usuarios.id",
        "estado": "registrado | confirmado | nao_selecionado | retirado",
        "criado_em": "timestamp"
      }
    },
    "agendamentos": {
      "status": "existe",
      "descricao": "Só existe depois que a clínica confirma",
      "pk": "id",
      "unique_parcial": "vaga_id onde estado <> 'cancelado' (no máximo 1 agendamento ativo por vaga)",
      "colunas": {
        "id": "uuid",
        "vaga_id": "FK vagas.id",
        "solicitacao_id": "FK solicitacoes.id",
        "paciente_id": "FK usuarios.id",
        "clinica_id": "FK clinicas.id",
        "estado": "agendado | concluido | cancelado",
        "desfecho": "pendente | compareceu | falta_registrada | cancelado_antecipado | cancelado_pela_clinica",
        "confirmado_por": "FK usuarios.id",
        "confirmado_em": "timestamp"
      }
    },
    "registros_falta": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "paciente_id": "FK usuarios.id",
        "agendamento_id": "FK agendamentos.id | null",
        "clinica_id": "FK clinicas.id | null",
        "registrada_por": "FK usuarios.id (só função profissional)",
        "justificativa": "texto",
        "estado": "confirmada | revertida",
        "criado_em": "timestamp"
      }
    },
    "revisoes_falta": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "falta_id": "FK registros_falta.id",
        "acao": "reverter | manter",
        "motivo": "texto",
        "revisor_id": "FK usuarios.id",
        "estado_anterior": "texto",
        "estado_novo": "texto",
        "criado_em": "timestamp"
      }
    },
    "urgencia_relatos": {
      "status": "existe",
      "descricao": "Relato do paciente (nunca punido)",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "paciente_id": "FK usuarios.id",
        "solicitacao_id": "FK solicitacoes.id | null",
        "estado": "aguardando_avaliacao | avaliada",
        "criado_em": "timestamp"
      }
    },
    "urgencia_avaliacoes": {
      "status": "existe",
      "descricao": "Avaliação humana do relato (1:1); vem antes do score na fila",
      "pk": "id",
      "unique": ["relato_id"],
      "colunas": {
        "id": "uuid",
        "relato_id": "FK urgencia_relatos.id",
        "avaliador_usuario_id": "FK usuarios.id (função profissional)",
        "classificacao": "enum da avaliação",
        "observacao_administrativa": "texto | null",
        "avaliado_em": "timestamp"
      }
    },
    "cenarios": {
      "status": "existe",
      "descricao": "Cenário acadêmico publicado pela coordenação",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "clinica_id": "FK clinicas.id",
        "titulo": "texto",
        "descricao_leiga": "texto",
        "requisitos": "json[]",
        "publico": "texto | null",
        "cidade": "texto",
        "uf": "texto",
        "especialidade": "texto",
        "estado": "ativo | pausado",
        "publicado_em": "timestamp"
      }
    },
    "cenarios_interesses": {
      "status": "existe",
      "pk": "id",
      "unique": ["cenario_id", "paciente_id"],
      "colunas": {
        "id": "uuid",
        "cenario_id": "FK cenarios.id",
        "paciente_id": "FK usuarios.id",
        "estado": "registrado | retirado",
        "criado_em": "timestamp",
        "atualizado_em": "timestamp"
      }
    },
    "avaliacoes_clinica": {
      "status": "existe",
      "descricao": "Nota do paciente para a clínica após pedido concluído (1 por pedido)",
      "pk": "id",
      "unique": ["solicitacao_id"],
      "colunas": {
        "id": "uuid",
        "clinica_id": "FK clinicas.id",
        "paciente_id": "FK usuarios.id",
        "solicitacao_id": "FK solicitacoes.id",
        "nota": "int",
        "comentario": "texto | null",
        "criado_em": "timestamp"
      }
    },
    "alertas_preferencia": {
      "status": "existe",
      "descricao": "1:1 com usuarios",
      "pk": "usuario_id",
      "colunas": {
        "usuario_id": "PK + FK usuarios.id",
        "receber": "bool",
        "ligacao": "bool (aceita que a clínica ligue; sem ligação automática)",
        "atualizado_em": "timestamp"
      }
    },
    "alertas": {
      "status": "existe",
      "descricao": "Aviso dentro do app quando abre vaga compatível (sem push)",
      "pk": "id",
      "unique": ["paciente_id", "vaga_id"],
      "colunas": {
        "id": "uuid",
        "paciente_id": "FK usuarios.id",
        "vaga_id": "FK vagas.id",
        "clinica_id": "FK clinicas.id",
        "evento_origem": "vaga_criada",
        "lido": "bool",
        "criado_em": "timestamp"
      }
    },
    "resumos": {
      "status": "existe",
      "descricao": "Resumo fictício (não é prontuário real)",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "paciente_id": "FK usuarios.id",
        "clinica_autora_id": "FK clinicas.id",
        "campos": "json [{nome, valor}]",
        "criado_por": "FK usuarios.id",
        "criado_em": "timestamp"
      }
    },
    "resumos_compartilhamentos": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "resumo_id": "FK resumos.id",
        "clinica_destino_id": "FK clinicas.id",
        "campos_compartilhados": "json[]",
        "finalidade": "texto",
        "aceite": "aceito | recusado",
        "aceito_em": "timestamp",
        "revogado_em": "timestamp | null"
      }
    },
    "resumos_eventos_acesso": {
      "status": "existe",
      "descricao": "Auditoria de acesso ao resumo",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "resumo_id": "FK resumos.id",
        "usuario_id": "FK usuarios.id",
        "clinica_id": "FK clinicas.id | null",
        "tipo": "consulta | criacao | aceite | recusa | revogacao",
        "criado_em": "timestamp"
      }
    },
    "chat_perfis": {
      "status": "existe",
      "descricao": "Perfil de comunicação do assistente (1:1 com usuarios)",
      "pk": "usuario_id",
      "colunas": {
        "usuario_id": "PK + FK usuarios.id",
        "escolaridade": "texto",
        "faixa_etaria": "texto",
        "deficiencias": "json[]",
        "prefere_audio": "bool",
        "atualizado_em": "timestamp"
      }
    },
    "chat_conversas": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "usuario_id": "FK usuarios.id",
        "provedor": "mock | gemini | claude",
        "criado_em": "timestamp"
      }
    },
    "chat_mensagens": {
      "status": "existe",
      "pk": "id",
      "colunas": {
        "id": "uuid",
        "conversa_id": "FK chat_conversas.id",
        "ordem": "int",
        "papel": "texto (user | assistant | ...)",
        "conteudo": "json",
        "criado_em": "timestamp"
      }
    }
  },

  "calculado_sem_tabela": {
    "prioridade_fila": {
      "status": "existe",
      "descricao": "Score explicável calculado na hora a partir de solicitacoes, urgencia_avaliacoes e registros_falta, com pesos em backend/app/modulos/prioridade/pesos/demo-0.1.json. Urgência avaliada sempre vem antes do score."
    },
    "disponibilidade_clinica": {
      "status": "existe",
      "descricao": "Derivada de profissionais + agenda_blocos"
    },
    "compatibilidade_cenarios": {
      "status": "existe",
      "descricao": "Derivada de cenarios + perfis do paciente"
    }
  },

  "nao_existe": {
    "notificacoes_push_sms": { "status": "visao_futura", "descricao": "Push, SMS e ligação automática. Não há tabela nem rota." },
    "prontuario_real": { "status": "visao_futura", "descricao": "Só existe resumo fictício." },
    "mapas_gps": { "status": "visao_futura", "descricao": "Busca é por cidade/UF; não há geolocalização." }
  }
}
```

---

## 2. Relações

```json
{
  "relacoes": [
    { "de": "usuarios",             "para": "perfis",                    "tipo": "1:1",  "via": "perfis.usuario_id" },
    { "de": "usuarios",             "para": "chat_perfis",               "tipo": "1:1",  "via": "chat_perfis.usuario_id" },
    { "de": "usuarios",             "para": "alertas_preferencia",       "tipo": "1:1",  "via": "alertas_preferencia.usuario_id" },
    { "de": "usuarios",             "para": "sessoes_demo",              "tipo": "1:N",  "via": "sessoes_demo.usuario_id" },
    { "de": "usuarios",             "para": "clinicas",                  "tipo": "N:N",  "via": "vinculos_clinica (funcao)" },

    { "de": "clinicas",             "para": "solicitacoes",              "tipo": "1:N",  "via": "solicitacoes.clinica_id" },
    { "de": "usuarios (paciente)",  "para": "solicitacoes",              "tipo": "1:N",  "via": "solicitacoes.paciente_id" },
    { "de": "solicitacoes",         "para": "solicitacoes",              "tipo": "1:N",  "via": "solicitacao_origem_id (encaminhamento)" },
    { "de": "solicitacoes",         "para": "eventos_solicitacao",       "tipo": "1:N",  "via": "eventos_solicitacao.solicitacao_id" },

    { "de": "clinicas",             "para": "profissionais",             "tipo": "1:N",  "via": "profissionais.clinica_id" },
    { "de": "profissionais",        "para": "agenda_blocos",             "tipo": "1:N",  "via": "agenda_blocos.profissional_id" },

    { "de": "clinicas",             "para": "vagas",                     "tipo": "1:N",  "via": "vagas.clinica_id" },
    { "de": "profissionais",        "para": "vagas",                     "tipo": "1:N (opcional)", "via": "vagas.profissional_id" },
    { "de": "vagas",                "para": "interesses_vaga",           "tipo": "1:N",  "via": "interesses_vaga.vaga_id" },
    { "de": "solicitacoes",         "para": "interesses_vaga",           "tipo": "1:N",  "via": "interesses_vaga.solicitacao_id" },
    { "de": "vagas",                "para": "agendamentos",              "tipo": "1:N (no máx. 1 ativo)", "via": "agendamentos.vaga_id" },
    { "de": "solicitacoes",         "para": "agendamentos",              "tipo": "1:N",  "via": "agendamentos.solicitacao_id" },

    { "de": "agendamentos",         "para": "registros_falta",           "tipo": "1:N (opcional)", "via": "registros_falta.agendamento_id" },
    { "de": "registros_falta",      "para": "revisoes_falta",            "tipo": "1:N",  "via": "revisoes_falta.falta_id" },

    { "de": "usuarios (paciente)",  "para": "urgencia_relatos",          "tipo": "1:N",  "via": "urgencia_relatos.paciente_id" },
    { "de": "solicitacoes",         "para": "urgencia_relatos",          "tipo": "1:N (opcional)", "via": "urgencia_relatos.solicitacao_id" },
    { "de": "urgencia_relatos",     "para": "urgencia_avaliacoes",       "tipo": "1:1",  "via": "urgencia_avaliacoes.relato_id" },

    { "de": "clinicas",             "para": "cenarios",                  "tipo": "1:N",  "via": "cenarios.clinica_id" },
    { "de": "cenarios",             "para": "cenarios_interesses",       "tipo": "1:N",  "via": "cenarios_interesses.cenario_id" },

    { "de": "solicitacoes",         "para": "avaliacoes_clinica",        "tipo": "1:1",  "via": "avaliacoes_clinica.solicitacao_id" },
    { "de": "clinicas",             "para": "avaliacoes_clinica",        "tipo": "1:N",  "via": "avaliacoes_clinica.clinica_id" },

    { "de": "vagas",                "para": "alertas",                   "tipo": "1:N",  "via": "alertas.vaga_id" },
    { "de": "usuarios (paciente)",  "para": "alertas",                   "tipo": "1:N",  "via": "alertas.paciente_id" },

    { "de": "clinicas (autora)",    "para": "resumos",                   "tipo": "1:N",  "via": "resumos.clinica_autora_id" },
    { "de": "resumos",              "para": "resumos_compartilhamentos", "tipo": "1:N",  "via": "resumos_compartilhamentos.resumo_id" },
    { "de": "clinicas (destino)",   "para": "resumos_compartilhamentos", "tipo": "1:N",  "via": "clinica_destino_id" },
    { "de": "resumos",              "para": "resumos_eventos_acesso",    "tipo": "1:N",  "via": "resumos_eventos_acesso.resumo_id" },

    { "de": "usuarios",             "para": "chat_conversas",            "tipo": "1:N",  "via": "chat_conversas.usuario_id" },
    { "de": "chat_conversas",       "para": "chat_mensagens",            "tipo": "1:N",  "via": "chat_mensagens.conversa_id" }
  ]
}
```

Diagrama resumido (núcleo do fluxo):

```
usuarios ──< vinculos_clinica >── clinicas
   │                                 │
   └──< solicitacoes >───────────────┤
          │   │                      ├──< vagas ──< interesses_vaga
          │   └──< eventos_solicitacao│      │
          │                          │      └──< agendamentos ──< registros_falta ──< revisoes_falta
          └──< urgencia_relatos ── urgencia_avaliacoes
```

---

## 3. Funcionalidades × tabelas × endpoints

`front.paciente` / `front.clinica`: se a tela que consome existe (`existe`), falta (`falta_front`) ou não se aplica (`-`).

```json
{
  "funcionalidades": [
    {
      "nome": "Autenticação DEMO",
      "tabelas": ["usuarios", "vinculos_clinica", "sessoes_demo"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/auth/contas",     "quem": "público",         "status": "existe" },
        { "metodo": "POST", "rota": "/auth/login",      "quem": "público",         "status": "existe" },
        { "metodo": "POST", "rota": "/auth/demo/login", "quem": "público (DEMO_MODE=true)", "status": "existe" },
        { "metodo": "GET",  "rota": "/auth/me",         "quem": "logado",          "status": "existe" },
        { "metodo": "POST", "rota": "/auth/logout",     "quem": "logado",          "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "existe" },
      "pendencias": ["Revisar contas/DEMO_MODE=false para ambiente hospedado (senha, sessão, CORS) — F3 P1"]
    },
    {
      "nome": "Clínicas (busca e detalhe)",
      "tabelas": ["clinicas"],
      "endpoints": [
        { "metodo": "GET", "rota": "/clinicas",              "quem": "paciente",                         "status": "existe" },
        { "metodo": "GET", "rota": "/clinicas/{clinica_id}", "quem": "paciente: qualquer; funcionário: a própria", "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "-" }
    },
    {
      "nome": "Pedidos (solicitações) e histórico",
      "tabelas": ["solicitacoes", "eventos_solicitacao"],
      "endpoints": [
        { "metodo": "GET",   "rota": "/solicitacoes",                       "quem": "escopo do token", "status": "existe" },
        { "metodo": "POST",  "rota": "/solicitacoes",                       "quem": "paciente",        "status": "existe" },
        { "metodo": "GET",   "rota": "/solicitacoes/{id}",                  "quem": "escopo do token", "status": "existe" },
        { "metodo": "GET",   "rota": "/solicitacoes/{id}/eventos",          "quem": "escopo do token", "status": "existe" },
        { "metodo": "PATCH", "rota": "/solicitacoes/{id}/estado",           "quem": "funcionário da clínica (inclui concluir)", "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "existe" },
      "pendencias": ["Pedido duplicado após cancelar um agendamento (limitação documentada) — F3 P1"]
    },
    {
      "nome": "Encaminhamento com escolha do paciente",
      "tabelas": ["solicitacoes (solicitacao_origem_id)", "eventos_solicitacao"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/solicitacoes/{id}/alternativas", "quem": "paciente dono", "status": "existe" },
        { "metodo": "POST", "rota": "/solicitacoes/{id}/encaminhar",   "quem": "paciente dono", "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "-" }
    },
    {
      "nome": "Vagas, interesse e confirmação única",
      "tabelas": ["vagas", "interesses_vaga", "agendamentos"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/vagas",                  "quem": "escopo do token",           "status": "existe" },
        { "metodo": "POST", "rota": "/vagas",                  "quem": "funcionário",               "status": "existe" },
        { "metodo": "POST", "rota": "/vagas/{id}/interesses",  "quem": "paciente",                  "status": "existe" },
        { "metodo": "GET",  "rota": "/vagas/{id}/interesses",  "quem": "funcionário (ordem da fila)", "status": "existe" },
        { "metodo": "POST", "rota": "/vagas/{id}/confirmar",   "quem": "funcionário (409 se já confirmada)", "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "existe" },
      "pendencias": ["Mostrar o profissional da vaga na lista de interessados — F2"]
    },
    {
      "nome": "Agendamentos",
      "tabelas": ["agendamentos"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/agendamentos",               "quem": "paciente: próprios; funcionário: da clínica", "status": "existe" },
        { "metodo": "GET",  "rota": "/agendamentos/{id}",          "quem": "escopo do token",                             "status": "existe" },
        { "metodo": "POST", "rota": "/agendamentos/{id}/cancelar", "quem": "paciente dono ou funcionário",                "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "existe" },
      "observacao": "Não há rota própria de 'concluir': concluir é PATCH /solicitacoes/{id}/estado → concluida, que passa o desfecho para 'compareceu'."
    },
    {
      "nome": "Prioridade e fila explicável",
      "tabelas": ["(calculado) solicitacoes + urgencia_avaliacoes + registros_falta"],
      "endpoints": [
        { "metodo": "GET", "rota": "/clinicas/{clinica_id}/fila",          "quem": "funcionário da clínica", "status": "existe" },
        { "metodo": "GET", "rota": "/solicitacoes/{id}/prioridade",        "quem": "escopo do token",        "status": "existe" }
      ],
      "front": { "paciente": "-", "clinica": "existe" }
    },
    {
      "nome": "Faltas e revisão",
      "tabelas": ["registros_falta", "revisoes_falta"],
      "endpoints": [
        { "metodo": "POST", "rota": "/faltas",              "quem": "funcionário (função profissional, com justificativa)", "status": "existe" },
        { "metodo": "GET",  "rota": "/faltas",              "quem": "paciente: próprias; funcionário: da clínica", "status": "ajuste" },
        { "metodo": "POST", "rota": "/faltas/{id}/revisao", "quem": "funcionário",                                  "status": "existe" }
      ],
      "front": { "paciente": "-", "clinica": "falta_front" },
      "pendencias": ["GET /faltas sem response_model (sem tipo no OpenAPI) — F3 P1"]
    },
    {
      "nome": "Urgência",
      "tabelas": ["urgencia_relatos", "urgencia_avaliacoes"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/urgencias/orientacao",          "quem": "público (texto estático, SAMU 192)", "status": "existe" },
        { "metodo": "POST", "rota": "/urgencias",                     "quem": "paciente",                          "status": "existe" },
        { "metodo": "GET",  "rota": "/urgencias",                     "quem": "escopo do token",                   "status": "existe" },
        { "metodo": "POST", "rota": "/urgencias/{relato_id}/avaliacao", "quem": "funcionário (só função profissional)", "status": "existe" }
      ],
      "front": { "paciente": "existe", "clinica": "existe" }
    },
    {
      "nome": "Profissionais, agenda e disponibilidade",
      "tabelas": ["profissionais", "agenda_blocos"],
      "endpoints": [
        { "metodo": "GET",   "rota": "/profissionais",                     "quem": "funcionário", "status": "existe" },
        { "metodo": "POST",  "rota": "/profissionais",                     "quem": "funcionário", "status": "existe" },
        { "metodo": "PATCH", "rota": "/profissionais/{id}",                "quem": "funcionário", "status": "existe" },
        { "metodo": "GET",   "rota": "/profissionais/{id}/agenda",         "quem": "funcionário", "status": "existe" },
        { "metodo": "POST",  "rota": "/profissionais/{id}/agenda",         "quem": "funcionário", "status": "existe" },
        { "metodo": "PATCH", "rota": "/agenda/{bloco_id}",                 "quem": "funcionário", "status": "existe" },
        { "metodo": "GET",   "rota": "/clinicas/{clinica_id}/disponibilidade", "quem": "logado",  "status": "existe" }
      ],
      "front": { "paciente": "-", "clinica": "existe" }
    },
    {
      "nome": "Perfil do paciente",
      "tabelas": ["perfis"],
      "endpoints": [
        { "metodo": "GET", "rota": "/perfil", "quem": "o próprio usuário", "status": "existe" },
        { "metodo": "PUT", "rota": "/perfil", "quem": "o próprio usuário", "status": "existe" }
      ],
      "front": { "paciente": "falta_front", "clinica": "-" }
    },
    {
      "nome": "Cenários acadêmicos",
      "tabelas": ["cenarios", "cenarios_interesses"],
      "endpoints": [
        { "metodo": "GET",    "rota": "/cenarios",                 "quem": "logado",            "status": "existe" },
        { "metodo": "POST",   "rota": "/cenarios",                 "quem": "coordenação",       "status": "existe" },
        { "metodo": "GET",    "rota": "/cenarios/compatibilidade", "quem": "paciente",          "status": "existe" },
        { "metodo": "GET",    "rota": "/cenarios/{id}",            "quem": "logado",            "status": "existe" },
        { "metodo": "PATCH",  "rota": "/cenarios/{id}",            "quem": "coordenação",       "status": "existe" },
        { "metodo": "POST",   "rota": "/cenarios/{id}/interesses", "quem": "paciente",          "status": "existe" },
        { "metodo": "DELETE", "rota": "/cenarios/{id}/interesses", "quem": "paciente (retirar)", "status": "existe" },
        { "metodo": "GET",    "rota": "/cenarios/{id}/interesses", "quem": "coordenação",       "status": "existe" }
      ],
      "front": { "paciente": "falta_front", "clinica": "falta_front" }
    },
    {
      "nome": "Avaliação de clínica",
      "tabelas": ["avaliacoes_clinica"],
      "endpoints": [
        { "metodo": "POST", "rota": "/avaliacoes",                       "quem": "paciente (pedido concluído)", "status": "existe" },
        { "metodo": "GET",  "rota": "/avaliacoes",                       "quem": "paciente (minhas)",           "status": "existe" },
        { "metodo": "GET",  "rota": "/clinicas/{clinica_id}/avaliacoes", "quem": "logado",                      "status": "existe" }
      ],
      "front": { "paciente": "falta_front", "clinica": "falta_front" }
    },
    {
      "nome": "Alertas de vaga (sem push)",
      "tabelas": ["alertas", "alertas_preferencia"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/alertas",             "quem": "paciente", "status": "existe" },
        { "metodo": "POST", "rota": "/alertas/{id}/lido",   "quem": "paciente", "status": "existe" },
        { "metodo": "GET",  "rota": "/alertas/preferencia", "quem": "paciente", "status": "existe" },
        { "metodo": "PUT",  "rota": "/alertas/preferencia", "quem": "paciente", "status": "existe" }
      ],
      "front": { "paciente": "falta_front", "clinica": "-" }
    },
    {
      "nome": "Resumo compartilhável (demo)",
      "tabelas": ["resumos", "resumos_compartilhamentos", "resumos_eventos_acesso"],
      "endpoints": [
        { "metodo": "POST", "rota": "/resumos",                               "quem": "funcionário (função profissional)", "status": "existe" },
        { "metodo": "GET",  "rota": "/resumos",                               "quem": "escopo do token",                   "status": "existe" },
        { "metodo": "GET",  "rota": "/resumos/{id}",                          "quem": "escopo do token (gera evento de acesso)", "status": "existe" },
        { "metodo": "POST", "rota": "/resumos/{id}/compartilhamentos",        "quem": "paciente dono",                     "status": "existe" },
        { "metodo": "GET",  "rota": "/resumos/{id}/compartilhamentos",        "quem": "escopo do token",                   "status": "existe" },
        { "metodo": "POST", "rota": "/compartilhamentos/{id}/revogar",        "quem": "paciente dono",                     "status": "existe" },
        { "metodo": "GET",  "rota": "/resumos/{id}/eventos",                  "quem": "escopo do token (auditoria)",       "status": "existe" }
      ],
      "front": { "paciente": "falta_front", "clinica": "falta_front" },
      "observacao": "No paciente não há módulo planejado ainda para compartilhar/revogar; na clínica o módulo 'resumos' está pendente (P1)."
    },
    {
      "nome": "Assistente acessível (chat, TTS, simplificação)",
      "tabelas": ["chat_perfis", "chat_conversas", "chat_mensagens"],
      "endpoints": [
        { "metodo": "GET",  "rota": "/acessibilidade/chat/perfil",   "quem": "logado", "status": "ajuste" },
        { "metodo": "PUT",  "rota": "/acessibilidade/chat/perfil",   "quem": "logado", "status": "existe" },
        { "metodo": "POST", "rota": "/acessibilidade/chat",          "quem": "logado (mock por padrão)", "status": "existe" },
        { "metodo": "POST", "rota": "/acessibilidade/tts",           "quem": "logado", "status": "ajuste" },
        { "metodo": "GET",  "rota": "/acessibilidade/audio/{arquivo}", "quem": "interno (fora do OpenAPI)", "status": "existe" },
        { "metodo": "POST", "rota": "/acessibilidade/simplificar",   "quem": "logado", "status": "falta" }
      ],
      "front": { "paciente": "existe", "clinica": "-" },
      "pendencias": [
        "GET /chat/perfil sem perfil salvo devolve 404; deveria devolver 200 com padrão — F3 P1",
        "/acessibilidade/tts sem response_model no OpenAPI — F3 P1",
        "POST /acessibilidade/simplificar (contrato §9.8) não existe — F4 P0"
      ]
    },
    {
      "nome": "Saúde da API",
      "tabelas": [],
      "endpoints": [
        { "metodo": "GET", "rota": "/saude (também /api/v1/saude)", "quem": "público", "status": "existe" }
      ],
      "front": { "paciente": "-", "clinica": "-" }
    }
  ]
}
```

---

## 4. Resumo do que falta

```json
{
  "backend": [
    { "item": "POST /acessibilidade/simplificar",                         "frente": "F4", "prioridade": "P0" },
    { "item": "Rodar migrações, seed e testes num PostgreSQL real",       "frente": "F3", "prioridade": "P0" },
    { "item": "response_model em GET /faltas e /acessibilidade/tts",      "frente": "F3", "prioridade": "P1" },
    { "item": "GET /acessibilidade/chat/perfil: 200 com padrão em vez de 404", "frente": "F3", "prioridade": "P1" },
    { "item": "Pedido duplicado após cancelar agendamento",               "frente": "F3", "prioridade": "P1" },
    { "item": "Auth para ambiente hospedado (DEMO_MODE=false, CORS)",     "frente": "F3", "prioridade": "P1" }
  ],
  "front_paciente": ["perfil", "cenarios", "avaliar", "alertas"],
  "front_clinica":  ["faltas", "cenarios", "avaliacoes", "resumos"],
  "plataforma":     ["E2E Playwright da jornada P0", "Deploy hospedado (Render/Fly + Supabase)"],
  "visao_futura":   ["push / SMS / ligação automática", "prontuário real", "mapas / GPS"]
}
```
