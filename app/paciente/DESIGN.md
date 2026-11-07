# Design do app do paciente (celular)

Fonte: projeto **"UHealth — Identidade e Design"** feito no Claude Design
(<https://claude.ai/artifact/KFNqudmvKgs8stK8dimaiJ>). Este arquivo é a referência para
implementar o front do paciente (frente F1). Todos os nomes, clínicas e horários são fictícios.

Prioridade em caso de conflito: **`AGENTS.md` > contrato da API (OpenAPI) > este arquivo**.
A seção [Adaptações obrigatórias](#adaptações-obrigatórias) lista onde o design foi ajustado.

## Marca

- Lema: "A porta que não se fecha no primeiro 'não'."
- Símbolo: o U de "you" é um copo aberto e um sorriso; o sol amarelo dentro é a vaga que surge.
  Traço 6,5 em 48, curva semicírculo raio 11, sol raio 4,2 e **sempre amarelo**.

```svg
<svg viewBox="0 0 48 48" role="img" aria-label="Símbolo UHealth">
  <path d="M13 9v16a11 11 0 0 0 22 0V9" fill="none" stroke="#14BEB9" stroke-width="6.5" stroke-linecap="round"/>
  <circle cx="24" cy="15" r="4.2" fill="#FFB81C"/>
</svg>
```

- Direção escolhida: **A · Acolhedora** (calma e direta, raio 14–20, Lexend + Atkinson).
  As direções B (lúdica) e C (institucional) foram descartadas.
- Ilustrações: formas simples, sem rosto detalhado, idades e tons de pele variados, contorno
  Tinta 3 px, cores da marca e um toque de sol. Sempre com texto alternativo. Quatro previstas:
  encontrar clínicas (busca vazia e primeira abertura), horário confirmado, explicação em áudio,
  "outra porta se abre" (recusa e nenhuma clínica por perto).

## Sistema visual

Já implementado em `@uhealth/ui` (`app/packages/ui/src/styles/tokens.css` e `components.css`).
**Use os tokens; não repita cores no app.**

| Papel | Token | Regra |
|---|---|---|
| Ação principal | `--uh-brand` + `--uh-on-brand` | **Uma por tela.** Nunca texto branco sobre #14BEB9 (2,3:1). |
| Link e texto de cor | `--uh-link` (tom 700, #095F5C) | Nunca #14BEB9 como texto sobre claro (2,2:1). |
| Vaga e destaque | `--uh-sun` (#FFB81C) | Sempre com texto escuro. |
| Recusa e erro | `--uh-danger-*` (#B3261E) | Sempre com ícone e texto. |
| Borda de campo | `--uh-border-strong` | 3:1 ou mais. |

- **Temas:** claro, escuro (segue o aparelho) e alto contraste (opção própria, não depende do
  sistema). Troca com `data-theme="dark|hc"` na raiz; a escolha fica em "Ajuda > Aparência".
- **Espaço:** 4 · 8 · 12 · 16 · 20 · 24 px (`--uh-space-1…6`). **Raio:** chip 999 · controle 14 · cartão 20.
- **Alvo de toque:** 44 px mínimo (`--uh-target`); botão 52 px.
- **Fontes:** títulos Lexend 700, corpo Atkinson Hyperlegible 400, ênfase Atkinson 700. Sem itálico
  em texto longo; fonte do sistema como reserva.
- **Escala de texto** (botão "Aa", `data-scale="lg|xl"`), que também respeita o tamanho do aparelho:

| Estilo | Normal | Grande (125%) | Extra grande (160%) |
|---|---|---|---|
| Título de tela (Lexend 700) | 30 | 36 | 44 |
| Título de cartão | 20 | 25 | 32 |
| Corpo (Atkinson 400) | 16 | 20 | 26 |
| Botão | 18 · altura 52 | 22 · altura 64 | 28 · altura 76 |
| Altura de linha | 1,5 | 1,5 | 1,45 |

  Nada é cortado nem truncado. Botões lado a lado passam a ficar um embaixo do outro. Na escala
  extra grande, avisos mostram só o título e textos de apoio ficam mais curtos.

### Componentes

| Componente | Uso | Acessibilidade |
|---|---|---|
| `.btn--primary` | Ação principal, uma por tela | `<button>` ou `<a>`, foco de 3 px, alvo 44 px |
| `.chip` | Estado do pedido ou da clínica | Ícone e texto, nunca só cor |
| `.notice` | Aviso curto, título até 6 palavras | `role="status"`; erro importante `role="alert"` |
| `.card` / `.card--selected` | Clínica, pedido, vaga | Título em `<h2>` ligado por `aria-labelledby` |
| `.tabbar` | Navegação, 3 a 5 abas | `aria-current="page"` na ativa |
| `.stepper` | Roteiro do pedido em 5 etapas | Lista ordenada; atual com `aria-current="step"` e "Você está aqui" |
| `.timeline` | Histórico do pedido | Lista ordenada com `<time datetime>` |

### Ícones

Grade de 24 px, traço 2,2 px com pontas arredondadas, `fill="none"` e `stroke="currentColor"`.
Tamanhos: 20 (inline), 24 (padrão), 32 (abas), 48 (destaque). **Sempre com texto ao lado**; ícone
sozinho leva `aria-label`. Sobre #14BEB9 o ícone é Tinta; sobre claro, tom 700; "Não recebe" e
"Alerta" usam a cor de perigo. Os SVGs (`viewBox="0 0 24 24"`) estão em [Apêndice: ícones](#apêndice-ícones).

## Escrita

- Frases curtas, voz ativa, verbo no botão ("Enviar pedido"). Nunca culpar: "Clínica A não pode receber agora".
- Aviso: uma ideia, título de até 6–7 palavras, nada abaixo de 16 px. O detalhe vai para uma tela.
- **Toast:** uma linha, 4 a 8 s (se tiver botão, fica até fechar). **Faixa:** até 2 linhas, fica até
  resolver. **Modal:** só para decidir algo, título até 7 palavras e dois botões claros.

| Situação | Texto |
|---|---|
| Clínica recusou | Clínica A não pode receber agora. |
| Pedido enviado | Pedido enviado. A clínica vai analisar. |
| Interesse em vaga | Ainda não é reserva. A clínica confirma. |
| Emergência | Caso grave? Ligue 192 (SAMU). |
| Alternativas | Nada é enviado sem a sua confirmação. |
| Por que esta clínica | Atende adultos, recebe pedidos e é a mais perto. |

"Explique de outro jeito" tem três níveis (instituição, simples, detalhado). Exemplos:

| Situação | Simples | Detalhado |
|---|---|---|
| Em análise | A clínica recebeu seu pedido e ainda vai analisá-lo. | A clínica recebeu seu pedido. A equipe vai ler as informações e decidir o próximo passo. Isso pode levar alguns dias. |
| Triagem | Marcaram uma conversa para ver o seu caso. | Um profissional vai avaliar o seu caso e dizer se a clínica pode atender. Não é o tratamento ainda. |
| Sem vaga | Essa clínica não pode receber agora. | A clínica não tem lugar neste momento. Isso não é sobre você. Mostramos outras opções e você escolhe. |

## Telas (375×812 primeiro)

Cabeçalho com marca, botão "Aa" e emergência sempre acessível. Abas no rodapé.

1. **Primeira abertura (3 passos).**
   - Boas-vindas: símbolo, "Encontre clínicas-escola, peça atendimento e acompanhe cada passo.", "Começar", "Ouvir em áudio".
   - Passo 1 de 2: "Você procura atendimento para quem?" (Para mim / Para outra pessoa). Nota: pode pedir por criança ou pessoa idosa.
   - Passo 2 de 2: "Como você prefere receber as informações?" (Simples e curto / Detalhado / Também em áudio), tamanho das letras (Normal / Grande / Extra) com **rádios visíveis**, telefone opcional, "Pronto".
2. **Encontrar clínicas.** "Onde você quer ser atendido?", cidade com "Trocar", "N clínicas-escola perto de você". Cartões com nome, distância, chip de estado ("Recebendo pedidos" / "Fechada por ora"), custo ("Gratuito" / "Custo a confirmar"), público ("Adultos · atende também por telefone") e "Escolher esta clínica".
3. **Lista com mapa e filtros.** Chips de filtro (Recebendo pedidos, Gratuito, Adultos, Crianças), mapa com marcadores A/B/C, "Ver só a lista", "3 clínicas · por distância". **O mapa sempre tem alternativa em lista.**
4. **Pedir atendimento (conversa).** Perguntas uma de cada vez com respostas rápidas ("Para mim"; "Ligação" / "Mensagem"), "Explique de outro jeito" e campo de mensagem.
5. **Revisar antes de enviar.** Clínica, para quem, contato, custo; consentimento "Autorizo a Clínica-Escola A a ver estas informações para analisar meu pedido."; "Você pode retirar o pedido a qualquer momento."; "Enviar pedido" e "Corrigir algo".
6. **Pedido enviado.** "A clínica vai analisar e te avisar por ligação." e "Ainda não é consulta marcada."; "Acompanhar pedido" e "Voltar ao início".
7. **Acompanhar pedido.** Stepper de 5 etapas: Solicitação enviada (com hora) → Em análise pela clínica → Triagem ou contato → Horário confirmado → Atendimento realizado. Botões "Ouvir em áudio" e "Ligar para a clínica"; aviso "Caso grave? Ligue 192 (SAMU).".
8. **Alternativas.** "Clínica A não pode receber agora." e "Encontramos outras opções para você", seguido de "Nada é enviado sem a sua confirmação.". Cartão com "Por que ela?", alerta de custo não informado e "Enviar meu pedido para B". Outros cartões com "Ver detalhes". Saída "Agora não, quero esperar".
9. **Vaga liberada.** Chip sol "Surgiu uma vaga", clínica, distância, data, tipo ("Avaliação inicial"). Botões "Tenho interesse", "Não consigo nesse horário" e "Preciso falar por telefone". Aviso "Ainda não é reserva. A clínica confirma.".
10. **Horário confirmado.** Data, clínica, endereço, distância, "Chegue 15 minutos antes e leve um documento com foto.". Botões "Adicionar ao calendário", "Ligar para a clínica" e "Não vou conseguir ir".
11. **Urgência.** "Você precisa de ajuda urgente?" com três opções:
    - Sinais graves, que leva a "Ligar 192 (SAMU)".
    - Dor forte, mas consigo respirar e falar, que leva a "Vamos avisar a clínica". Essa tela diz "Um profissional da clínica avalia o seu pedido. Pedir como urgente não reduz a sua vez.", mostra "Se piorar, ligue 192 (SAMU). Não espere a resposta da clínica." e tem o botão "Enviar pedido urgente".
    - Não é urgente.

    Rodapé: "Em caso de dúvida, ligue 192.".
12. **Estados de erro.**
    - **Sem internet:** "Seu pedido fica salvo e será enviado quando a conexão voltar." Botões "Tentar de novo" e "Ligar para a clínica".
    - **Nenhuma clínica em até 10 km:** "Buscar até 30 km", "Trocar de cidade", "Atendimento por telefone".
    - **Nenhuma clínica pode receber agora:** lista das clínicas já tentadas, "Avisar quando abrir vaga", "Ver clínicas mais longe".
    - **Vaga já preenchida:** "Seu pedido continua ativo." Botões "Ver meu pedido" e "Ver outras clínicas".

**Jornada da demonstração (90 s):** escolher A → revisar e enviar → em análise → A recusa →
escolher B → enviar → B publica vaga → "Tenho interesse" → B confirma → horário confirmado.

## Adaptações obrigatórias

O app foi comparado lado a lado com as pranchas (tema claro, 390×844): paleta, fontes, medidas, ícones, ilustrações
e textos são os do design. As únicas diferenças, todas por regra do produto ou por falta de dado na API
(o backend não foi alterado):

| No design | No app | Motivo |
|---|---|---|
| Distância em km, mapa e marcadores | Omitidos; "N clínicas-escola em {cidade}" | A API não tem coordenadas nem distância; não inventamos dado |
| "Atendimento odontológico perto de você" | "Atendimento em clínicas-escola perto de você" | Não fixar em odontologia |
| Sinais graves com "rosto ou pescoço" | Texto estático do projeto (`TEXTO_EMERGENCIA`) + aviso "Texto de exemplo. Precisa ser validado por profissional de saúde." | Urgência validada por humano; SAMU estático |
| "Ligação / Mensagem" e telefone para contato | Omitidos | A API não tem esses campos; coletar sem usar não faz sentido |
| "Também em áudio" no passo 2 | Omitido (o botão "Ouvir em áudio" fica nas telas) | Escolher uma opção sem efeito prometeria o que não existe |
| "Você pode retirar o pedido a qualquer momento" | "Enviar não garante vaga. Ainda não é consulta marcada." | A API não tem endpoint para retirar pedido |
| Caixa de consentimento já marcada | Começa desmarcada; "Enviar pedido" só libera depois | Consentimento tem de ser um ato do paciente |
| "Seu pedido fica salvo e será enviado quando a conexão voltar" | Mensagem da API ("Não foi possível conectar…") | Não existe fila offline |
| "Quando uma clínica abrir vaga, você recebe um aviso" | Não implementado (sem push) | Não prometer o que não existe |
| "Avaliação inicial" na vaga, "Rua Exemplo, 100" no horário | Especialidade / data | A API não tem tipo de vaga nem endereço |
| Faixa de demonstração no topo | Mantida | Rotular mock/demo na UI |
| "Caso grave? Ligue 192 (SAMU)" só no Acompanhar | Também na busca e em "Meu pedido", com link "Estou com uma urgência" | SAMU sempre acessível |
| Aba "Ajuda" | Abre o assistente (chat) | É onde a ajuda existe hoje |
| Início e Agenda | "/" abre a busca; a agenda é a tela "Horário confirmado" | O design tem 3 abas |
| Alternativas: "Ver detalhes" no 2º cartão | "Enviar meu pedido para {clínica}" | Sem tela de detalhe no design; o paciente escolhe e envia |

Pendências da auditoria de acessibilidade do design (WCAG 2.2 AA) que valem para o app:
- Botão principal #14BEB9 com borda de 2,2:1: decidir entre borda de 2 px em Tinta ou testar com pessoas.
- Placeholder com cor #3F5958 (7,2:1).
- Ícones em SVG, nunca símbolos de texto (♫ ◐).
- Hospedar Lexend e Atkinson no próprio servidor, por causa da LGPD; não usar Google Fonts.
- Não testado ainda: leitor de tela, teclado, zoom de 200%, reflow a 320 px, escala de 160% nas telas reais.

## Apêndice: ícones

Conteúdo interno de `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">`.

| Nome | SVG |
|---|---|
| Buscar | `<circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="2.2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Local | `<path d="M12 21s7-6 7-11.5a7 7 0 0 0-14 0C5 15 12 21 12 21z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.5" stroke="currentColor" stroke-width="2.2"/>` |
| Telefone | `<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 13l4 1.5v3a2.5 2.5 0 0 1-2.5 2.5A13.5 13.5 0 0 1 4 6.5 2.5 2.5 0 0 1 6.5 4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>` |
| Áudio | `<path d="M4 9v6h4l5 4V5L8 9z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Horário | `<rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="2.2"/><path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Em análise | `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Confirmado | `<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` |
| Não recebe | `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2"/><path d="M8 12h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Alerta | `<path d="M12 4l9 15.5H3z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Conversa | `<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16A2.5 2.5 0 0 1 5 13.5z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>` |
| Meu pedido | `<path d="M7 4h7l4 4v12H7z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 13h5M10 16.5h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Clínica | `<path d="M4 21V10l8-6 8 6v11" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 21v-6h4v6M12 8v3M10.5 9.5h3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Pessoa | `<circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="2.2"/><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Aviso | `<path d="M6 17V9a6 6 0 0 1 12 0v8l2 2H4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 21h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Filtro | `<path d="M3 5h18l-7 8v6l-4-2v-4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>` |
| Voltar | `<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` |
| Vaga | `<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
| Ajuda | `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.8v.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` |
