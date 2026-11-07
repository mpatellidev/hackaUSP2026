# Perfil (#18, contrato §9.2)

`GET /perfil` e `PUT /perfil` (só paciente, só o próprio). `PUT` substitui o perfil: `cidade`, `uf`, `contato_preferido` (`app|telefone`), `socioeconomico` (`{"informado": false, "prefiro_nao_informar": true}` é válido e não impede pedido; com `informado: true` exige `faixa_renda_familiar`) e `acessibilidade` (`texto`, `linguagem`, `audio`, `tema`). Sem documento, endereço ou dado clínico. `usuario_id` vem do token.

A renda só alimenta o componente `socioeconomico` da fila (#13) por `service.faixa_renda`; a fila mostra apenas o número, nunca a faixa. Tabela `perfis` (migração `0007`), seed de `docs/fixtures/perfis.json`. `GET` sem perfil salvo devolve o padrão (`salvo: false`). Telas (mobile/desktop) ainda não consomem esta rota.
