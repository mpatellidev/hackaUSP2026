// MODO DEMONSTRATIVO: dados fictícios em memória, sem backend.
import { AVISO_RELATO, ROTULO_AGUARDANDO } from '../textos';
import type { ClienteUrgencia, RelatoUrgencia } from '../tipos';

export function criarClienteMock(pacienteId = 'a1000000-0000-4000-8000-000000000001'): ClienteUrgencia {
  const itens: RelatoUrgencia[] = [];
  return {
    async relatar(solicitacaoId = null) {
      const existente = itens.find((r) => r.solicitacao_id === solicitacaoId && r.estado === 'aguardando_avaliacao');
      if (existente) return existente;
      const r: RelatoUrgencia = {
        id: `mock-${itens.length + 1}`,
        paciente_id: pacienteId,
        solicitacao_id: solicitacaoId,
        estado: 'aguardando_avaliacao',
        criado_em: new Date().toISOString(),
        rotulo: ROTULO_AGUARDANDO,
        avaliacao: null,
        modo: 'demo',
        aviso: AVISO_RELATO,
      };
      itens.unshift(r);
      return r;
    },
    async listar() {
      return [...itens];
    },
  };
}
