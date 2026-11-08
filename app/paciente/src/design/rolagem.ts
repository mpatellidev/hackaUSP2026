import { useEffect, useRef } from "react";

/** Volta ao topo (janela no celular, moldura `#rolagem` no desktop) e leva o foco ao título da tela.
 *  Usado em mudança de rota e de passo: sem isso a tela nova abre no meio, onde a anterior estava. */
export function irAoTopo(focar = true) {
  for (const el of [document.scrollingElement, document.getElementById("rolagem")]) if (el) el.scrollTop = 0;
  if (!focar) return;
  const titulo = document.querySelector<HTMLElement>("main h1, .d-tela h1");
  if (titulo) {
    if (!titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  }
}

/** Chama `irAoTopo` sempre que `chave` mudar (não na primeira montagem). */
export function useTopoAoMudar(chave: unknown) {
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    irAoTopo();
  }, [chave]);
}
