import { useEffect } from "react";

const SCRIPT_SRC = "https://vlibras.gov.br/app/vlibras-plugin.js";

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

let loaded = false;

/** Cria a marcação exigida pelo plugin direto no <body>, fora do React
 *  (o plugin reescreve esses elementos; se o React tentasse removê-los, quebraria). */
function mountWidget() {
  if (loaded) return;
  loaded = true;

  const root = document.createElement("div");
  root.setAttribute("vw", "");
  root.className = "enabled";
  root.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.appendChild(root);

  const init = () => {
    if (!window.VLibras) return;
    new window.VLibras.Widget("https://vlibras.gov.br/app");
    // O plugin se inicia no evento "load" da página, que já aconteceu: dispara à mão.
    if (document.readyState === "complete") window.onload?.(new Event("load"));
  };
  if (window.VLibras) return init();
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.onload = init;
  document.body.appendChild(s);
}

/** Widget oficial do governo (VLibras) que traduz o texto da página para Libras.
 *  Só é baixado na primeira vez que for ativado; desligar esconde o widget inteiro
 *  (via `html[data-libras="off"]`, definido em usePrefs). */
export function VLibras({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled) mountWidget();
  }, [enabled]);

  return null;
}
