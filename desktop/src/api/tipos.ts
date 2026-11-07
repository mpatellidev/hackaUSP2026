export type Estado =
  | "enviada" | "em_analise" | "precisa_contato" | "indisponivel"
  | "aguardando_confirmacao" | "agendada" | "concluida";

export interface Solicitacao {
  id: string;
  paciente_id: string;
  paciente_nome_exibicao?: string;
  clinica_id: string;
  estado: Estado;
  especialidade: string;
  descricao_administrativa: string;
  solicitacao_origem_id: string | null;
  criado_em: string;
  atualizado_em: string | null;
}

export interface EventoSolicitacao {
  id: string;
  solicitacao_id: string;
  tipo: string;
  estado_anterior: Estado | null;
  estado_novo: Estado | null;
  autor_usuario_id: string;
  autor_papel: string;
  motivo: string | null;
  criado_em: string;
}

export interface Usuario {
  id: string;
  papel: "paciente" | "funcionario";
  nome_exibicao: string;
  clinica_id?: string;
  funcao?: string;
}

export const ROTULO_ESTADO: Record<Estado, string> = {
  enviada: "Enviada", em_analise: "Em análise", precisa_contato: "Precisa de contato",
  indisponivel: "Não recebemos agora", aguardando_confirmacao: "Aguardando confirmação",
  agendada: "Agendada", concluida: "Concluída",
};

/** Transições que o FUNCIONÁRIO pode pedir (contrato §5). As demais são do sistema/outras frentes. */
export const TRANSICOES: Partial<Record<Estado, Estado[]>> = {
  enviada: ["em_analise", "indisponivel"],
  em_analise: ["precisa_contato", "indisponivel"],
  precisa_contato: ["em_analise", "indisponivel"],
};
export const EXIGE_MOTIVO: Estado[] = ["precisa_contato", "indisponivel"];
