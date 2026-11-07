import { useCallback, useEffect, useState } from "react";
import { Icone } from "./Icone";

type Tema = "" | "dark" | "hc";
type Escala = "" | "lg" | "xl";
const TEMAS: Tema[] = ["", "dark", "hc"];
const ESCALAS: Escala[] = ["", "lg", "xl"];
const NOME_TEMA = { "": "automático", dark: "escuro", hc: "alto contraste" } as const;
const NOME_ESCALA = { "": "normal", lg: "grande", xl: "extra grande" } as const;

// Mesmas chaves de `@uhealth/ui` (Preferencias), para a escolha valer nos dois componentes.
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

/** Áudio, letras e tema do cabeçalho, com ícones SVG do design (sem símbolos de texto). */
export function PreferenciasPaciente() {
  const [tema, setTema] = useState<Tema>(() => ler("uh-theme") as Tema);
  const [escala, setEscala] = useState<Escala>(() => ler("uh-scale") as Escala);
  useEffect(() => { aplicar("data-theme", tema); }, [tema]);
  useEffect(() => { aplicar("data-scale", escala); }, [escala]);

  const ouvir = useCallback(() => {
    const texto = document.querySelector("main")?.textContent ?? "";
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    window.speechSynthesis.speak(fala);
  }, []);

  return (
    <div className="preferencias">
      {"speechSynthesis" in window && (
        <button type="button" className="icone" onClick={ouvir} aria-label="Ouvir a tela em áudio"><Icone nome="audio" /></button>
      )}
      <button type="button" className="icone" aria-label={`Tamanho da letra: ${NOME_ESCALA[escala]}. Tocar para mudar`}
        onClick={() => { const v = proximo(ESCALAS, escala); setEscala(v); gravar("uh-scale", v); }}>Aa</button>
      <button type="button" className="icone" aria-label={`Tema: ${NOME_TEMA[tema]}. Tocar para mudar`}
        onClick={() => { const v = proximo(TEMAS, tema); setTema(v); gravar("uh-theme", v); }}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
