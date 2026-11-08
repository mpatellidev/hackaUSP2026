import logo from "./logo.png";
/** Ícones do painel (grade 24 px, traço 1,65 px, `currentColor`). Decorativos: sempre com texto ao lado. */
const CAMINHOS = {
  caixa: "M4 4h16v16H4z M4 13h5l2 3h2l2-3h5",
  pessoas: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  grade: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  ajustes: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  clinica: "M4 21V7h16v14 M9 7V3h6v4 M9 21v-5h6v5 M8 11h1 M15 11h1 M2 21h20",
  mais: "M12 5v14 M5 12h14",
  buscar: "M21 21l-5-5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14",
  relogio: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  confirmado: "M5 12l4 4L19 6",
  seta: "M5 12h14 M14 7l5 5-5 5",
  avancar: "M9 5l7 7-7 7",
  abaixo: "M6 9l6 6 6-6",
  sol: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1",
  telefone: "M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 2-4 2-6 1A23 23 0 0 1 4 9C3 7 3 3 5 3",
  local: "M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12 M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  escudo: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  calendario: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16",
  arquivo: "M14 2H5v20h14V7z M14 2v5h5 M8 12h8 M8 16h6",
  ajuda: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 17h.01",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  fechar: "M6 6l12 12 M18 6 6 18",
  exportar: "M12 15V3 M7 8l5-5 5 5 M4 14v7h16v-7",
  coracao: "M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13",
  frasco: "M9 3h6 M10 3v7L4 20h16l-6-10V3 M8 14h8",
  atividade: "M2 12h5l3-9 4 18 3-9h5",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome }: { nome: NomeIcone }) {
  return <svg className="d-ico" viewBox="0 0 24 24" aria-hidden="true"><path d={CAMINHOS[nome] ?? CAMINHOS.arquivo} /></svg>;
}

/** Símbolo da marca: dente com páginas (logo.png). */
export function Simbolo() {
  return <img className="d-simbolo" src={logo} alt="" aria-hidden="true" />;
}
