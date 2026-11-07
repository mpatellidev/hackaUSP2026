import type { ComponentType } from "react";
import { rotas as solicitacoes } from "./modulos/solicitacoes/rotas";
import { rotas as urgencia } from "./modulos/urgencia/rotas";
import { rotas as vagasPrioridade } from "./modulos/vagas-prioridade/rotas";

export interface RotaModulo {
  caminho: string;
  rotulo: string;
  componente: ComponentType;
  oculta?: boolean; // não aparece no menu (ex.: detalhe)
}

/** PONTO DE MONTAGEM DO MENU. Cada módulo (#8 vagas/fila, #12, #14, #15, #16, #18) exporta `rotas`
 *  e adiciona UMA linha aqui. Não edite o App.tsx. */
export const ROTAS: RotaModulo[] = [
  ...solicitacoes,
  ...vagasPrioridade, // #8
  ...urgencia, // #14
];
