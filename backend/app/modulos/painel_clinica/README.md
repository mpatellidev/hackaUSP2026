# painel_clinica

Apoio ao **painel administrativo da clínica** (`app/clinica` → `/clinica/admin`). Só acrescenta rotas; não muda as existentes.

- `GET /painel-clinica/pedidos`: os mesmos pedidos de `GET /solicitacoes` (escopo do token), cada um com `paciente_nome_exibicao`. Só funcionário (paciente = 403).
- `PATCH /clinicas/{clinica_id}`: altera `nome`, `telefone`, `endereco`, `bairro` e `recebendo_pedidos` da própria clínica. Função `atendimento` ou `coordenacao` (mesma regra do cadastro de profissionais); outras funções = 403; outra clínica = 404.
- Sem tabela nova nem migração.
