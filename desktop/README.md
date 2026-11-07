# desktop/ — Painel da clínica (issue #7)

App Windows (Tauri + React + Vite) para funcionários de clínica-escola. **Protótipo com dados 100% fictícios e login DEMO sem senha: não é seguro para uso real.**
Contrato: [`docs/contratos-mvp.md`](../docs/contratos-mvp.md) · fronteiras: [`docs/fronteiras.md`](../docs/fronteiras.md).

## O que funciona
- Login de demonstração só para funcionários (conta de paciente é recusada).
- Lista das solicitações **da própria clínica** (filtro por situação, "Atualizar", estados de carregando/erro/vazio).
- Detalhe do pedido com histórico (autor e horário) e mudança de situação: em análise, precisa de contato, "não recebemos agora". Motivo administrativo obrigatório nos dois últimos. Só as mudanças válidas para o estado atual são oferecidas; erros do servidor (409/404/401) aparecem como erro, nunca como sucesso.
- Tema (claro/escuro/alto contraste), tamanho de letra, link "Pular para o conteúdo" e navegação por teclado.

## Mock × API
| `VITE_API_MODO` | Comportamento |
|---|---|
| `mock` (padrão) | Dados **simulados** em memória (`docs/fixtures`). Nada é enviado. A tela avisa. Reinicia ao recarregar. |
| `api` | Usa o backend FastAPI em `VITE_API_URL` (login e `/auth/me` reais). |

**Pendente com a #3:** a rota de mudança de estado ainda não está no contrato. Assumi `POST /solicitacoes/{id}/transicoes {"estado_novo","motivo"}`, isolada em `src/api/solicitacoes.ts` (`transicionar`). A listagem usa `GET /solicitacoes?estado=`, `GET /solicitacoes/{id}` e `GET /solicitacoes/{id}/eventos`. Em modo `api`, a lista só funciona quando a #3 publicar essas rotas.

## Rodar em desenvolvimento
```bash
cd desktop
npm install
npm run dev          # navegador em http://localhost:1420 (modo mock)
npm test             # testes (Vitest)
npm run tauri dev    # janela do app (precisa de Rust e, no Linux, WebKitGTK)
```
Para usar o backend: `cp .env.example .env.local`, ponha `VITE_API_MODO=api`, rode o backend (`backend/README.md`) e reinicie o `npm run dev`. Nenhuma chave é embutida.

## Instalador Windows
O instalador (`.exe` NSIS e `.msi`) é gerado no Windows ou pelo GitHub Actions (`.github/workflows/desktop-windows.yml`, botão "Run workflow" ou PR que mude `desktop/`; o resultado fica como artefato `uhealth-painel-windows`). No Windows: instale Node 22, Rust e as ferramentas do Visual Studio C++, depois:
```powershell
cd desktop; npm ci; npm run tauri build
```
Os instaladores saem em `src-tauri/target/release/bundle/`. **Status:** o instalador ainda não foi gerado nem testado em Windows; só o código compila/testa em Linux.

## Montar novos módulos (#8, #12, #14–#16, #18)
Cada módulo exporta `rotas: RotaModulo[]` (`{caminho, rotulo, componente}`) e adiciona **uma linha** em `src/rotas.ts`. Não edite `App.tsx`. Use `src/api/cliente.ts` (`http`) e crie um arquivo de API por módulo.

## Limitações
Sem push, SMS ou ligação; sem prontuário; fila/score e vagas ficam para #8. Telas de erro dependem da `mensagem` pt-BR do servidor.
