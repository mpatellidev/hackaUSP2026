# profissionais

Profissionais **fictícios** das clínicas-escola e sua agenda (contrato §4.8). `Profissional` (docente, residente ou estudante supervisionado) e `BlocoAgenda` (disponível, reservado, indisponível). `Vaga.profissional_id` é opcional.

- Rotas: `GET/POST /profissionais`, `PATCH /profissionais/{id}`, `GET/POST /profissionais/{id}/agenda`, `PATCH /agenda/{id}`, `GET /clinicas/{id}/disponibilidade?data=`.
- Cadastro e agenda: função `atendimento` ou `coordenacao`; leitura: qualquer funcionário da clínica. Outra clínica = 404. Paciente = 403.
- Disponibilidade **não** é vaga nem agendamento.
- Tabelas `profissionais` e `agenda_blocos` (migração `0009`); seed de `docs/fixtures/profissionais.json` e `agenda.json`.
