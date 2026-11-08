import { useEffect, useState } from "react";
import { Icone } from "./Icone";

type Tema = "" | "dark" | "hc";
type Escala = "" | "lg" | "xl";
// Fundo sempre branco: sem tema escuro (o valor "dark" antigo é ignorado pelo CSS).
const TEMAS: Tema[] = ["", "hc"];
const ESCALAS: Escala[] = ["", "lg", "xl"];
const NOME_TEMA = { "": "claro", dark: "claro", hc: "alto contraste" } as const;
const NOME_ESCALA = { "": "normal", lg: "grande", xl: "extra grande" } as const;

// Mesmas chaves de `@uhealth/ui` (Preferencias), para a escolha valer nos dois lugares.
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

/** Lê a tela em voz alta (Web Speech do aparelho). Só aparece se o aparelho tiver voz. */
export function BotaoAudio({ aoOuvir }: { aoOuvir?: () => string }) {
  if (!("speechSynthesis" in window)) return null;
  const ouvir = () => {
    const texto = aoOuvir?.() ?? document.querySelector("main, .d-tela")?.textContent ?? "";
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    window.speechSynthesis.speak(fala);
  };
  return <button type="button" className="d-quad" onClick={ouvir} aria-label="Ouvir a tela em áudio"><Icone nome="audio" tamanho={18} /></button>;
}

/** Botão "Aa": troca o tamanho das letras (normal, grande, extra grande). */
export function BotaoLetras() {
  const [escala, setEscala] = useState<Escala>(() => ler("uh-scale") as Escala);
  useEffect(() => { aplicar("data-scale", escala); }, [escala]);
  return (
    <button type="button" className="d-quad" aria-label={`Tamanho das letras: ${NOME_ESCALA[escala]}. Tocar para mudar`}
      onClick={() => { const v = proximo(ESCALAS, escala); setEscala(v); gravar("uh-scale", v); }}>Aa</button>
  );
}

/** Troca de tema (automático, escuro, alto contraste). */
export function BotaoTema() {
  const [tema, setTema] = useState<Tema>(() => ler("uh-theme") as Tema);
  useEffect(() => { aplicar("data-theme", tema); }, [tema]);
  return (
    <button type="button" className="d-btn d-btn--outline d-btn--card" aria-label={`Tema: ${NOME_TEMA[tema]}. Tocar para mudar`}
      onClick={() => { const v = proximo(TEMAS, tema); setTema(v); gravar("uh-theme", v); }}>
      Aparência: {NOME_TEMA[tema]}
    </button>
  );
}

/** "Ouvir em áudio" como botão de texto (design P2 e C3), com a voz do aparelho. */
export function BotaoOuvir({ variante = "primario", aoOuvir }: { variante?: "primario" | "fantasma"; aoOuvir?: () => string }) {
  if (!("speechSynthesis" in window)) return null;
  const ouvir = () => {
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(aoOuvir?.() ?? document.querySelector("main")?.textContent ?? "");
    fala.lang = "pt-BR";
    window.speechSynthesis.speak(fala);
  };
  return <button type="button" className={`d-btn${variante === "fantasma" ? " d-btn--ghost" : ""}`} onClick={ouvir}>Ouvir em áudio</button>;
}
