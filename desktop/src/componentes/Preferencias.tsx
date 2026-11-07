import { useEffect, useState } from "react";

const TEMAS = ["", "dark", "hc"]; const ESCALAS = ["", "lg", "xl"];
const ler = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const proximo = (l: string[], a: string) => l[(l.indexOf(a) + 1) % l.length];

/** Tema (sistema/escuro/alto contraste) e tamanho de letra, guardados no aparelho. */
export function Preferencias() {
  const [tema, setTema] = useState(ler("uh-theme"));
  const [escala, setEscala] = useState(ler("uh-scale"));
  useEffect(() => {
    const r = document.documentElement;
    tema ? r.setAttribute("data-theme", tema) : r.removeAttribute("data-theme");
    escala ? r.setAttribute("data-scale", escala) : r.removeAttribute("data-scale");
  }, [tema, escala]);
  return (
    <div className="prefs">
      <button type="button" className="btn btn--outline" aria-label="Aumentar o tamanho das letras"
        onClick={() => { const v = proximo(ESCALAS, escala); setEscala(v); gravar("uh-scale", v); }}>Aa</button>
      <button type="button" className="btn btn--outline" aria-label="Trocar tema: claro, escuro ou alto contraste"
        onClick={() => { const v = proximo(TEMAS, tema); setTema(v); gravar("uh-theme", v); }}>&#9680;</button>
    </div>
  );
}
