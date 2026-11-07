// Tipos espelhando docs/contratos-mvp.md (v0.1.1). Campos em snake_case como na API.

export type CustoInformado = 'gratuito' | 'a_confirmar' | 'pago_informado';
export type Publico = 'adultos' | 'criancas' | 'gestantes' | 'idosos';

export interface Clinica {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  publico: Publico[];
  especialidades: string[];
  custo_informado: CustoInformado;
  recebendo_pedidos: boolean;
  telefone: string;
  distancia_km_demo?: number | null;
}

export type EstadoSolicitacao =
  | 'enviada'
  | 'em_analise'
  | 'precisa_contato'
  | 'indisponivel'
  | 'aguardando_confirmacao'
  | 'agendada'
  | 'concluida';

export interface Solicitacao {
  id: string;
  paciente_id: string;
  clinica_id: string;
  estado: EstadoSolicitacao;
  especialidade: string;
  descricao_administrativa: string;
  solicitacao_origem_id: string | null;
  criado_em: string;
  atualizado_em: string | null;
}

export interface EventoSolicitacao {
  id: string;
  solicitacao_id: string;
  tipo: 'criada' | 'transicao' | 'encaminhamento_escolhido' | 'interesse_registrado' | 'confirmacao';
  estado_anterior: EstadoSolicitacao | null;
  estado_novo: EstadoSolicitacao | null;
  autor_usuario_id: string;
  autor_papel: 'paciente' | 'funcionario' | 'sistema';
  motivo: string | null;
  criado_em: string;
}

export interface Usuario {
  id: string;
  papel: 'paciente' | 'funcionario';
  nome_exibicao: string;
}

export interface RespostaLogin {
  modo: 'demo';
  token: string;
  expira_em?: string;
  usuario: Usuario;
}

export interface Lista<T> {
  itens: T[];
  total: number;
}

export interface NovaSolicitacao {
  clinica_id: string;
  especialidade: string;
  descricao_administrativa: string;
}
