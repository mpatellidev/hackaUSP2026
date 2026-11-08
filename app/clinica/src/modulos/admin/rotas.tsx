import { PainelClinica } from "../../design/PainelClinica";
import type { RotaModulo } from "../tipos";

/** Painel administrativo da clínica (protótipo com dados fictícios). Tem menu próprio, por isso ocupa a tela inteira. */
export const rotas: RotaModulo[] = [
  { caminho: "/admin", elemento: <PainelClinica />, telaCheia: true, aba: { caminho: "/admin", rotulo: "Painel admin (demo)", icone: "▦" } },
];
