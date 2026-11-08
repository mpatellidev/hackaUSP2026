import type { ReactElement } from "react";
import type { ItemMenu } from "@uhealth/ui";

/** Contrato de montagem: cada módulo exporta `rotas` e `src/rotas.tsx` é o registro único. */
export interface RotaModulo {
  caminho: string;
  elemento: ReactElement;
  /** se existir, aparece na barra de abas */
  aba?: ItemMenu;
  /** se true, a tela ocupa a janela inteira, fora da moldura (sem o menu lateral do app) */
  telaCheia?: boolean;
}
