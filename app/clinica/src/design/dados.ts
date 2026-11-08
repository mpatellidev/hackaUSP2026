/* Dados do painel da clínica: tudo vem da API (escopo e clínica pelo token). Nada aqui decide regra de negócio. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessao, type components } from "@uhealth/api-client";

type S = components["schemas"];
export type Pedido = S["PedidoDoPainel"];
export type EstadoPedido = Pedido["estado"];
export type ItemFila = S["ItemFila"];
export type NovoEstado = S["AtualizarEstadoIn"]["estado"];
export type DadosClinica = S["AtualizarClinicaIn"];

/** Espelho de TRANSICOES_FUNCIONARIO (backend/app/modulos/solicitacoes/service.py), só para oferecer opções. Quem decide é a API. */
export const PROXIMOS: Partial<Record<EstadoPedido, NovoEstado[]>> = {
  enviada: ["em_analise", "indisponivel"],
  em_analise: ["precisa_contato", "indisponivel"],
  precisa_contato: ["em_analise", "indisponivel"],
  agendada: ["concluida"],
};
/** A API exige motivo administrativo nestas mudanças. */
export const PEDE_MOTIVO: NovoEstado[] = ["precisa_contato", "indisponivel"];
/** Mesma regra do backend (painel_clinica): quem pode alterar os dados da clínica. */
export const FUNCOES_QUE_EDITAM = ["atendimento", "coordenacao"];

export const protocolo = (id: string) => id.slice(0, 8).toUpperCase();
export const diasDeEspera = (iso: string, agora: Date = new Date()) => Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 864e5));

/** Consultas do painel. As chaves são as mesmas dos outros módulos do app, para o cache ser compartilhado. */
export function usePainel(clinicaId: string) {
  const { api } = useSessao();
  const path = { clinica_id: clinicaId };
  return {
    clinica: useQuery({ queryKey: ["clinica", clinicaId], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path } })) }),
    pedidos: useQuery({ queryKey: ["painel-clinica", "pedidos"], queryFn: () => api.dados(api.cliente.GET("/painel-clinica/pedidos", {})) }),
    fila: useQuery({ queryKey: ["fila", clinicaId], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/fila", { params: { path } })) }),
    vagas: useQuery({ queryKey: ["vagas", clinicaId], queryFn: () => api.dados(api.cliente.GET("/vagas", { params: { query: { clinica_id: clinicaId } } })) }),
    profissionais: useQuery({ queryKey: ["profissionais", clinicaId, "ativos"], queryFn: () => api.dados(api.cliente.GET("/profissionais", { params: { query: { clinica_id: clinicaId, ativos: true } } })) }),
  };
}

export function useEventos(solicitacaoId: string) {
  const { api } = useSessao();
  return useQuery({
    queryKey: ["solicitacao", solicitacaoId, "eventos"],
    queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/eventos", { params: { path: { solicitacao_id: solicitacaoId } } })),
  });
}

export function useInteressados(vagaId: string) {
  const { api } = useSessao();
  return useQuery({
    queryKey: ["vaga", vagaId, "interesses"],
    queryFn: () => api.dados(api.cliente.GET("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: vagaId } } })),
  });
}

/** Ações do painel. Depois de cada uma, recarrega o que mudou (inclusive nas outras telas do app). */
export function useAcoesPainel(clinicaId: string) {
  const { api } = useSessao();
  const qc = useQueryClient();
  const recarregar = (...chaves: string[]) => Promise.all(chaves.map((k) => qc.invalidateQueries({ queryKey: [k] })));
  return {
    mudarEstado: useMutation({
      mutationFn: ({ id, estado, motivo }: { id: string; estado: NovoEstado; motivo: string | null }) =>
        api.dados(api.cliente.PATCH("/solicitacoes/{solicitacao_id}/estado", { params: { path: { solicitacao_id: id } }, body: { estado, motivo } })),
      onSuccess: () => recarregar("painel-clinica", "solicitacoes", "solicitacao", "fila"),
    }),
    publicarVaga: useMutation({
      mutationFn: (body: S["CriarVagaIn"]) => api.dados(api.cliente.POST("/vagas", { body })),
      onSuccess: () => recarregar("vagas"),
    }),
    confirmarInteresse: useMutation({
      mutationFn: ({ vagaId, interesseId }: { vagaId: string; interesseId: string }) =>
        api.dados(api.cliente.POST("/vagas/{vaga_id}/confirmar", { params: { path: { vaga_id: vagaId } }, body: { interesse_id: interesseId } })),
      onSuccess: () => recarregar("vagas", "vaga", "agendamentos", "painel-clinica", "solicitacoes", "solicitacao", "fila"),
    }),
    salvarClinica: useMutation({
      mutationFn: (body: DadosClinica) => api.dados(api.cliente.PATCH("/clinicas/{clinica_id}", { params: { path: { clinica_id: clinicaId } }, body })),
      onSuccess: () => recarregar("clinica"),
    }),
  };
}
