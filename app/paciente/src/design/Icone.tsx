import logo from "./logo.png";
import type { SVGProps } from "react";

/** Ícones do design (grade 24 px, traço 2,2 px, `currentColor`). Sempre use com texto ao lado ou com `rotulo`. */
const CORPOS = {
  buscar: `<circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="2.2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  local: `<path d="M12 21s7-6 7-11.5a7 7 0 0 0-14 0C5 15 12 21 12 21z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.5" stroke="currentColor" stroke-width="2.2"/>`,
  telefone: `<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 13l4 1.5v3a2.5 2.5 0 0 1-2.5 2.5A13.5 13.5 0 0 1 4 6.5 2.5 2.5 0 0 1 6.5 4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  audio: `<path d="M4 9v6h4l5 4V5L8 9z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  horario: `<rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="2.2"/><path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  analise: `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  confirmado: `<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  naoRecebe: `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2"/><path d="M8 12h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  alerta: `<path d="M12 4l9 15.5H3z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  conversa: `<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16A2.5 2.5 0 0 1 5 13.5z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  pedido: `<path d="M7 4h7l4 4v12H7z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 13h5M10 16.5h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  clinica: `<path d="M4 21V10l8-6 8 6v11" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 21v-6h4v6M12 8v3M10.5 9.5h3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  pessoa: `<circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="2.2"/><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  aviso: `<path d="M6 17V9a6 6 0 0 1 12 0v8l2 2H4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 21h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  filtro: `<path d="M3 5h18l-7 8v6l-4-2v-4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  voltar: `<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  vaga: `<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  microfone: `<rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" stroke-width="2.2"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  ajuda: `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.8v.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
} as const;

export type NomeIcone = keyof typeof CORPOS;

interface Props extends Omit<SVGProps<SVGSVGElement>, "children"> {
  nome: NomeIcone;
  /** tamanho em px: 20 (inline), 24 (padrão), 32 (abas), 48 (destaque) */
  tamanho?: number;
  /** obrigatório quando o ícone aparece sozinho; sem ele o ícone fica oculto para leitores de tela */
  rotulo?: string;
}

export function Icone({ nome, tamanho = 24, rotulo, ...resto }: Props) {
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true} focusable="false"
      dangerouslySetInnerHTML={{ __html: CORPOS[nome] }}
      {...resto}
    />
  );
}

/** Símbolo da marca: dente com páginas (logo.png). `escuro` fica por compatibilidade: a imagem é a mesma em qualquer fundo. */
export function Simbolo({ tamanho = 32 }: { tamanho?: number; escuro?: boolean }) {
  return <img className="d-simbolo" src={logo} width={tamanho} height={tamanho} alt="" aria-hidden="true" />;
}
