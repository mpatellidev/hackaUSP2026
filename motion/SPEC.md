# SPEC — Motion e slides do Sorriu+

Especificação para portar **1:1** o trailer (`index.html`) e o deck do pitch (`slides.html`) para o app web (React + Vite, workspaces em `app/`). Os HTML desta pasta são a **referência executável**: em qualquer dúvida de valor, o código deles vence este texto. Este documento diz *o que* existe, *com quais medidas e tempos*, e *como verificar* que o port ficou igual.

Prioridade em conflito: `AGENTS.md` > este SPEC > gosto pessoal.

---

## 1. Escopo e critérios de aceite

| Peça | Arquivo de referência | Duração / tamanho | Uso |
|---|---|---|---|
| Trailer | `index.html` | 45,0 s, loop, sem som | Stand (tela/TV) |
| Vídeo do trailer | `sorriu-mais-motion.mp4` | 1920×1080, 30 fps, H.264 | Stand sem navegador |
| Deck | `slides.html` | 12 slides (0–11), avanço por clique | Pitch de 5 min (4:04 planejados + folga) |
| Roteiro | `roteiro.md` | ~620 palavras | Falas e notas do deck |
| PDF de reserva | `sorriu-mais-deck.pdf` (`exportar-pdf.cjs`) | 15 páginas 16:9 | Plano B sem navegador |
| Vídeo do deck | `sorriu-mais-deck.mp4` + `.srt` (`render-deck.cjs`) | ~5 min, 1920×1080, 30 fps, legenda, sem voz | Envio para a banca / backup |

O port está pronto quando:
1. Em 1920×1080, os quadros dos tempos da §8.3 e o estado final de cada slide (§9) batem com a referência (mesmo texto, posição ±4 px, mesmas cores).
2. O trailer emenda: o quadro de 45,0 s é idêntico ao de 0,0 s.
3. A navegação do deck responde às teclas da §9.1, e cada slide tem o número de passos da tabela da §9.3.
4. Nenhum número aparece sem a fonte da §10.

## 2. Marca

- **Nome:** `Sorriu+`. É escrito em branco, com **só o "u" em amarelo** `#FFB81C`, sempre sobre o verde-escuro `#075E59`.
- **No app:** o componente `Marca` de `@uhealth/ui` (`app/packages/ui/src/componentes/Basicos.tsx`) já faz isso, num selo verde-escuro com `role="img"` e `aria-label="Sorriu+"`. Não escreva o nome à mão.
- **Logo:** `assets/logo.webp` (cópia de `app/paciente/src/design/logo.png`, 1254² px), um dente-livro sobre quadrado verde-escuro. No palco aparece com 190 px e raio 44 px.
- **Lema:** "A porta que não se fecha no primeiro 'não'."
- **Linha de apoio do lockup:** "clínicas-escola de odontologia perto de você".
- **Time:** Foolstack, com Alex, André, Giovanni, Lucca e Murilo. Evento: HackaUSP 2026.

## 3. Tokens (`comum.css`)

| Token | Valor | Equivalente no app (`tokens.css`) | Uso |
|---|---|---|---|
| `--teal` | `#14BEB9` | `--uh-teal-400` / `--uh-brand` | Preenchimentos, barras, quadrados "on" |
| `--verde` | `#075E59` | `--uh-marca-bg` | Fundo da marca, títulos `em`, cenas verdes |
| `--tinta` | `#0B2423` | `--uh-text` | Texto, contornos de 3–4 px |
| `--sol` | `#FFB81C` | `--uh-sun` | Destaque, faixa da transição, "u" |
| `--nevoa` | `#E8F9F8` | `--uh-teal-50` | Fundo de cenas "nevoa" |
| `--branco` | `#FFFFFF` | — | Fundo padrão |
| `--muted` | `#3F5958` | `--uh-muted` | Texto de apoio, fontes |
| `--linha` | `#D2E5E4` | `--uh-line` | Trilhas, divisores |
| `--fundo-claro` | radial teal 45% no canto sup. esq. (900 px) + radial sol 22% no canto inf. dir. (760 px) sobre branco | — | Fundo padrão das cenas |

Regras de contraste do app: nunca texto branco sobre `#14BEB9` e nunca `#14BEB9` como texto sobre claro. O amarelo sempre leva texto escuro, exceto o "u" sobre verde-escuro (4,4:1, título grande).

**Fontes** (Google Fonts): Lexend 400/600/700/800 para display e Atkinson Hyperlegible 400/700 para corpo, com `system-ui` como reserva.

## 4. Palco e escala

