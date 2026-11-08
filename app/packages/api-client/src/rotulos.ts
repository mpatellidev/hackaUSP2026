import type { Clinica, EstadoSolicitacao, PublicoAlvo } from "./tipos";

/** Vocabulário pt-BR das telas. Só rótulo: a regra de cada estado é do backend. */
export const ESTADO_PEDIDO: Record<EstadoSolicitacao, { rotulo: string; tom: "padrao" | "aviso" | "perigo"; explica: string }> = {
  enviada: { rotulo: "Enviada", tom: "padrao", explica: "A clínica ainda vai olhar o seu pedido." },
  em_analise: { rotulo: "Em análise", tom: "padrao", explica: "A clínica está avaliando o seu pedido." },
  precisa_contato: { rotulo: "Precisa de contato", tom: "aviso", explica: "A clínica precisa falar com você. Veja o telefone da clínica." },
  indisponivel: { rotulo: "Indisponível", tom: "aviso", explica: "Esta clínica não pode atender agora. Você escolhe se quer tentar outra." },
  aguardando_confirmacao: { rotulo: "Aguardando confirmação", tom: "aviso", explica: "Você demonstrou interesse em uma vaga. A clínica confirma uma única pessoa." },
  agendada: { rotulo: "Agendada", tom: "padrao", explica: "A clínica confirmou o seu horário." },
  concluida: { rotulo: "Concluída", tom: "padrao", explica: "O atendimento foi concluído." },
};

/** Especialidades odontológicas, com nome simples entre parênteses quando o termo técnico não é conhecido. */
export const ESPECIALIDADES: Record<string, string> = {
  triagem: "Triagem (primeira avaliação)",
  clinica_integrada: "Clínica integrada (atendimento geral)",
  dentistica: "Dentística (restaurações e cáries)",
  endodontia: "Endodontia (canal)",
  periodontia: "Periodontia (gengiva)",
  cirurgia: "Cirurgia (extrações)",
  protese: "Prótese (dentadura e coroa)",
  odontopediatria: "Odontopediatria (crianças)",
  estomatologia: "Estomatologia (feridas na boca)",
  ortodontia: "Ortodontia (aparelho)",
};
export const rotuloEspecialidade = (e: string) => ESPECIALIDADES[e] ?? e.replace(/_/g, " ");

export const PUBLICO: Record<PublicoAlvo, string> = { adultos: "Adultos", criancas: "Crianças", gestantes: "Gestantes", idosos: "Idosos" };

export const CUSTO: Record<Clinica["custo_informado"], string> = {
  gratuito: "Gratuito", a_confirmar: "Custo a confirmar com a clínica", pago_informado: "Pago (valor informado pela clínica)",
};

export const FUNCAO: Record<string, string> = { atendimento: "Atendimento", profissional: "Profissional", coordenacao: "Coordenação" };
export const VINCULO: Record<string, string> = { docente: "Docente", residente: "Residente", estudante_supervisionado: "Estudante supervisionado" };

const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });
const FORMATO_HORA = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" });
export const dataHora = (iso: string) => FORMATO_DATA_HORA.format(new Date(iso));
export const data = (iso: string) => FORMATO_DATA.format(new Date(iso));
export const hora = (iso: string) => FORMATO_HORA.format(new Date(iso));

/** Critérios que a API usa para sugerir clínicas alternativas, em linguagem simples. */
export const CRITERIO_ALTERNATIVA: Record<string, string> = {
  mesma_cidade: "fica na mesma cidade",
  publico_compativel: "atende o público do seu pedido",
  recebendo_pedidos: "está recebendo pedidos",
  mesma_especialidade: "atende a mesma especialidade",
};
