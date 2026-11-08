# Pitch ↔ app: o que cada slide mostra e onde está no app

Relação 1:1 entre o material do pitch (`../motion/slides.html`, `../motion/index.html`, especificados em `../motion/SPEC.md`) e o app web real. Toda tela abaixo fala com a API de verdade (`/api/v1`, contrato em `packages/api-client/src/schema.d.ts`). Dados 100% fictícios.

Para demonstrar: `./iniciar.sh --dev`, paciente em `:5173`, clínicas em `:5174/clinica/`. Contas demo em `../backend/docs/fixtures/contas-demo.json`.

## Sistema visual

| Pitch (`motion/comum.css`) | App |
|---|---|
| verde `#075E59`, teal `#14BEB9`, tinta `#0B2423`, sol `#FFB81C`, névoa `#E8F9F8` | `packages/ui/src/styles/tokens.css` (paciente e telas operacionais) e `clinica/src/design/clinica.css` (painel `/admin`) |
| Lexend (títulos) + Atkinson Hyperlegible (corpo) | `@fontsource` nos dois apps (funcionam sem internet) |
| Marca "Sorriu+" com o "u" amarelo | componente `Marca` de `@uhealth/ui` |
| Chip com sombra, destaque amarelo no 1º da fila | `.d-chip`, `.d-queue-card.d-is-first` (`clinica.css`) |

## Slides e cenas

| Slide / cena | O que mostra | Tela no app | API |
|---|---|---|---|
| 5 · Hub; trailer passo 1 | Clínica mais perto, custo, "Entrada sem degraus" | paciente `/clinicas`, `/clinicas/:id` | `GET /clinicas-comparacao`, `GET /clinicas/{id}`, `POST /solicitacoes` |
| trailer passo 2 | "Ouviu um não? Outra porta se abre" | paciente `/pedidos/:id`, `/pedidos/:id/alternativas` | `GET /solicitacoes/{id}/alternativas`, `POST /solicitacoes/{id}/encaminhar` |
| 6 · Prontuário; trailer passo 4 | Histórico vai junto; registro de quem viu | paciente `/prontuario` · clínica `/admin` → Triagem ou "Ver perfil completo" → **Prontuário** | `GET /prontuario`, `GET /prontuario/acessos` · `GET /pacientes/{id}/prontuario`, `POST /prontuario`, `POST /prontuario/{id}/validar` |
| 7 · Score | Comparecimento + situação socioeconômica = score; urgência avaliada vem antes | paciente `/prioridade` · clínica `/admin` → **Triagem** (fórmula e barras) e `/fila` | `GET /meu-score` · `GET /clinicas/{id}/fila` |
| 7 · Score (comparecimento) | Falta confirmada tira pontos | clínica `/agendamentos` → **Registrar falta** (profissional, depois do horário) | `POST /faltas` |
| 8 · Redirecionamento; trailer passo 3 | Fila cheia aqui, cadeira livre ali; diagnóstico vai junto | clínica: professor valida a triagem no **Prontuário** → paciente `/encaminhamentos` confirma ou recusa | `POST /prontuario/{id}/validar` (aciona o indexador) → `GET /referenciamentos`, `POST /referenciamentos/{id}/aceitar` |
| trailer passo 5 | "Confirmado" só quando a clínica confirma | paciente `/pedidos/:id` (etapas) · clínica `/admin` → Serviços e vagas → confirmar interessado | `POST /vagas/{id}/interesses`, `POST /vagas/{id}/confirmar` |
| trailer passo 6 | Assistente, letra grande, SAMU 192 | paciente `/assistente`, `/urgencia` | `POST /acessibilidade/chat`, `GET /emergencia` |
| cena clínica 1 | Todos os pedidos num lugar só | clínica `/admin` (Solicitações) | `GET /painel-clinica/pedidos` |
| cena clínica 2 | Fila organizada por prioridade | clínica `/admin` → Triagem, `/fila` | `GET /clinicas/{id}/fila` |
| cena clínica 3 | Horário vago vira atendimento | clínica `/admin` → "Publicar vaga" | `POST /vagas` |

## Roteiro de demonstração do redirecionamento (slide 8)

1. Clínica, conta `funcionario.profissional.a` (Dr. Hugo, Bela Vista): `/admin` → Triagem → Bruno Souza → **Abrir prontuário**.
2. Escreva uma triagem com o procedimento **Canal (várias raízes)** e salve; depois **Validar registro**.
3. Bela Vista não ensina esse procedimento no semestre (`../backend/docs/fixtures/escopo-didatico.json`); o indexador escolhe a Barão Geraldo e separa o horário de 17/11, 14h.
4. Paciente, conta `paciente.bruno`: Meu cuidado → **Encaminhamentos** mostra o encaminhamento esperando resposta. Nada muda sem o paciente confirmar.

Para repetir do zero, recrie o banco de demonstração (o seed só faz upsert): apague `../backend/dev.db` e rode `./iniciar.sh --dev`.

## Diferenças conhecidas

- As capturas em `../motion/assets/c-*.webp` são anteriores à troca de fontes e cores do painel `/admin`. O conteúdo é o mesmo; recapture com `../motion/SPEC.md` §11 se quiser as cores novas no vídeo.
- O cartão "Confirmado pela clínica" do trailer é uma versão resumida das etapas de `/pedidos/:id` (ver `SPEC.md` §13).
- A revisão de faltas (`POST /faltas/{id}/revisao`) ainda não tem tela.