- O palco tem tamanho fixo de **1920×1080 px**. Tudo é posicionado em px dentro dele.
- **Escala na tela:** `k = min(innerWidth/1920, innerHeight/1080)`, com `transform: scale(k)` centralizado (`Sorriu.ajustarPalco`). No render, `k = 1`.
- **Cena:** camada `position:absolute; inset:0; overflow:hidden; display:none`. Cada cena tem fundo **opaco**, porque a transição revela uma cena sobre a outra.
  - Variantes: padrão (`--fundo-claro`), `.nevoa` (`--nevoa`) e `.verde` (`--verde`, texto branco).
- **z-index:** cada cena tem o seu (o trailer usa 10, 20, …, 90 na ordem). A faixa da transição fica sempre em `z(próxima) − 1`.

## 5. Tipografia (px no palco)

| Classe | Fonte | Tamanho / altura | Extra |
|---|---|---|---|
| `.eyebrow` | Lexend 700 | 30 | MAIÚSCULAS, `letter-spacing` 4; cor verde (sol em cena verde) |
| `.titulo` | Lexend 800 | 96 / 1.02 | `letter-spacing` −2.5; `em` em verde (sol em cena verde); `text-wrap: balance` |
| títulos de passo | Lexend 800 | 92 (deck/app), 84 (score, redirecionamento), 80 (clínica), 76 (slides 3 e 10) | — |
| `.apoio` | Atkinson 400 | 40 / 1.35 | cor muted; largura máx. 860 |
| `.numero` | Lexend 800 | 280 / 0.9 (210 para "20–35%") | `letter-spacing` −12; `tabular-nums`; `small` 110 em tinta |
| `.fonte` | Atkinson 400 | 28 | absoluto em `left:140; bottom:52` |
| `.chip` | Lexend 700 | 36 (34 no deck, 27 na fórmula) | padding 20×30, raio 24, sombra `0 24px 50px -16px rgba(11,36,35,.35)` |
| `.selo-demo` | Lexend 700 | 24 | "Telas do protótipo · dados fictícios"; `right:60; bottom:40`; borda verde de 2 px |

**Margem lateral:** 140 px.

## 6. Componentes

- **Lockup:** fundo verde-escuro em tela cheia.
  - Logo 190 px + palavra "Sorriu+" (Lexend 800, 190 px, `letter-spacing` −6, cada letra num `span`; o "u" em amarelo), com 44 px entre eles.
  - Linha de apoio a 150 px do fundo, Lexend 400, 40 px, cor `#C7F0EE`.
  - No deck, acima: "FOOLSTACK · HACKAUSP 2026", Lexend 700, 30 px, amarelo, `top:110`.
- **Celular:** caixa de 446×940, `perspective: 2200px`.
  - Corpo `#0B2423` com raio 70 e padding 22. Tela de 390×844 com raio 50, a 26 px do topo. Notch preto de 120×30 a 18 px.
  - Sombra `0 60px 120px -30px rgba(7,94,89,.55)`.
  - As capturas ocupam 390 px de largura; capturas mais altas rolam com `y` negativo.
  - Posição: `left 1180, top 70` (trailer) ou `left 1260, top 70` (deck).
  - Inclinação 3D: `rotationY −24→−8`, `rotationX 8→3` (trailer, ao longo de 14 s); `−22→−9` e `7→3` (deck, 6 s).
- **Notebook:** tela de 1280×800 com moldura de 18 px `#0B2423` e raio 22 só no topo, posicionado em `left 320, top 300` e vazando pela base.
  - Captura de 1600×1000 mostrada em 1280 px de largura (escala 0,8).
  - Uma camada `.cam` (inset 0) recebe o zoom.
- **Realce:** retângulo com borda amarela de 8 px e raio 18, `opacity` 0→1.
- **Toque:** círculo de 70 px `rgba(11,36,35,.18)` com borda de 4 px `rgba(11,36,35,.55)`.
- **Cadeira** (SVG 120²): estado cheio (teal com contorno tinta de 4 px) ou vazio (branco com tracejado `#9FB5B4` 10/8).
- **Portas:** SVG `0 0 260 220`, as mesmas portas da ilustração `boasVindas` do app (`app/paciente/src/design/Ilustracoes.tsx`).
  - A folha amarela "abre" com `scaleX 1→0,12` (`svgOrigin` "164 150").
  - O feixe é um gradiente amarelo de 75% → 0.

## 7. Primitivas de animação (GSAP 3.12.5)

