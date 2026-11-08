# motion — trailer e slides do Sorriu+

Material de apresentação do HackaUSP 2026 (Foolstack). Tudo em HTML + GSAP, com o mesmo sistema visual (`comum.css`, `comum.js`) e telas reais do protótipo (`assets/`, dados fictícios).

| Arquivo | Para quê |
|---|---|
| `index.html` | Trailer de 45 s, sem som, em loop (stand). Abre no navegador e toca sozinho. |
| `sorriu-mais-motion.mp4` | O mesmo trailer em vídeo 1920×1080, 30 fps. |
| `slides.html` | Deck do pitch de 5 min. O slide 0 é a abertura em loop. |
| `roteiro.md` | Falas do pitch, slide a slide, com tempos e fontes dos números. |
| `storyboard.png` | Quadros-chave do trailer. |
| `SPEC.md` | Especificação completa (tokens, medidas, tempos, textos, assets) para portar tudo 1:1 para o app web. |

## Slides: como apresentar
- **→, espaço, PageDown ou clique**: avança uma animação ou o slide (funciona com passador).
- **← ou PageUp**: volta um slide (já montado).
- **F**: tela cheia · **N**: mostra as falas do roteiro · **Home/End**: primeiro/último slide.
- Endereço com `#s5` abre direto no slide 5.

## Renderizar o MP4 de novo
Precisa de Node, `ffmpeg` e o pacote `playwright` (com um Chromium):
```bash
npm i -g playwright && npx playwright install chromium
node motion/render.cjs
```
`CHROME=/caminho/do/chrome` usa um Chromium já instalado. O script toca a timeline quadro a quadro (`?render`), então não perde quadros.

## Regras
- Números só com fonte (117,5 dias e 20–35%: BMC Public Health, 2025; Holtzman et al., 2013; 66%: Revista da ABENO). Sem fonte, a frase vai sem número.
- "Protótipo · dados fictícios" aparece nas telas do app e no fechamento.
- Para trocar uma tela, capture o app em 390×844 (paciente, escala 2) ou 1600×1000 (clínica, escala 1,5) e substitua o `.webp` em `assets/`.
