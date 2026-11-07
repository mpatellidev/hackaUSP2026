import { useCallback, useEffect, useState } from "react";

type Tema = "" | "dark" | "hc";
type Escala = "" | "lg" | "xl";
const TEMAS: Tema[] = ["", "dark", "hc"];
const ESCALAS: Escala[] = ["", "lg", "xl"];
const NOME_TEMA = { "": "automático", dark: "escuro", hc: "alto contraste" } as const;
const NOME_ESCALA = { "": "normal", lg: "grande", xl: "extra grande" } as const;

function ler(chave: string): string {
  try { return localStorage.getItem(chave) ?? ""; } catch { return ""; }
}
function gravar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: só não lembra */ }
}
function aplicar(atributo: string, valor: string) {
  if (valor) document.documentElement.setAttribute(atributo, valor);
  else document.documentElement.removeAttribute(atributo);
}
const proximo = <T,>(lista: T[], atual: T) => lista[(lista.indexOf(atual) + 1) % lista.length];

/** Tema, tamanho da letra e leitura em voz alta (Web Speech do aparelho). Guardados no navegador. */
export function Preferencias({ leitura }: { leitura?: () => string }) {
  const [tema, setTema] = useState<Tema>(() => ler("uh-theme") as Tema);
  const [escala, setEscala] = useState<Escala>(() => ler("uh-scale") as Escala);
  useEffect(() => { aplicar("data-theme", tema); }, [tema]);
  useEffect(() => { aplicar("data-scale", escala); }, [escala]);

  const ouvir = useCallback(() => {
    const texto = leitura?.() ?? document.querySelector("main")?.textContent ?? "";
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    window.speechSynthesis.speak(fala);
  }, [leitura]);

  return (
    <div className="preferencias">
      {"speechSynthesis" in window && (
        <button type="button" className="icone" onClick={ouvir} aria-label="Ouvir a tela em áudio">♪</button>
      )}
      <button type="button" className="icone" aria-label={`Tamanho da letra: ${NOME_ESCALA[escala]}. Tocar para mudar`}
        onClick={() => { const v = proximo(ESCALAS, escala); setEscala(v); gravar("uh-scale", v); }}>Aa</button>
      <button type="button" className="icone" aria-label={`Tema: ${NOME_TEMA[tema]}. Tocar para mudar`}
        onClick={() => { const v = proximo(TEMAS, tema); setTema(v); gravar("uh-theme", v); }}>◐</button>
    </div>
  );
}
