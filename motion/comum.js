/* Sorriu+ — utilidades comuns ao motion e aos slides. Depende do GSAP global. */
window.Sorriu = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /** Escala o palco 1920×1080 para caber na janela (k = 1 no render). */
  function ajustarPalco(palco, fixo) {
    const f = () => {
      const k = fixo ? 1 : Math.min(innerWidth / 1920, innerHeight / 1080);
      palco.style.transform = `scale(${k})`;
      palco.style.margin = `${(1080 * k - 1080) / 2}px ${(1920 * k - 1920) / 2}px`;
    };
    addEventListener("resize", f); f();
  }

  /** Quebra o texto em palavras com máscara; devolve os spans internos para animar. */
  function quebrar(el) {
    if (el.dataset.quebrado) return el.querySelectorAll(".w > span");
    const walk = (n) => {
      [...n.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.textContent = p; w.appendChild(i); frag.appendChild(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && !c.classList.contains("w")) walk(c);
      });
    };
    walk(el); el.dataset.quebrado = "1";
    return el.querySelectorAll(".w > span");
  }

  /** Transição da marca: um sorriso amarelo desce do topo e revela a próxima cena. */
  const SORRISO_DE = "ellipse(0% 0% at 50% -10%)";
  const SORRISO_ATE = "ellipse(160% 130% at 50% -10%)";
  function sorriso(tl, faixa, atual, proxima, t, d = .9) {
    const z = (+getComputedStyle(proxima).zIndex || 1);
    tl.set(proxima, { display: "block", clipPath: SORRISO_DE }, t)
      .set(faixa, { display: "block", zIndex: z - 1, clipPath: SORRISO_DE }, t)
      .to(faixa, { clipPath: SORRISO_ATE, duration: d, ease: "power3.inOut" }, t)
      .to(proxima, { clipPath: SORRISO_ATE, duration: d, ease: "power3.inOut" }, t + .14)
      .set(faixa, { display: "none" }, t + d + .14);
    if (atual) tl.set(atual, { display: "none" }, t + d + .14);
    return t + d + .14;
  }

  return { $, $$, ajustarPalco, quebrar, sorriso };
})();
