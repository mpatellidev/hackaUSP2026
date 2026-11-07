# avaliacoes

Avaliação da clínica (contrato §9.6). Só o paciente dono, só com pedido `concluida`; uma por atendimento; reenviar edita (`200`, a primeira vez é `201`). `GET /clinicas/{id}/avaliacoes` devolve média e itens **sem nome e sem dado de saúde**.

Tabela `avaliacoes_clinica` (migração `0010`); seed de `avaliacoes-clinica.json`.
