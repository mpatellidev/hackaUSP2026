// Rótulos pt-BR para os valores de enum do contrato. Valor desconhecido aparece "humanizado", sem quebrar.
import type { CustoInformado, EstadoSolicitacao, Publico } from '../api/tipos';

const ESPECIALIDADES: Record<string, string> = {
  clinica_geral: 'Clínica geral',
  pediatria: 'Pediatria',
  ginecologia_obstetricia: 'Ginecologia e obstetrícia',
  cardiologia: 'Cardiologia',
  dermatologia: 'Dermatologia',
  ortopedia: 'Ortopedia',
  oftalmologia: 'Oftalmologia',
  saude_mental: 'Saúde mental',
  odontologia: 'Odontologia',
  fisioterapia: 'Fisioterapia',
  nutricao: 'Nutrição',
};

export function rotuloEspecialidade(v: string) {
  return ESPECIALIDADES[v] ?? v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export const ROTULO_CUSTO: Record<CustoInformado, string> = {
  gratuito: 'Gratuito',
  a_confirmar: 'Custo a confirmar',
  pago_informado: 'Pago (valor informado pela clínica)',
};

export const ROTULO_PUBLICO: Record<Publico, string> = {
  adultos: 'Adultos',
  criancas: 'Crianças',
  gestantes: 'Gestantes',
  idosos: 'Idosos',
};

export function rotuloPublico(lista: Publico[]) {
  const nomes = lista.map((p) => ROTULO_PUBLICO[p] ?? p);
  if (nomes.length <= 1) return nomes.join('');
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1].toLowerCase()}`;
}

export const ROTULO_ESTADO: Record<EstadoSolicitacao, string> = {
  enviada: 'Pedido enviado',
  em_analise: 'Em análise pela clínica',
  precisa_contato: 'A clínica precisa falar com você',
  indisponivel: 'Clínica não pode atender',
  aguardando_confirmacao: 'Aguardando confirmação da clínica',
  agendada: 'Agendada',
  concluida: 'Atendimento concluído',
};

export function formatarDataHora(iso: string) {
  // Os horários já chegam em -03:00 (contrato §2); mostramos a parte local como veio, sem converter de novo.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]} às ${m[4]}h${m[5]}`;
}
