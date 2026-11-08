# paciente · avaliar (P1, pronto)

Tela `/pedidos/:id/avaliar` (botão "Avaliar a clínica" no pedido concluído): nota de 1 a 5, comentário opcional (até 280 letras) e edição da avaliação já enviada. Antes da conclusão, a tela só explica que ainda não dá para avaliar (o backend também recusa).

**Endpoints:** `POST /avaliacoes` (reenviar edita), `GET /avaliacoes`. Ainda não usado: `GET /clinicas/{id}/avaliacoes`.

Ver [`frentes.md`](../../../../frentes.md).
