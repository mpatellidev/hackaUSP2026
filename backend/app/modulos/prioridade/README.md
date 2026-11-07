# Prioridade, score e faltas (issue #13)

Serviço explicável de fila para **demonstração**. Pesos ilustrativos (`pesos/demo-0.1.json`), **não são critérios clínicos validados**; a ordem apoia a decisão e a verificação é sempre humana.

## Regras
- Ordenação: `(urgencia_avaliada desc, score desc, criado_em asc, id asc)`. Urgência **avaliada por profissional** vem antes de qualquer score, falta ou encaixe acadêmico.
- Urgência **autodeclarada** (aguardando avaliação) **não reordena**: gera a sinalização `urgencia_autodeclarada_aguardando_avaliacao` para revisão humana. Sinal grave segue o fluxo de emergência da #14, fora da fila.
- Score = Σ `valor × peso` de: `socioeconomico` (renda não informada/"prefiro não informar" = 0, `valor: null`), `necessidade_academica`, `tempo_espera` (com teto), `falta_verificada` (−10 por falta **confirmada**, teto de 3). A resposta traz `componentes[]` com valor, peso e fonte, e `versao_pesos`.
- Empate total: mais antigo primeiro, depois `id` (determinístico).
- Faltas: só `profissional` da clínica do agendamento registra (com justificativa); só `profissional`/`coordenacao` revisa; revisões ficam em `revisoes_falta` (append-only). Nada cria falta automaticamente (sem resposta, cancelamento, problema da clínica ou relato de urgência não geram falta). A penalidade só reduz o score: não bloqueia pedidos.
- Privacidade: a fila mostra só o **número** do componente socioeconômico, nunca a faixa de renda.

## Endpoints (`/api/v1`)
- `GET /clinicas/{id}/fila` (funcionário da clínica; outra clínica = 404; paciente = 403)
- `GET /solicitacoes/{id}/prioridade`
- `POST /faltas {agendamento_id, justificativa}` · `GET /faltas` · `POST /faltas/{id}/revisao {acao: reverter|manter, motivo}`

## Integração (#10)
`fontes.py` define `get_fontes()` → `FontesBanco`, que lê pelos **serviços** dos módulos (banco, não JSON): perfil/renda (`perfil.service.faixa_renda`), urgência (`urgencia.service.status_urgencia`) e cenários (`cenarios.service.cenario_correspondente`). `fila.py` monta e ordena a fila (usado também pela ordem sugerida de interessados em `vagas`). `fontes_demo: true` na resposta indica dados fictícios. Trocar pesos: `PESOS_VERSAO=<arquivo em pesos/>`.

## Cancelamento
Cancelamento antecipado ou pela clínica (`POST /agendamentos/{id}/cancelar`) **nunca** cria `RegistroFalta`: o componente `falta_verificada` não muda (testado em `agendamentos/tests`).

## Ainda não existe
Contestação da falta pelo paciente (hoje ele vê o motivo; a revisão é feita pela clínica).
