# motion — trailer e slides do Sorriu+

Material de apresentação do HackaUSP 2026 (Foolstack). Tudo em HTML + GSAP, com o mesmo sistema visual (`comum.css`, `comum.js`) e telas reais do protótipo (`assets/`, dados fictícios). **Funciona sem internet:** GSAP, gerador de QR e fontes ficam em `vendor/`.

| Arquivo | Para quê |
|---|---|
| `index.html` | Trailer de 45 s, sem som, em loop (stand). Abre no navegador e toca sozinho. |
| `sorriu-mais-motion.mp4` | O mesmo trailer em vídeo 1920×1080, 30 fps. |
| `slides.html` | Deck do pitch de 5 min, 12 slides (0–11). O slide 0 é a abertura em loop; o 8 é o painel da clínica, onde entra a demo de 20 s. |
| `apresentar.sh` | Abre o deck (ou `--trailer`) num servidor local, já com app ao vivo e QR quando disponíveis. |
| `sorriu-mais-deck.pdf` | PDF de reserva do deck: um slide montado por página, 16:9 (`exportar-pdf.cjs`). |
| `sorriu-mais-deck.mp4` + `.srt` | O deck inteiro em vídeo, com todos os passos e a legenda das falas; sem voz (`render-deck.cjs`). |
| `roteiro.md` | Falas do pitch, slide a slide, com tempos e fontes dos números. |
| `storyboard.png` | Quadros-chave do trailer. |
| `SPEC.md` | Especificação completa (tokens, medidas, tempos, textos, assets) para portar tudo 1:1 para o app web. |

## Abrir
- **Mais fácil:** dê dois cliques em `slides.html` (ou `index.html`). Funciona sem internet e sem servidor.
- **Com tudo ligado:** `motion/apresentar.sh` sobe um servidor local, detecta o app ao vivo e abre o navegador. `--trailer` abre o trailer.

## Slides: como apresentar
- **→, espaço, PageDown ou clique**: avança uma animação ou o slide (funciona com passador).
- **← ou PageUp**: volta um slide (já montado).
- **D** (ou clique no celular dos slides 4–7, ou no notebook do 8): abre o **app na tela**. O celular sai do slide, cresce com um halo amarelo e vira o app; no slide 8 (painel) é a **demo animada de ~20 s** do pitch: o notebook voa do slide e a jornada da Cida toca sozinha, offline, com legenda (**R** repete). **Esc** ou **D** volta ao slide no mesmo ponto. Em slides sem celular, D abre a busca de clínicas.
- **P**: abre o **modo apresentador** numa segunda janela (falas, próximo slide, cronômetro de 5 min com meta por slide, botões que comandam o deck). Leve essa janela para o notebook e o deck para o projetor.
- **Ensaio** (botão no apresentador): grava o tempo real de cada slide e mostra `real / meta` na lista. Ao desligar (ou em "Encerrar e ver resumo" no último slide) aparece o resumo: slides que passaram da meta, palavras de cada fala e quantas cortar no seu ritmo. Fica salvo neste navegador; "Apagar ensaio" limpa.
- **A**: abre o **apêndice para a banca** (fora da contagem de slides): seis perguntas prováveis com resposta curta (LGPD, quem paga, alternativas, como medir o piloto, por que a clínica adota, protótipo × próximo passo). **1–6** amplia uma resposta, **Esc** volta e fecha. Também abre pelo botão no apresentador.
- **F**: tela cheia · **N**: falas sobre o slide · **Home/End**: primeiro/último slide.
- Endereço com `#s5` abre direto no slide 5. Com movimento reduzido no sistema, as trocas são secas e os slides já aparecem montados.

### App ao vivo na demo
A demo usa o app de verdade quando os servidores de desenvolvimento estão no ar; se não estiverem, usa um protótipo clicável com as capturas (`assets/`), sem travar. O botão "Tentar ao vivo" / "Usar telas offline" troca na hora.
1. Rode `app/iniciar.sh --dev` (paciente em 5173, clínica em 5174). O servidor de produção (8000) **não** serve: ele proíbe ser exibido em iframe, e isso é de propósito.
2. Abra o deck, aperte D e **entre uma vez** no celular (paciente) e no notebook (clínica). A demo do slide 8 é sempre offline. A sessão vale enquanto a aba do deck estiver aberta.
3. Portas diferentes: `slides.html?paciente=http://localhost:5175&clinica=http://localhost:5174/clinica`.

### QR para a banca
O fechamento mostra um QR (gerado localmente, sem serviço externo) para o protótipo publicado em **https://sorriu-web.vercel.app**. `?qr=<url>` troca o endereço e `?qr=0` esconde. Para cartaz ou impressão: `assets/qr-sorriu-web.svg` e `assets/qr-sorriu-web.png`.

## Renderizar o MP4 de novo
Precisa de Node, `ffmpeg` e o pacote `playwright` (com um Chromium):
```bash
npm i -g playwright && npx playwright install chromium
node motion/render.cjs
```
`CHROME=/caminho/do/chrome` usa um Chromium já instalado. O script toca a timeline quadro a quadro (`?render`), então não perde quadros.

## PDF de reserva
Se o navegador ou o projetor falharem, o PDF tem os 12 slides já montados:
```bash
CHROME=~/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome node motion/exportar-pdf.cjs
```
Gera `motion/sorriu-mais-deck.pdf` e os PNGs 1920×1080 em `motion/saida/pdf/` (pasta ignorada pelo git). `--com-apendice` acrescenta o apêndice da banca como última página. Precisa do pacote `playwright` (ou `playwright-core`); se ele estiver instalado fora do projeto, aponte com `NODE_PATH=/caminho/node_modules`.

## Vídeo do deck (com legenda)
```bash
CHROME=~/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome node motion/render-deck.cjs
```
Passa por todos os slides e passos em ordem e grava `motion/sorriu-mais-deck.mp4` (1920×1080, 30 fps, ~5 min) e `motion/sorriu-mais-deck.srt`. O tempo de cada passo vem das falas (`NOTAS`) dentro da meta de cada slide (`PLANO`), então o vídeo segue o roteiro. A legenda vai como faixa no MP4 e no `.srt`; `--legenda-na-tela` queima a legenda na imagem. Leva cerca de 15 a 20 minutos (rode em segundo plano).

**Voz:** o vídeo sai sem narração, porque não há voz pt-BR offline no projeto (o backend usa a voz do navegador ou a API da OpenAI, que precisa de chave e manda o texto para fora). Para ter voz, grave a narração seguindo o `.srt` e junte com `--audio narracao.m4a`, ou combine com o time um provedor de TTS.

## Regras
- Números só com fonte (117,5 dias e 20–35%: BMC Public Health, 2025; Holtzman et al., 2013; 66%: Revista da ABENO). Sem fonte, a frase vai sem número.
- "Protótipo · dados fictícios" aparece nas telas do app e no fechamento.
- Para trocar uma tela, capture o app em 390×844 (paciente, escala 2) ou 1600×1000 (clínica, escala 1,5) e substitua o `.webp` em `assets/`. As telas `d-busca` e `d-cuidado` (390×796) são as da demo, abaixo da barra de status; `c-triagem` e `c-prontuario` são do notebook da demo.
