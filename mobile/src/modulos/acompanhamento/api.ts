import { chamar } from '../../api/cliente';
import type { Clinica, Lista, Solicitacao } from '../../api/tipos';
import clinicasJson from '../../api/mock/fixtures/clinicas.json';

export interface AlternativasOut {
  criterios: string[];
  itens: { clinica: Clinica }[];
  aviso: string;
}

export interface VagaDemo {
  id: string;
  clinica_id: string;
  especialidade: string;
  inicio: string;
  fim: string;
  estado: 'aberta' | 'preenchida' | 'cancelada';
  interesse?: 'registrado' | 'confirmado' | 'nao_selecionado';
}

const vagasMock: VagaDemo[] = [
  { id: 'vaga-demo-1', clinica_id: 'c1000000-0000-4000-8000-000000000002', especialidade: 'clinica_geral', inicio: '2026-11-12T14:00:00-03:00', fim: '2026-11-12T14:30:00-03:00', estado: 'aberta' },
];

export const apiAcompanhamento = {
  alternativas(solicitacaoId: string) {
    return chamar<AlternativasOut>(`/solicitacoes/${solicitacaoId}/alternativas`, {
      mock: async () => ({
        criterios: ['mesma_cidade', 'publico_compativel', 'recebendo_pedidos', 'mesma_especialidade'],
        itens: (clinicasJson.itens as Clinica[]).filter((c) => c.id.endsWith('0002')).map((clinica) => ({ clinica })),
        aviso: 'Sugestão não é garantia de vaga nem de atendimento.',
      }),
    });
  },
  encaminhar(solicitacaoId: string, clinicaDestinoId: string) {
    return chamar<{ solicitacao: Solicitacao }>(`/solicitacoes/${solicitacaoId}/encaminhar`, {
      metodo: 'POST', corpo: { clinica_destino_id: clinicaDestinoId },
      mock: async () => ({ solicitacao: {
        id: `encaminhamento-${Date.now()}`, paciente_id: 'paciente-demo', clinica_id: clinicaDestinoId,
        estado: 'enviada', especialidade: 'clinica_geral', descricao_administrativa: 'Pedido encaminhado em demonstração.',
        solicitacao_origem_id: solicitacaoId, criado_em: '2026-11-07T10:00:00-03:00', atualizado_em: '2026-11-07T10:00:00-03:00',
      } }),
    });
  },
  vagas(clinicaId: string) {
    return chamar<Lista<VagaDemo>>(`/vagas?clinica_id=${clinicaId}`, {
      mock: async () => ({ itens: vagasMock.filter((v) => v.clinica_id === clinicaId), total: vagasMock.filter((v) => v.clinica_id === clinicaId).length }),
    });
  },
  interesse(vagaId: string, solicitacaoId: string) {
    return chamar<VagaDemo>(`/vagas/${vagaId}/interesses`, {
      metodo: 'POST', corpo: { solicitacao_id: solicitacaoId },
      mock: async () => {
        const vaga = vagasMock.find((v) => v.id === vagaId);
        if (!vaga || vaga.estado !== 'aberta') throw new Error('Esta vaga já não está disponível.');
        vaga.interesse = 'registrado';
        return vaga;
      },
    });
  },
};
