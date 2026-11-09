// Renderiza o deck inteiro (todos os passos de cada slide, em ordem) em MP4 1920×1080, 30 fps,
// com o tempo de cada fala tirado das NOTAS (dividido pela meta PLANO de cada slide) e legenda .srt.
// Uso: node motion/render-deck.cjs [saida.mp4] [--audio narracao.m4a] [--legenda-na-tela] [--ate N]
//   saída padrão: motion/sorriu-mais-deck.mp4 + motion/sorriu-mais-deck.srt (a legenda também vai como faixa no MP4)
//   --audio           junta uma narração gravada (o .srt serve de guia de tempo para gravar)
//   --legenda-na-tela queima a legenda no vídeo (Atkinson, faixa escura na base)
//   --ate N           para no slide N (teste rápido)
// Precisa de "playwright" ou "playwright-core" (NODE_PATH=... se estiver fora do projeto) e ffmpeg no PATH;
// CHROME=/caminho/do/chrome para usar um Chromium já baixado. Não há voz sintetizada: nenhum TTS pt-BR offline
// está disponível, e o texto não é enviado a serviço externo nenhum.
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { chromium } = (() => { try { return require("playwright"); } catch { return require("playwright-core"); } })();

const FPS = 30;
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const posicionais = args.filter((a, i) => !a.startsWith("--") && !["--audio", "--ate"].includes(args[i - 1]));
const saida = path.resolve(posicionais[0] || path.join(__dirname, "sorriu-mais-deck.mp4"));
const srtArq = saida.replace(/\.mp4$/i, "") + ".srt";
const audio = opt("--audio") ? path.resolve(opt("--audio")) : null;
const ate = opt("--ate") !== null ? +opt("--ate") : Infinity;
const naTela = args.includes("--legenda-na-tela");
const TMP = path.join(__dirname, "saida", "video");
const DECK = "file://" + path.join(__dirname, "slides.html");

