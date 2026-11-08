import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import type { ItemMenu } from "@uhealth/ui";
import { Icone, type NomeIcone } from "./Icone";

const ICONES: Record<string, NomeIcone> = { "/clinicas": "buscar", "/pedidos": "pedido", "/cuidado": "analise", "/perfil": "pessoa" };

/** Abas do rodapé do design: Clínicas · Meus pedidos · Meu cuidado · Perfil (ícone de 24 px com texto). */
export function AbasPaciente({ itens }: { itens: ItemMenu[] }) {
  const ref = useRef<HTMLElement>(null);
  const [oculta, setOculta] = useState(false);
  const [altura, setAltura] = useState(0);

  // Altura da barra vai para a CSS (usada para reservar o espaço quando ela some).
  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const medir = () => setAltura(nav.offsetHeight);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nav);
    return () => observador.disconnect();
  }, []);

  // Rolar para baixo esconde a barra; rolar para cima ou voltar ao topo a mostra.
  // Ouve a rolagem da janela (celular) e da moldura (desktop), por captura.
  useEffect(() => {
    let ultimo = 0;
    const aoRolar = (e: Event) => {
      const alvo = e.target;
      const pos = alvo instanceof Element ? alvo.scrollTop : window.scrollY;
      const delta = pos - ultimo;
      ultimo = pos;
      if (pos <= 80) setOculta(false);
      else if (delta > 6) setOculta(true);
      else if (delta < -6) setOculta(false);
    };
    document.addEventListener("scroll", aoRolar, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", aoRolar, { capture: true });
  }, []);

  return (
    <nav
      ref={ref}
      className={oculta ? "d-abas d-abas--oculta" : "d-abas"}
      style={{ "--abas-h": `${altura}px` } as CSSProperties}
      aria-label="Principal"
    >
      {itens.map((i) => (
        <NavLink key={i.caminho} to={i.caminho} end={i.caminho === "/pedidos" ? false : undefined}>
          <Icone nome={ICONES[i.caminho] ?? "ajuda"} />
          <span>{i.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  );
}