| Nome | Definição exata |
|---|---|
| `quebrar(el)` | Envolve cada palavra em `span.w` (overflow hidden) > `span`. É idempotente. |
| `entra` | Nas palavras: `from yPercent 110`, duração 0,7, `stagger` 0,045 (0,02–0,03 em textos de apoio), `power3.out` |
| `sai` | Nas palavras: `to yPercent −110`, duração 0,35, `stagger` 0,01, `power2.in`; depois `visibility:hidden` |
| `pop` | `fromTo {scale .4, opacity 0, y 30} → {1, 1, 0}`, duração 0,5, `back.out(2.2)`; saída: `opacity 0, x −40`, 0,3, `power2.in` |
| **`sorriso`** (transição única) | No tempo t: a próxima cena recebe `display:block` e `clipPath: ellipse(0% 0% at 50% -10%)`; a faixa amarela recebe o mesmo clip com `z = z(próxima) − 1`. A faixa vai a `ellipse(160% 130% at 50% -10%)` em d = 0,9 s (0,8 no deck), `power3.inOut`. A próxima cena faz o mesmo começando 0,14 s depois. Em t + d + 0,14, a faixa e a cena anterior recebem `display:none`. A borda que desce tem forma de sorriso, com uma faixa amarela na frente. |
| troca de tela (celular) | A nova entra com `xPercent 100→0` e a antiga sai com `0→−30`, ambas 0,5 s `power3.inOut`; a antiga é ocultada ao fim |
| toque | `fromTo scale .4 opacity 0 → scale 1.3 opacity 1` (0,25 s), depois `opacity 0 scale 1.8` (0,3 s) |
| contador | Objeto `{v}` animado com `power2.out` e texto em pt-BR: `117,5` com 1 casa, `66%` inteiro |
| câmera | Zoom em `.cam`: `scale` + `transformOrigin` em px na tela, 0,8–0,9 s `power2.inOut` |
| `salto` (deck; sem uso desde que a escada saiu, fica para reuso) | Agacha (`scaleX 1.2, scaleY .78`, origem na base, 0,14 s) → estica (`.9 / 1.12`, 0,1 s) → voa 0,62 s com `x` linear e `y = lerp − altura·4p(1−p)` (altura 220) → pousa (`1.22 / .8`, 0,09 s) → `elastic.out(1, .45)` até 1/1 em 0,45 s |

**Determinismo do trailer:** uma única timeline pausada, controlada por `seek(t)`. O código expõe `window.__seek(t)`, `window.__duration` (45) e `window.__pronto` (fontes e imagens carregadas). Não use `Date`, `Math.random` nem callbacks com efeito colateral na timeline do trailer, para que o render quadro a quadro seja idêntico. Os textos mudam só via `onUpdate`, que é determinístico.

## 8. Trailer (45 s)

### 8.1 Cenas e tempos

| # | Cena (id) | Entra (sorriso) | Conteúdo e animação (segundos absolutos) |
|---|---|---|---|
| 0 | `s-abre` lockup | já visível em 0 | Parado até 1,1 (é idêntico ao último quadro) |
| 1 | `s-espera` | 1,1 | Eyebrow "NA ODONTOLOGIA" (1,5). Número `117,5 dias` conta de 0 em 1,8–4,2. Grade de 118 quadrados (14 col., 600 px, gap 14, raio 10) acende junto com o número. Legenda "1 quadrado = 1 dia" e "dia N" (2,0). Apoio "de espera média para começar um tratamento." (2,3). Fonte (2,8). Fica parado até 7,6. |
| 2 | `s-faltas` | 7,6 | Eyebrow "E DO OUTRO LADO". Número "20–35%" (210 px). Apoio "das consultas odontológicas na atenção básica terminam em falta. A cadeira fica vazia." Grade de 5×4 cadeiras (700 px). As cadeiras 3, 8, 14, 19 esvaziam a cada 0,2 s a partir de 9,3 (20%); depois 6, 12, 17 a cada 0,3 s (35%). Fica parado até 13,2. |
| 3 | `s-virada` (nevoa) | 13,2 | Portas (600 px, `top 70`). O X vermelho aparece na porta 1 (14,0) e ela fica a 45%. A seta entra (14,3). A folha amarela abre (14,5–15,5) com o feixe. Título "Existe *outra porta.*" (14,4). Apoio "As clínicas-escola de odontologia das universidades atendem a comunidade e precisam de pacientes para formar novos dentistas." (14,9). |
| 4 | `s-app` | 16,6 | O celular sobe de `y 700` (16,8). Eyebrow "PARA QUEM PRECISA DE ATENDIMENTO". Contador de 6 barras (64×8). Seis passos nos tempos [17,1; 19,6; 22,0; 24,4; 26,6; 28,8] até 31,0 (§8.2). |
| 5 | `s-clinica` (nevoa) | 31,0 | Eyebrow "PARA A CLÍNICA-ESCOLA". O notebook sobe (31,3). Três títulos: "Todos os pedidos *num lugar só.*" (31,5), com zoom 1.2 em (727, 198) e realce dos contadores. "Fila organizada *por prioridade.*" (33,7), com a tela da fila, zoom 1.4 em (657, 260), realce da 1ª linha e chip "Urgência avaliada vem primeiro". "Horário vago vira *atendimento.*" (35,5), com zoom 1.8 em (1260, 60), realce de "Publicar vaga" e chip "Publicar vaga em 1 clique". |
| 6 | `s-impacto` (verde) | 36,6 | Três linhas de 124 px: "Mais s**o**rrisos de volta." (o "o" em amarelo), "Mais gente atendida.", "Mais alunos aprendendo." (37,1 / 37,6 / 38,1). Sorriso amarelo desenhado com `strokeDashoffset` (37,4). Cartão branco "66%" (conta em 38,4–39,2) com "dos estudantes que pensam em desistir de odontologia nunca tiveram prática clínica." e "Fonte: Revista da ABENO." |
| 7 | `s-fim` | 41,0 | Selo da marca. "A porta que não se fecha *no primeiro "não".*" (100 px). Rodapé "Protótipo · dados fictícios" + "Foolstack · HackaUSP 2026". |
| 8 | `s-fecha` lockup | 43,3 | Logo com `scale .5→1, rotation −12→0` (43,6). Letras sobem em sequência (43,65). Linha de apoio (44,0). Brilho no "u" (44,2–44,8). Em 45,0, fica igual ao quadro 0. |

