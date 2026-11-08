// Renderiza o motion quadro a quadro (30 fps, 1920×1080) e monta o MP4 com ffmpeg.
// Uso: node motion/render.cjs [saida.mp4]   (precisa de "playwright" instalado e ffmpeg no PATH;
// CHROME=/caminho/do/chrome para usar um Chromium já baixado)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const FPS = 30;
const saida = process.argv[2] || path.join(__dirname, "sorriu-mais-motion.mp4");
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto("file://" + path.join(__dirname, "index.html") + "?render");
  await p.waitForFunction(() => window.__pronto); await p.evaluate(() => window.__pronto);
  const dur = await p.evaluate(() => window.__duration);
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", saida], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    await p.evaluate((t) => window.__seek(t), i / FPS);
    ff.stdin.write(await p.screenshot({ type: "jpeg", quality: 95 }));
    if (i % 150 === 0) console.log(`quadro ${i}/${total}`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await b.close();
  console.log("pronto:", saida);
})().catch((e) => { console.error(e); process.exit(1); });
