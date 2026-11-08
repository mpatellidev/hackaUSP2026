# app/clinica

Painel web das clínicas-escola (React + Vite + TypeScript), **desktop-first** (usável a partir de 800px). Base `/clinica/`, porta de desenvolvimento 5174 (proxy `/api` → 8000). Clínica e função vêm de `/auth/me`.

- `src/rotas.tsx` é o **registro único** de módulos; `src/Casca.tsx` a moldura (menu lateral).
- `src/design/PainelClinica.tsx` (`/admin`, tela inicial): solicitações, triagem com **score explicado** (`Prioridade.tsx`) e **prontuário clínico** (`ProntuarioClinico.tsx`: estudante escreve, professor valida; triagem validada aciona o indexador da API, que pode encaminhar o paciente a outra parceira), serviços e vagas.
- `src/modulos/<m>/`: telas + `rotas.tsx`. Prontos: `pedidos`, `fila`, `vagas`, `agendamentos` (com registro de falta), `urgencias`, `profissionais`. Pendentes (P1, com README): `avaliacoes`, `cenarios`, `faltas` (revisão), `resumos`.
- Sistema visual do pitch (`../../motion/SPEC.md` §3): verde `#075E59`, teal `#14BEB9`, tinta `#0B2423`, sol `#FFB81C`; Lexend e Atkinson Hyperlegible empacotadas (`@fontsource`). Relação slide → tela → API: [`../PITCH.md`](../PITCH.md).
- Fala com a API só por `@uhealth/api-client`; visual só de `@uhealth/ui`.

Ver [`../../frentes.md`](../../frentes.md) (F2).
