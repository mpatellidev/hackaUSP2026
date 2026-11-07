import type { ComponentType } from 'react';

/** Rotas do app (#5). Telas de módulos entram com o `nome` que exportarem em rotas.ts. */
export type RotasRaiz = {
  BoasVindas: undefined;
  Identificacao: undefined;
  Abas: undefined;
  EscolhaCidade: undefined;
  DetalheClinica: { clinicaId: string };
  ConfirmarPedido: { clinicaId: string };
  PedidoEnviado: { solicitacaoId: string };
  StatusPedido: { solicitacaoId: string };
  // Rotas dos módulos: params livres, cada módulo documenta os seus.
  [modulo: string]: object | undefined;
};

export type RotasAbas = {
  Clinicas: undefined;
  Pedidos: undefined;
  Ajustes: undefined;
  [modulo: string]: object | undefined;
};

/**
 * Contrato do ponto de montagem (docs/fronteiras.md): cada módulo exporta
 * `rotas: RotaModulo[]` em mobile/src/modulos/<m>/rotas.ts.
 */
export interface RotaModulo {
  /** Nome único da rota, prefixado pelo módulo. Ex.: "Urgencia.Relato". */
  nome: string;
  componente: ComponentType<any>;
  /** Título no cabeçalho (pt-BR). */
  titulo?: string;
  /** Tela que exige params: não ganha atalho em Ajustes › Mais (abre a partir de outra tela). */
  semAtalho?: boolean;
  /** Se presente, a tela vira uma aba inferior com este rótulo e ícone (MaterialIcons). */
  aba?: { rotulo: string; icone: string };
}
