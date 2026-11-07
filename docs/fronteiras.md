# Fronteiras de trabalho — UHealth

Como o time grande trabalha em paralelo sem pisar nos arquivos dos outros. Numeração = **número da issue no GitHub**. Contratos: [`contratos-mvp.md`](contratos-mvp.md).

## Dono de cada pasta

| Caminho | Dono | Observação |
|---|---|---|
| `docs/contratos-mvp.md`, `docs/fronteiras.md`, `docs/fixtures/` | #1 | Mudanças só por PR de contrato (abaixo) |
| `backend/` (projeto, `main.py`, config, banco, auth demo, migrações, seed) | #2 | Base compartilhada |
| `backend/app/modulos/solicitacoes/` | #3 | |
| `backend/app/modulos/vagas/` | #4 | |
| `backend/app/modulos/cenarios/` | #11 | |
| `backend/app/modulos/prioridade/` | #13 | Único dono de score, faltas e fila |
| `backend/app/modulos/urgencia/` | #14 | |
| `backend/app/modulos/resumos/` | #15 | |
| `backend/app/modulos/avaliacoes/` | #16 | |
| `backend/app/modulos/alertas/` | #17 | |
| `backend/app/modulos/acessibilidade/` | #9 | Serviço Gemini/mock |
| `mobile/` (esqueleto, navegação, tema, adaptador de API) | #5 | Ponto de montagem mobile |
| `mobile/src/modulos/acompanhamento/` | #6 | Exporta telas; não edita a navegação |
| `mobile/src/modulos/{cenarios,urgencia,alertas,avaliacoes,perfil,acessibilidade}/` | #12 · #14 · #17 · #16 · #18 · #9 | Exportam telas + guia de integração |
| `desktop/` (esqueleto, menu, adaptador de API) | #7 | Ponto de montagem desktop |
| `desktop/src/modulos/vagas/` | #8 | Vagas e revisão de prioridade |
| `desktop/src/modulos/{cenarios,urgencia,resumos,avaliacoes,perfil}/` | #12 · #14 · #15 · #16 · #18 | Exportam componentes |
| Testes ponta a ponta, builds, roteiro | #10 | Integra; não reimplementa módulos |

## Pontos de montagem

- **Backend:** cada módulo tem `router.py` (exporta `router: APIRouter`), `schemas.py`, `service.py`, `models.py` e `tests/`. O registro dos roteadores em `app/main.py` e o diretório de migrações são da #2; quem precisa de tabela nova abre PR **pequeno** para a #2 ou adiciona uma migração própria com prefixo do módulo (`NNNN_<modulo>_<descricao>`), nunca edita migração alheia.
- **Mobile:** cada módulo exporta telas e um `rotas.ts` com `{nome, componente}`; a #5 as registra na navegação. Mock em `modulos/<m>/mock/`, identificado na UI.
- **Desktop:** cada módulo exporta componentes e `rotas.ts` com `{caminho, rotulo, componente}`; a #7 monta o menu.
- **Adaptadores de API** (`mobile/src/api/`, `desktop/src/api/`): um cliente por módulo, URL base por variável de ambiente (`EXPO_PUBLIC_API_URL`, `VITE_API_URL`). Nunca chave de serviço no cliente.

## Fixtures (estáveis)

- Pertencem à #1. **Não alterar IDs existentes**; só acrescentar. Rodar `python3 docs/fixtures/validar.py` antes do PR.
- Cada módulo pode ter fixtures extras na própria pasta, referenciando os IDs de `docs/fixtures/`.
- Seed do backend (#2) carrega `docs/fixtures/` de forma idempotente.

## Como mudar um contrato

1. Abra PR alterando `docs/contratos-mvp.md` (e fixtures, se preciso) com bump de versão e linha no changelog.
2. Marque as issues afetadas na descrição; mudança que quebra consumidores precisa de um "ok" de cada dono.
3. Até o merge, trabalhe com o contrato vigente; diferenças são alinhadas **antes** da integração (#10).

## Convenção de trabalho

- Branch `feat/<numero>-<assunto>`, um PR por issue, descrição com: o que foi feito, como executar, limitações, o que é mock.
- Não edite arquivos de outra frente. Se precisar, abra issue ou PR pequeno ao dono.
- Nada de segredos, tokens ou dados reais em commits.