### 8.2 Passos do app (cena 4)

| Passo | Título (`em` em verde) | Apoio | Telas e efeitos |
|---|---|---|---|
| 1 | Ache a clínica-escola *mais perto.* | Distância, custo, turnos e acessibilidade, em linguagem simples. | `p-busca`. Chips "1,7 km de você" e "Gratuito". Toque em (195, 330). Troca para `p-clinica`, que rola `y −420`. |
| 2 | Ouviu um não? *Outra porta se abre.* | O app mostra outras clínicas. Você escolhe para onde vai. | `p-recusa`. Toque em (195, 412). Troca para `p-alternativas`. Chip "Nada é enviado sem você confirmar". |
| 3 | Encaminhado para outra *universidade.* | A clínica nova vê o diagnóstico já feito, e você não repete exames. | `p-encaminhamento` rola `y −165`. Chips "Sem repetir exames" e "Você confirma antes de ir". |
| 4 | Um prontuário que *vai com você.* | Protegido, com registro de quem viu. Outra clínica só vê com a sua confirmação. | `p-prontuario` rola `y −78`. Chip "Registro de quem viu e quando". |
| 5 | Escolha o dia. *A clínica confirma.* | "Confirmado" só aparece quando a clínica confirma. | A tela desfoca (6 px). Cartão sobe com 3 etapas: "Pedido enviado", "Clínica analisando", "Confirmado pela clínica" (a bola final em amarelo). Depois "Qui, 13/11 · 09:30" e "Clínica Odontológica Vila Mariana" (vaga `f1…0002` das fixtures). |
| 6 | Ajuda que *explica.* | Assistente, letra grande e áudio. Emergência: SAMU 192 sempre à vista. | `p-assistente`, depois troca para `p-urgencia`. Chip "SAMU 192 a um toque". |

### 8.3 Quadros de verificação

Compare o port com a referência nestes tempos (s): 0,5 · 1,55 (sorriso no meio) · 4,6 · 11 · 14,9 · 18,2 · 21,2 · 23,4 · 25,6 · 28,0 · 30,4 · 32,7 · 34,6 · 36,4 · 39,5 · 42,4 · 44,99. O `storyboard.png` mostra 16 desses quadros.

## 9. Deck (`slides.html`)

