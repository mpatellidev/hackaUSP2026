# app — frontend web do UHealth

Workspaces npm: `paciente` (app do paciente, mobile-first), `clinica` (painel das clínicas, desktop-first), `packages/ui` e `packages/api-client`. Arquitetura: [`../arquitetura.md`](../arquitetura.md). Dados fictícios; login de demonstração.

```bash
./iniciar.sh              # prepara tudo, constrói e serve em http://localhost:8000 (paciente em /, clínicas em /clinica/)
./iniciar.sh --dev        # com recarregamento: API 8000, paciente 5173, clínicas 5174
npm install               # só as dependências do frontend
npm run dev               # API + os dois apps em modo dev
npm run build             # gera paciente/dist e clinica/dist (servidos pela API)
npm run gen:api           # regenera os tipos do contrato (rode após mudar a API)
npm run typecheck && npm test
```
