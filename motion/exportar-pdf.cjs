// Exporta o deck como PDF de reserva: um slide montado por página (16:9) + PNGs 1920×1080.
// Uso: node motion/exportar-pdf.cjs [saida.pdf] [--com-apendice]
//   saída padrão: motion/sorriu-mais-deck.pdf · PNGs em motion/saida/pdf/ (ignorada pelo git)
//   precisa de "playwright" ou "playwright-core" (NODE_PATH=... se estiver fora do projeto)
//   CHROME=/caminho/do/chrome para usar um Chromium já baixado (como no render.cjs)
const path = require("path");
const fs = require("fs");
const { chromium } = (() => { try { return require("playwright"); } catch { return require("playwright-core"); } })();

const args = process.argv.slice(2);
const saida = path.resolve(args.find((a) => !a.startsWith("--")) || path.join(__dirname, "sorriu-mais-deck.pdf"));
const comApendice = args.includes("--com-apendice");
const PASTA = path.join(__dirname, "saida", "pdf");
const DECK = "file://" + path.join(__dirname, "slides.html");

(async () => {
  fs.mkdirSync(PASTA, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  // movimento reduzido: a abertura fica parada no lockup e cada slide aparece já montado
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
  const erros = [];
  const pngs = [];
  const foto = async (hash, nome, preparar) => {
    const p = await ctx.newPage(); // página nova por slide: trocar só o #hash não recarrega o deck
    p.on("pageerror", (e) => erros.push(`${nome}: ${e.message}`));
    await p.goto(`${DECK}#${hash}`);
    await p.evaluate(() => window.__deck.pronto);
    await p.evaluate(() => document.fonts.ready);
    if (preparar) await preparar(p);
    await p.waitForTimeout(700); // barra de progresso do rodapé (0,5 s)
    const arq = path.join(PASTA, `${nome}.png`);
    await p.screenshot({ path: arq });
    pngs.push(arq);
    await p.close();
  };
  const total = await (async () => { const p = await ctx.newPage(); await p.goto(DECK); await p.evaluate(() => window.__deck.pronto); const n = await p.evaluate(() => document.querySelectorAll("#palco > .cena").length); await p.close(); return n; })();
  for (let i = 0; i < total; i++) {
    await foto(`s${i}`, `slide-${String(i).padStart(2, "0")}`, async (p) => {
      await p.waitForFunction((n) => window.__deck.atual === n, i);
    });
    console.log(`slide ${i}/${total - 1}`);
  }
  if (comApendice) {
    await foto("s14", "slide-15-apendice", async (p) => { await p.evaluate(() => window.__deck.abrirApendice()); });
    console.log("apêndice");
  }

  // monta o PDF no próprio Chromium: uma imagem por página de 1920×1080 px
  const html = `<!doctype html><meta charset="utf-8"><style>@page{size:1920px 1080px;margin:0}html,body{margin:0}img{display:block;width:1920px;height:1080px;break-after:page}</style>`
    + pngs.map((a) => `<img src="data:image/png;base64,${fs.readFileSync(a).toString("base64")}">`).join("");
  const p = await ctx.newPage();
  await p.setContent(html, { waitUntil: "load" });
  await p.pdf({ path: saida, width: "1920px", height: "1080px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await b.close();
  if (erros.length) { console.error("Erros na página:\n" + erros.join("\n")); process.exit(1); }
  console.log(`pronto: ${saida} (${pngs.length} páginas) · PNGs em ${PASTA}`);
})().catch((e) => { console.error(e); process.exit(1); });
