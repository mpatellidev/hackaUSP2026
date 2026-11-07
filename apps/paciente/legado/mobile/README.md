# UHealth — app mobile (Android) · issue #5

App dos **pacientes**, em React Native + Expo (SDK 58) e TypeScript. **Dados 100% fictícios. Login DEMO, sem senha: não é seguro.**
Contratos: [`docs/contratos-mvp.md`](../docs/contratos-mvp.md) · fronteiras: [`docs/fronteiras.md`](../docs/fronteiras.md).

O app **não diagnostica, não receita, não garante vaga** e não substitui emergência (faixa fixa "ligue 192", sem rede).

## Rodar no celular (Expo Go)
```bash
cd mobile
npm install
cp .env.example .env.local      # opcional: o padrão já é o modo mock
npx expo start                  # leia o QR code com o app Expo Go (Android)
```
Celular e computador na mesma rede Wi-Fi. Se a rede bloquear, use `npx expo start --tunnel`.

## Modo de dados
| `EXPO_PUBLIC_API_MODO` | O que acontece |
|---|---|
| `mock` (padrão) | Dados de `src/api/mock/fixtures/` (cópia de `docs/fixtures/`), em memória. Somem ao recarregar o app. |
| `api` | Usa `EXPO_PUBLIC_API_URL` (sem `/api/v1`). Rota que ainda não existe no backend (consulta `/openapi.json`) ou falha de rede → cai no mock. |

Um aviso fixo no topo sempre mostra de onde vieram os dados: *demonstração (servidor)*, *mock* ou *sem resposta da API · mock*.

Para usar o backend (#2) no celular, rode-o aceitando a rede local e aponte para o IP da máquina:
```bash
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
# mobile/.env.local
EXPO_PUBLIC_API_MODO=api
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000
```
Variáveis `EXPO_PUBLIC_*` ficam **dentro do app**: nunca coloque chaves ou segredos nelas.

Mudou `docs/fixtures/`? Rode `npm run fixtures` para atualizar a cópia do mock.

## Rodar no navegador (PC ou celular)
O app também roda como site (React Native Web), com os mesmos dados e telas:
```bash
cd mobile
npm install
npm run web          # abre http://localhost:8081 ; exportar: npm run export:web
npm run web:rede     # idem, aceitando acesso de outros aparelhos da rede (http://IP-DO-PC:8081)
```
Com o backend (`EXPO_PUBLIC_API_MODO=api`), `EXPO_PUBLIC_API_URL` precisa ser alcançável pelo **navegador** de quem abre o app:
no mesmo computador use `http://localhost:8000`; no celular, `http://IP-DO-PC:8000`. O backend só aceita origens listadas em
`CORS_ORIGINS` (inclua `http://IP-DO-PC:8081`). O `iniciar.sh` da raiz faz tudo isso.

## Gerar APK
```bash
npm install -g eas-cli
eas login                        # conta Expo (gratuita)
npm run apk                      # = eas build -p android --profile preview → link para baixar o .apk
```
Defina `EXPO_PUBLIC_API_*` no ambiente do build (`eas.json` › `env`, ou variáveis do projeto no EAS). Um APK de release
bloqueia HTTP sem TLS por padrão: para apontar para uma API `http://` seria preciso habilitar cleartext
(`expo-build-properties`); prefira uma URL `https://`.

## Verificação
```bash
npm run typecheck                # tsc --noEmit
npx expo-doctor
npx expo export --platform android   # confere que o bundle compila
```

## Estrutura
```
App.tsx                 providers (tema, sessão), aviso de origem, navegação
src/api/                adaptador: cliente.ts (fetch + fallback), um arquivo por módulo, mock/ (servidor em memória)
src/tema/               tokens (port de ui/tokens.css): claro, escuro, alto contraste; letras normal/grande/extra grande
src/componentes/        Texto, Botao, Cartao, Chip, Opcao, Aviso, FaixaEmergencia, estados de carregando/erro, useCarregar
src/sessao/             login demo, token, cidade escolhida
src/navegacao/          pilha + abas; modulos.ts = PONTO DE MONTAGEM das outras frentes
src/telas/              boas-vindas, identificação demo, cidade, clínicas, detalhe, pedido, enviado, meus pedidos, andamento, ajustes
src/textos/             avisos fixos e rótulos pt-BR dos enums
src/modulos/            telas das outras frentes (#6, #9, #12, #14, #16, #17, #18) — veja src/modulos/README.md
```

## Jornada de demonstração
Boas-vindas → **Ana M.** → cidade **São Paulo** → Clínica-Escola A → *Pedir atendimento* → pedido **enviado** →
*Meus pedidos* mostra o novo pedido e os pedidos 1 (*clínica não pode atender*, com motivo) e 2 (*agendada*, veio de encaminhamento).
Clínica-Escola C aparece "fechada por ora", sem botão de pedido. Pedir de novo a mesma área na mesma clínica → aviso de pedido em andamento.

## Limitações
- Login demonstrativo e inseguro; sem cadastro/perfil (#18). Contas de funcionário são recusadas no app.
- Alternativas e escolha de outra clínica, vagas e interesse são da #6: o pedido indisponível só mostra "ver outras clínicas" até a #6 registrar a rota `Acompanhamento.Alternativas`.
- Sem push, SMS ou WhatsApp: as telas atualizam ao puxar para baixo ou tocar em *Atualizar*.
- O botão de telefone só abre o discador; o app não liga.
- No mock, pedidos criados somem ao recarregar. Em modo `api`, `GET /clinicas` e `/solicitacoes` dependem do backend (#2/#3); até lá, fallback mock identificado.
- Sem GPS, sem mapa, sem diagnóstico, sem prontuário.
