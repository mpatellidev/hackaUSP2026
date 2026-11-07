# Acompanhamento, alternativas e vagas — issue #6

Exporte `rotas` para `mobile/src/navegacao/modulos.ts`; a issue #5 é dona desse ponto de montagem.

- `Acompanhamento.Alternativas`: recebe `{ solicitacaoId }` e só apresenta escolha explícita.
- `Acompanhamento.Vagas`: recebe `{ clinicaId, solicitacaoId }`; interesse é sempre distinto de confirmação.
- As rotas usam API quando disponíveis e mock rotulado enquanto #4 não expõe vagas/interesses.