const palavras = (s) => s.split(/\s+/).filter(Boolean).length;
const hms = (t) => { const ms = Math.round(t * 1000); const p = (n, l = 2) => String(n).padStart(l, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };

/** Quebra um trecho de fala em legendas de até ~14 palavras, em frases e depois em vírgulas/dois-pontos. */
function blocos(texto) {
  const out = [];
  texto.split(/(?<=[.!?…])\s+/).forEach((frase) => {
    if (palavras(frase) <= 14) { out.push(frase); return; }
    let atual = "";
    frase.split(/(?<=[,:;])\s+/).forEach((parte) => {
      if (atual && palavras(atual + " " + parte) > 14) { out.push(atual); atual = parte; } else atual = atual ? atual + " " + parte : parte;
    });
    if (atual) out.push(atual);
  });
  return out.filter(Boolean);
}
/** Duas linhas de até ~42 caracteres. */
function linhas(t) {
  if (t.length <= 42) return t;
  const meio = t.length / 2; let melhor = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (melhor < 0 || Math.abs(i - meio) < Math.abs(melhor - meio))) melhor = i;
  return melhor < 0 ? t : t.slice(0, melhor) + "\n" + t.slice(melhor + 1);
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.clock.install(); // relógio falso: GSAP, rAF e timers andam só quando o script manda (sem perder quadro)
  await p.goto(DECK);
  await p.evaluate(() => window.__deck.pronto);
  // todas as fontes carregadas antes de começar: com o relógio parado, uma fonte pedida no meio travaria a captura
  await p.evaluate(() => Promise.all([...document.fonts].map((f) => f.load())));
  const cdp = await ctx.newCDPSession(p); // captura direta (Page.captureScreenshot): não espera fontes nem animações
  const info = await p.evaluate(() => ({ notas: __deck.NOTAS, plano: __deck.PLANO, passos: __deck.NOTAS.map((_, i) => __deck.passos(i)) }));

  // roteiro: cada trecho entre [clique] é um passo; o tempo do slide (PLANO) é dividido pelas palavras,
  // sem nunca ficar mais curto que a animação do passo
  const trechos = []; let t = 0;
  const ultimo = Math.min(ate, info.notas.length - 1);
  for (let i = 0; i <= ultimo; i++) {
    const segs = info.notas[i].replace(/\s*\[demo\]/g, "").split("[clique]").map((s) => s.trim());
    const n = Math.max(1, info.passos[i].length);
    if (segs.length !== n) throw new Error(`slide ${i}: ${segs.length} trechos de fala para ${n} passos`);
    const total = segs.reduce((a, s) => a + palavras(s), 0);
    segs.forEach((s, k) => {
      const anim = i === 0 ? 0 : k === 0 ? .8 + .55 + info.passos[i][0] + .4 : info.passos[i][k] + .4;
      const d = Math.max(info.plano[i] * palavras(s) / total, anim, 1.5);
      trechos.push({ i, k, texto: s, t0: t, t1: t + d }); t += d;
    });
  }
  const DUR = t + 1.5;

  // legenda .srt
  const cues = [];
  trechos.forEach((tr) => {
    const bs = blocos(tr.texto), tot = bs.reduce((a, s) => a + palavras(s), 0); let c = tr.t0;
    bs.forEach((s) => { const d = (tr.t1 - tr.t0) * palavras(s) / tot; cues.push({ a: c, b: c + d - .08, texto: s }); c += d; });
  });
  fs.writeFileSync(srtArq, cues.map((c, j) => `${j + 1}\n${hms(c.a)} --> ${hms(c.b)}\n${linhas(c.texto)}\n`).join("\n"), "utf8");

  if (naTela) await p.evaluate(() => {
    const d = document.createElement("div"); d.id = "legenda-render";
    Object.assign(d.style, { position: "absolute", left: "50%", bottom: "28px", transform: "translateX(-50%)", maxWidth: "1500px", padding: "14px 28px", borderRadius: "18px",
      background: "rgba(3,28,27,.86)", color: "#fff", font: "400 38px/1.3 'Atkinson Hyperlegible', system-ui, sans-serif", textAlign: "center", zIndex: 9000, display: "none", whiteSpace: "pre-line" });
    document.querySelector("#palco").appendChild(d);
  });

  const video = path.join(TMP, "deck-sem-faixas.mp4");
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", video], { stdio: ["pipe", "inherit", "inherit"] });
  const totalQ = Math.round(DUR * FPS);
  let prox = 1, msFeito = 0, cueAtual = -1;
  for (let f = 0; f < totalQ; f++) {
    const tq = f / FPS, ms = Math.round(tq * 1000);
    if (ms > msFeito) { await p.clock.runFor(ms - msFeito); msFeito = ms; }
    while (prox < trechos.length && trechos[prox].t0 <= tq) { await p.evaluate(() => window.__deck.avancar()); prox++; }
    if (naTela) {
      const j = cues.findIndex((c) => tq >= c.a && tq < c.b);
      if (j !== cueAtual) { cueAtual = j; await p.evaluate((txt) => { const d = document.getElementById("legenda-render"); d.textContent = txt; d.style.display = txt ? "block" : "none"; }, j >= 0 ? linhas(cues[j].texto) : ""); }
    }
    const jpg = Buffer.from((await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 })).data, "base64");
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 300 === 0) console.log(`quadro ${f}/${totalQ} · slide ${trechos[Math.max(0, prox - 1)].i}`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  await b.close();

  // faixas: legenda (mov_text, pt-BR) e, se houver, a narração gravada
  const ent = ["-i", video, ...(audio ? ["-i", audio] : []), "-i", srtArq];
  const sub = audio ? 2 : 1;
  const mapa = ["-map", "0:v", ...(audio ? ["-map", "1:a", "-c:a", "aac", "-b:a", "160k", "-af", "apad", "-t", DUR.toFixed(3)] : []), "-map", `${sub}:s`];
  await new Promise((ok, falha) => spawn("ffmpeg", ["-loglevel", "error", "-y", ...ent, ...mapa, "-c:v", "copy", "-c:s", "mov_text",
    "-metadata:s:s:0", "language=por", "-metadata:s:s:0", "title=Português (falas do roteiro)", "-movflags", "+faststart", saida], { stdio: "inherit" })
    .on("close", (c) => (c ? falha(new Error("ffmpeg (faixas) saiu com " + c)) : ok())));
  fs.rmSync(video, { force: true });
  if (erros.length) { console.error("Erros na página:\n" + erros.join("\n")); process.exit(1); }
  console.log(`pronto: ${saida} (${DUR.toFixed(1)} s, ${totalQ} quadros) · legenda: ${srtArq}${audio ? " · com narração" : " · sem voz"}`);
})().catch((e) => { console.error(e); process.exit(1); });
