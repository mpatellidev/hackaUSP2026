# Solicitações e encaminhamento — issue #3

Rotas do fluxo de pedido, indisponibilidade e escolha explícita de alternativa. Dados são fictícios e a autenticação é DEMO.

- O paciente cria e acompanha somente seus pedidos; funcionários só acessam pedidos da clínica vinculada.
- `PATCH /solicitacoes/{id}/estado` aceita apenas as transições administrativas previstas no contrato.
- Alternativas usam cidade da clínica original, especialidade, `publico_alvo` explícito e recebimento ativo. Não há envio automático.
- O encaminhamento devolve os campos mínimos a apresentar ao paciente; dados de perfil ficam para a integração da issue #18.
