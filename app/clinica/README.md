# app/clinica

Painel web das clínicas-escola (React + Vite + TypeScript), **desktop-first** (usável a partir de 800px). Base `/clinica/`, porta de desenvolvimento 5174 (proxy `/api` → 8000). Clínica e função vêm de `/auth/me`.

- `src/rotas.tsx` é o **registro único** de módulos; `src/Casca.tsx` a moldura (menu lateral).
- `src/modulos/<m>/`: telas + `rotas.tsx`. Prontos: `pedidos`, `fila`, `vagas`, `agendamentos`, `urgencias`, `profissionais`. Pendentes (P1, com README): `avaliacoes`, `cenarios`, `faltas`, `resumos`.
- Fala com a API só por `@uhealth/api-client`; visual só de `@uhealth/ui`.

Ver [`../../frentes.md`](../../frentes.md) (F2).
