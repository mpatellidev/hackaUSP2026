# app/paciente

App web do paciente (React + Vite + TypeScript), **mobile-first** (375×812). Base `/`, porta de desenvolvimento 5173 (proxy `/api` → 8000).

- `src/rotas.tsx` é o **registro único** de módulos; `src/Casca.tsx` a moldura (faixa de demonstração, emergência 192, abas).
- `src/modulos/<m>/`: telas + `rotas.tsx`. Prontos: `inicio`, `clinicas`, `pedidos`, `alternativas`, `vagas`, `agendamentos`, `urgencia`, `assistente`. Pendentes (P1, com README): `alertas`, `avaliar`, `cenarios`, `perfil`.
- Fala com a API só por `@uhealth/api-client`; visual só de `@uhealth/ui`.

Ver [`../../frentes.md`](../../frentes.md) (F1).
