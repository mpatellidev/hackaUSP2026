import type { RotaModulo } from "../tipos";
import { Avisos, Cuidado, Encaminhamentos, Prioridade, Prontuario, Receitas } from "./Cuidado";

export const rotas: RotaModulo[] = [
  { caminho: "/cuidado", elemento: <Cuidado />, aba: { caminho: "/cuidado", rotulo: "Cuidado" } },
  { caminho: "/encaminhamentos", elemento: <Encaminhamentos /> },
  { caminho: "/prontuario", elemento: <Prontuario /> },
  { caminho: "/prioridade", elemento: <Prioridade /> },
  { caminho: "/avisos", elemento: <Avisos /> },
  { caminho: "/receitas", elemento: <Receitas /> },
];