### 9.1 Navegação
- **Avançar:** → / espaço / PageDown / Enter / clique. Roda o próximo passo do slide; sem passos restantes, faz a transição `sorriso` (0,8 s) para o próximo slide, e o 1º passo dele roda sozinho 0,55 s depois.
- **Voltar:** ← / PageUp / Backspace / clique direito. Mostra o slide anterior **já montado**.
- **Atalhos:** Home vai ao primeiro slide, End ao último (montado). **F** abre tela cheia. **N** mostra as notas (fala do slide; "▸" marca onde clicar).
- **Endereço:** `#sN` abre no slide N já montado. O deck grava `#sN` a cada troca.
- **Interface:** "NN / 11" no canto superior direito (Lexend 700, 24 px) e barra amarela de progresso de 6 px na base. Ambos ficam ocultos no slide 0.
- Se o 1º passo ainda não começou, um clique só o inicia.
- **Demo do app:** **D** (ou clique no celular depois do 1º passo) abre o modo demo: transição `sorriso` para um fundo verde, o celular voa da posição do slide até `left 1180, top 64` (escala 1,02; 0,92 no slide 8) e um halo amarelo de 20 px aparece com `back.out(2.4)`. Tela ao vivo (iframe do servidor de dev, ?paciente/?clinica) ou protótipo clicável (`TELAS`/`TELAS_C` em `slides.html`). **Esc**/**D** fecha revertendo a timeline (1,7×).
- **Apresentador:** **P** abre `slides.html?apresentador` numa janela; as duas conversam por `postMessage` (estado do deck → janela; comandos ← janela). Meta por slide: 12, 28, 15, 20, 25, 22, 15, 20, 25, 25, 20, 20, 18, 20, 15 s (5:00).
- **Ensaio (no apresentador):** o botão **Ensaio** zera e começa a gravar o tempo real em cada slide (liga o cronômetro; **Pausar** também pausa o ensaio). A lista mostra `real / meta` por slide (vermelho quando passa). Desligar (ou "Encerrar e ver resumo" no último slide) abre o **resumo**: tabela meta × real × diferença × palavras da fala (`NOTAS`, sem `[clique]`) × palavras por minuto, e a lista dos slides que estouraram, do maior estouro para o menor, com quantas palavras cortar no ritmo daquele ensaio (`palavras × excesso ÷ tempo real`). Fica no `localStorage` do navegador (`sorriu-ensaio-v1`, com `try/catch`); "Apagar ensaio" limpa.
- **Apêndice da banca:** **A** (ou o botão no apresentador) abre uma camada dentro do palco, fora da contagem de slides (§9.4). **1–6** amplia um cartão (ou clique nele); **Esc** volta da resposta ampliada e, de novo, fecha; **A** fecha. Com o apêndice aberto, → e clique não avançam o deck.
- **Movimento reduzido:** troca seca, passos já montados, abertura parada no lockup e celular sem flutuar.
- **API de script:** `window.__deck` = `{ ir, avancar, abrirDemo, fecharDemo, abrirApendice, fecharApendice, ampliar, pronto, NOTAS, PLANO, atual, passo, demo, apendice, passos(i) }`. `pronto` é a promessa de fontes e imagens carregadas; `passos(i)` devolve a duração (s) de cada passo do slide `i`.

### 9.2 Slide 0: abertura em loop (14 s, `repeat −1`)
1. Lockup do deck parado, com brilho no "u" pulsando 4 vezes (0,4–3,6).
2. Em 4,4, sorriso para a camada branca: portas (520 px) sobem, a porta 1 fica a 45%, a folha abre e o feixe aparece; o lema entra palavra por palavra (5,4).
3. Em 11,2, sorriso para a cópia do lockup: o logo gira e cresce, as letras sobem.
4. Em 14 s, repete.

O loop pausa 1,2 s depois de sair do slide 0 e reinicia ao voltar.

### 9.3 Slides

| # | id | Fundo | Conteúdo | Passos (cliques) |
|---|---|---|---|---|
| 0 | `sl0` | verde | Abertura parada: só a marca Sorriu+ (logo, palavra, lema "Saúde bucal para todos · clínicas-escola perto de você" e "Foolstack · HackaUSP 2026"). Entra uma vez (logo com `back.out`, letras subindo, brilho no "u") e fica; **não há mais o loop da porta** | 1 |
| 1 | `sl-ponte` | claro | "Duas pessoas, *a mesma cidade.*"; mapa estilizado de São Paulo com pinos/avatares de **Dona Cida** (Guaianases) e **Rafael** (clínica-escola); cartões laterais; "Personagens ilustrativos" | **3:** (1) mapa, pino e cartão da Cida, dor piscando; (2) pino e cartão do Rafael, "Nunca se encontram."; (3) a rota amarela se desenha (comprimento medido no DOM), a marca pousa no meio, frase com marcador |
| 2 | `sl-dores` | claro | "BARREIRAS DE ACESSO À SAÚDE"; "Paciente na fila. *Cadeira vazia.*"; `95 dias` à esquerda (até 170 para um canal), 20 cadeiras e "32,9%" à direita; selos "Barreira financeira e de tempo" e "Barreira organizacional" | **2:** (1) **uma animação só**: os dias contam até 95 enquanto 7 das 20 cadeiras esvaziam (0,36 s entre elas) e os selos aparecem; (2) faixa "Para quem tem baixa renda, *saúde bucal ainda é privilégio.*" |
| 3 | `sl3` | claro | Dados espalhados · clínica invisível (selo "Barreira de informação") | **3:** (3) o fundo esmaece e sobe a faixa "Trocou de clínica-escola? A ficha fica para trás: o paciente refaz o raio-X, conta tudo de novo e começa do zero." |
| 4 | `sl4` | nevoa | "Não falta oferta nem demanda. *Falta conexão.*"; hub em escala 0,6 no meio; selos Financeira · Geográfica · De informação | **3:** (1) hub e 1º marcador; (2) pulsos no hub, o celular sobe à direita (`p-busca`), "1,7 km de você" derruba Geográfica e "Gratuito" derruba Financeira; (3) toque → `p-clinica`, "Entrada sem degraus" derruba De informação, entram os marcadores de prontuário único e sistema próprio |
| 5 | `sl7` | claro | "Fila justa: *quem comparece avança.*"; fórmula, fila (Cida no topo), celular; selo "Barreira organizacional" | **2:** (2) a fila reordena, o selo cai e entram os chips das regras humanas |
| 6 | `sl8` | claro | "Recusa vira *encaminhamento.*"; critérios; A → B; selo "Barreira da recusa" | **2:** (2) 3 bolinhas A → B, realce em "Confirmar encaminhamento", mão dupla B → A (1,3 s) e o selo cai |
| 7 | `sl6` | claro | Prontuário; selo "Barreira da continuidade" | **2** |
| 8 | `sl-painel` | nevoa | "DO LADO DA CLÍNICA-ESCOLA"; "Tudo num *painel só.*"; 3 etapas; notebook (escala 0,8) com `c-solicitacoes` → `c-triagem` → `c-prontuario` | **3:** cada passo acende uma etapa, troca a tela e aproxima a câmera (origem 0 0, `x = ox(1−s)`) até o realce. **D** aqui é a demo **animada** de 20 s: o notebook voa do slide, e um roteiro (`tour()`) toca sozinho a jornada da Cida no protótipo offline, com toques visíveis e legenda numerada 1–5; **R** repete |
| 9 | `sl-ganho` | claro | "A clínica economiza *e fatura.*"; metade **Economiza** (recepção até R$ 91 mil, material, ociosidade) e metade **Fatura** (horários recuperados R$ 36 mil, alunos retidos R$ 108 mil) | **2:** (1) metades entram e os valores contam; (2) os valores pulsam e sobe a faixa "≈ R$ 235 mil" (conservador R$ 72 mil) |
| 10 | `sl-receita` | nevoa | "A clínica paga por cadeira. *O paciente, não.*"; rodízio (anel de 8 h, 4 turnos) e corrente 800 → 32.000 → 8.000 → 2.400; cartão de preço (R$ 20/cadeira/mês + R$ 20/horário recuperado = R$ 57,6 mil); barras 5 → 20 → 50 clínicas; Programa Nacional de Redução das Filas | **3:** (1) o anel gira e a corrente conta; (2) preço e "R$ 1 → R$ 4"; (3) barras de escala e a linha da rede pública |
| 11 | `sl11` | verde | "Saúde bucal *para todos.*" (marcador); "A Cida voltou a sorrir. O Rafael ganhou prática."; placar com as 6 barreiras derrubadas; fotos do time (150 px, borda sol); QR com `?qr=` | **1** |

Coesão entre slides: (a) **continuidade do celular** nos slides de produto seguidos (4→5→6→7): em vez do sorriso, os slides se fundem em 0,5 s e um clone do celular desliza da posição antiga para a nova (0,8 s, `power3.inOut`); o celular dos slides 5–7 não entra mais dentro do passo, quem cuida é `ir()` (sobe do fundo 0,6 s depois da troca quando não há continuidade). (b) **Marcador** amarelo (`.marca`, variável `--m` de 0 a 100%, 0,6 s) nas frases-tese: "Falta a ponte", "saúde bucal ainda é privilégio", "Falta conexão", "rede pública", "para todos". (c) **Selo de barreira**: treme 0,3 s, é riscado e vira verde.

As falas de cada slide estão em `roteiro.md` e no array `NOTAS` de `slides.html`.

### 9.4 Apêndice para a banca (tecla A)

Mesmo palco 1920×1080: transição `sorriso` para um fundo verde (`#075E59` com halos teal e sol), "APÊNDICE · PARA A BANCA" e "Perguntas que *a gente espera.*" (Lexend 800, 76 px), e uma grade 3×2 de cartões brancos (borda 3 px tinta, raio 28, sombra 8 px teal/sol alternada, número em selo amarelo). O cartão ampliado tem título de 68 px e texto de 44 px. Rodapé: "1–6 amplia uma resposta · Esc volta · Protótipo · dados fictícios".

| # | Pergunta | Resposta (resumo) |
|---|---|---|
| 1 | LGPD e consentimento | Dado de saúde é sensível (Lei 13.709/2018); cada acesso ao prontuário é registrado; outra clínica só vê depois que o paciente confirma. |
| 2 | Quem paga | A clínica-escola assina; o paciente não paga pelo app; referência: R$ 91 mil/ano, **estimativa do time**. |
| 3 | Alternativas de hoje | Planilha, caderno, grupo de mensagens, sistema próprio, boca a boca; o Sorriu+ liga a rede e transforma recusa em encaminhamento. |
| 4 | Como medir no piloto | Faltas, ocupação de cadeira por turno, encaminhamentos aceitos, contra a linha de base da própria clínica (sem meta inventada). |
| 5 | Por que a clínica-escola adota | Cadeira ocupada é aula dada, menos material perdido, fila sem ligação um a um; 66% (Revista da ABENO). |
| 6 | Protótipo × próximo passo | Já roda com dados fictícios (busca, pedido, painel, fila com score, encaminhamento com confirmação, registro de acesso); próximo: login real (hoje é demo), integração, piloto. |

### 9.5 Scripts de saída

| Script | Gera | Como |
|---|---|---|
| `exportar-pdf.cjs` | `sorriu-mais-deck.pdf` (15 páginas de 1920×1080 px = 16:9) e PNGs em `saida/pdf/` | Abre `slides.html#sN` numa página nova para cada N, com movimento reduzido (abertura parada no lockup), espera `__deck.pronto` e `__deck.atual === N`, fotografa e monta o PDF no próprio Chromium. `--com-apendice` acrescenta o apêndice como página 16. |
| `render-deck.cjs` | `sorriu-mais-deck.mp4` (1920×1080, 30 fps, H.264) e `sorriu-mais-deck.srt` | Relógio falso do Playwright (`page.clock`): GSAP e timers só andam quando o script manda, então nenhum quadro se perde. Cada trecho de `NOTAS` entre `[clique]` é um passo; o tempo do slide (`PLANO`) é dividido pelas palavras, nunca abaixo da duração da animação do passo (no 1º passo, +0,8 s de troca e 0,55 s de espera). A legenda vai como faixa `mov_text` (por) e em `.srt`; `--legenda-na-tela` queima no vídeo; `--audio` junta uma narração gravada. Sem TTS: não há voz pt-BR offline no projeto. |

## 10. Conteúdo: números, rótulos e regras

| Número | Texto | Fonte (exibir sempre) |
|---|---|---|
| 117,5 dias | espera média para começar um tratamento | BMC Public Health (NCBI), 2025 |
| 20–35% | faltas nas consultas odontológicas da atenção básica | BMC Public Health (NCBI), 2025; Holtzman et al., J. Public Health Dentistry, 2013 |
| 66% | estudantes que pensam em desistir e nunca tiveram prática clínica | Revista da ABENO |

- **Sem número**, porque ainda não há dado: base de cadastrados, redução de desperdício. Não use 18,65% (é consulta médica) nem os benchmarks de outros sistemas.
- **Rótulos obrigatórios:** "Telas do protótipo · dados fictícios" em toda cena com captura, "Pontuação ilustrativa · dados fictícios" no score e "Protótipo · dados fictícios" no fechamento.
- **Decisão do time:** o score e o redirecionamento são apresentados como estão no roteiro. As capturas reais do app mostram a regra do produto ("urgência avaliada passa na frente"; "você confirma antes de ir"). Não edite as capturas para esconder isso.
- **Nunca diga** "vaga garantida" nem sugira diagnóstico.

## 11. Assets (`assets/`, WebP qualidade 92)

| Arquivo | Origem (rota no app) | Captura |
|---|---|---|
| `p-busca` | paciente `/clinicas` | 390×844 @2x |
| `p-clinica` | `/clinicas/c1000000-…-0001` (página inteira) | 390 × alt. @2x |
| `p-recusa` | `/pedidos/b1000000-…-0001` | 390×844 @2x |
| `p-alternativas` | `/pedidos/b1000000-…-0001/alternativas` | 390×844 @2x |
| `p-encaminhamento` | `/encaminhamentos` (página inteira) | @2x |
| `p-prontuario` | `/prontuario` (página inteira) | @2x |
| `p-prioridade` | `/prioridade` (página inteira) | @2x |
| `p-assistente` | `/assistente` | 390×844 @2x |
| `p-urgencia` | `/urgencia` | 390×844 @2x |
| `p-cuidado`, `p-boasvindas` | `/cuidado`, `/` sem sessão | reserva |
| `c-solicitacoes` | clínica `/clinica/agenda` | 1600×1000 @1.5 |
| `c-fila` | clínica `/clinica/fila` | 1600×1000 @1.5 |
| `c-triagem` | clínica `/clinica/admin` → Triagem (Dr. Hugo, Bela Vista) | 1600×1000 @1.5 |
| `c-prontuario` | clínica `/clinica/admin` → Ana Martins → perfil → Abrir prontuário (Dra. Joana, Vila Mariana) | 1600×1000 @1.5 |
| `d-busca`, `d-cuidado` | paciente `/clinicas`, `/cuidado` (telas da demo, abaixo da barra de status) | 390×796 @2x |
| `logo` | `app/paciente/src/design/logo.png` | — |

**Como recapturar:**
1. Suba o app (`app/iniciar.sh`).
2. Obtenha o token com `POST /api/v1/auth/entrar {login, senha}` usando as contas demo `ana.martins@example.com` (paciente) e `gabriela.nunes@example.com` (clínica), com a senha `DEMO_SENHA` do `backend/.env`.
3. Grave em `sessionStorage['uhealth.sessao.paciente' | 'uhealth.sessao.clinica']`. No paciente, grave também `localStorage['uh-boasvindas'] = '1'` e preencha o endereço da Ana (fictício, a ~1,7 km da Bela Vista: lat −23,5461, lng −46,6487) para as distâncias aparecerem.
4. Fotografe com Playwright.

Se uma captura mudar de altura, ajuste as rolagens (`y`) e as coordenadas de toque e realce da §8.

## 12. Guia de port para o app web

1. **Onde:** um workspace novo `app/pitch` (Vite + React + TS), servido em `/pitch/` pelo backend, como `paciente` e `clinica`. Importe `@uhealth/ui` para `Marca` e tokens. Copie `assets/` para `app/pitch/public/assets/`.
2. **Estrutura sugerida:**
   - `Palco` (escala, §4).
   - `Cena` (props `id`, `variante`, `z`).
   - `Lockup`, `Celular` (props `telas`), `Notebook`, `Chip` (`variante`: padrão, escuro, sol), `SeloDemo`, `Contador`.
   - `useTimeline` com `gsap.context` (ou `@gsap/react` `useGSAP`) para criar e limpar timelines.
   - `transicoes.ts` com `sorriso`, `entra`, `sai`, `pop`, `salto` (§7).
   - `trailer/roteiro.ts`: tabela de tempos da §8 como dados.
   - `deck/slides.ts`: passos da §9 como dados.
3. **GSAP:** use `gsap@3.12.5` pelo npm, não pela CDN. Mantenha os mesmos eases e durações. Não troque GSAP por CSS transitions: o `seek` determinístico depende da timeline.
4. **Render do vídeo:** exponha `window.__seek/__duration/__pronto` com `?render` e reaproveite `render.cjs` apontando para a URL do app.
5. **Acessibilidade:** o palco tem `aria-label` com o resumo. Com `prefers-reduced-motion`, o trailer fica parado em 42,6 s (fechamento) e o deck troca de slide com corte seco (adaptação: na referência, o deck sempre anima). Os controles têm foco visível.
6. **Verificação:** rode a referência e o port lado a lado, capture os tempos da §8.3 e os estados finais da §9 em 1920×1080, e compare visualmente (ou com `pixelmatch`, tolerância de 2%).

## 13. Limitações conhecidas
- O cartão "Confirmado pela clínica" (passo 5 do trailer) é montado em HTML porque a conta demo não tem um agendamento confirmado para fotografar.
- O modo apresentador depende de pop-up liberado no navegador. Sem ele, as notas continuam na tecla N.
- O app ao vivo na demo exige login uma vez por aba do deck (as sessões do app ficam no `sessionStorage` do iframe).
- Cliques muito rápidos no deck pulam a transição para o fim. Isso é de propósito, para nunca travar.
- O vídeo do deck sai **sem voz**: não há TTS pt-BR offline (o backend usa o `speechSynthesis` do navegador ou a API da OpenAI, que exige chave e envia o texto para fora). Para ter voz, grave a narração seguindo o `.srt` e passe `--audio`, ou ligue um provedor de TTS com autorização do time.
- O ensaio fica só no navegador onde foi gravado (`localStorage`); outra máquina começa vazia.
