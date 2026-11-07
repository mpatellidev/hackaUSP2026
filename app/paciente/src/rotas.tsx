// REGISTRO ÚNICO dos módulos do app do paciente: uma linha por módulo, em ordem alfabética.
// A ordem das abas é a ordem de `ABAS` abaixo (no máximo 5 itens no celular).
import type { RotaModulo } from "./modulos/tipos";
import { rotas as agendamentos } from "./modulos/agendamentos/rotas";
import { rotas as alternativas } from "./modulos/alternativas/rotas";
import { rotas as assistente } from "./modulos/assistente/rotas";
import { rotas as clinicas } from "./modulos/clinicas/rotas";
import { rotas as inicio } from "./modulos/inicio/rotas";
import { rotas as pedidos } from "./modulos/pedidos/rotas";
import { rotas as urgencia } from "./modulos/urgencia/rotas";
import { rotas as vagas } from "./modulos/vagas/rotas";

export const ROTAS: RotaModulo[] = [
  ...agendamentos, ...alternativas, ...assistente, ...clinicas, ...inicio, ...pedidos, ...urgencia, ...vagas,
];

const ORDEM_ABAS = ["/", "/clinicas", "/pedidos", "/agenda", "/assistente"];
export const ABAS = ORDEM_ABAS.map((c) => ROTAS.find((r) => r.aba?.caminho === c)?.aba).filter((a) => a !== undefined);
