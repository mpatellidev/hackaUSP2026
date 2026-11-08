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

/** Protocolo curto: o fim do id (o começo se repete nas fixtures, por exemplo "b1000000-…"). */
export const protocolo = (id: string) => id.replace(/-/g, "").slice(-8).toUpperCase();
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

/* ---------- score explicável (o mesmo cálculo da API: soma de valor × peso) ---------- */
type Componente = S["ComponenteOut"];
/** Como o pitch apresenta o score: comparecimento + situação socioeconômica. O que não couber vai em "Outros". */
const GRUPOS_SCORE: { titulo: string; nomes: string[] }[] = [
  { titulo: "Comparecimento", nomes: ["assiduidade", "falta_verificada"] },
  { titulo: "Situação socioeconômica", nomes: ["socioeconomico", "deficiencia"] },
];
/** Rótulos do backend (prioridade/router.py, NOME). */
export const NOME_COMPONENTE: Record<string, string> = {
  assiduidade: "Ida às consultas", falta_verificada: "Faltas sem aviso", socioeconomico: "Renda", deficiencia: "Deficiência",
  risco_clinico: "Gravidade do caso", tempo_espera: "Tempo de espera", necessidade_academica: "Encaixe com as aulas",
};
const pontos = (c: Componente) => (c.valor ?? 0) * c.peso;

export function grupoScore(componentes: Componente[]): { titulo: string; pontos: number; componentes: Componente[] }[] {
  const usados = new Set(GRUPOS_SCORE.flatMap((g) => g.nomes));
  const grupos = [...GRUPOS_SCORE, { titulo: "Outros", nomes: componentes.map((c) => c.nome).filter((n) => !usados.has(n)) }];
  return grupos
    .map((g) => {
      const lista = componentes.filter((c) => g.nomes.includes(c.nome));
      return { titulo: g.titulo, pontos: lista.reduce((s, c) => s + pontos(c), 0), componentes: lista };
    })
    .filter((g) => g.titulo !== "Outros" || g.componentes.length > 0);
}
export const fmtPontos = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/* ---------- prontuário clínico ---------- */
export type RegistroProntuario = S["RegistroOut"];
export type NovoRegistro = S["RegistroIn"];
export const TIPOS_REGISTRO: Record<NovoRegistro["tipo"], string> = {
  triagem: "Triagem", exame_clinico: "Exame clínico", radiografia: "Radiografia", laudo: "Laudo",
  plano_tratamento: "Plano de tratamento", evolucao: "Evolução do tratamento",
};
export const RISCOS: Record<NonNullable<NovoRegistro["risco_clinico"]>, string> = { baixo: "Baixa", moderado: "Moderada", alto: "Alta", urgente: "Urgente" };
/** Tipos que, validados pelo professor, acionam o indexador (manter aqui ou encaminhar a outra parceira). */
export const ACIONA_INDEXADOR: string[] = ["triagem", "plano_tratamento"];
/** Espelho do catálogo do indexador (backend/app/modulos/indexador/service.py, PROCEDIMENTOS): procedimento → especialidade. */
export const PROCEDIMENTOS: Record<string, { rotulo: string; especialidade: string }> = {
  avaliacao_inicial: { rotulo: "Avaliação inicial", especialidade: "triagem" },
  restauracao_resina: { rotulo: "Restauração em resina", especialidade: "dentistica" },
  faceta_resina: { rotulo: "Faceta em resina", especialidade: "dentistica" },
  raspagem_supragengival: { rotulo: "Raspagem supragengival", especialidade: "periodontia" },
  raspagem_subgengival: { rotulo: "Raspagem subgengival", especialidade: "periodontia" },
  canal_unirradicular: { rotulo: "Canal (uma raiz)", especialidade: "endodontia" },
  canal_multirradicular: { rotulo: "Canal (várias raízes)", especialidade: "endodontia" },
  extracao_simples: { rotulo: "Extração simples", especialidade: "cirurgia" },
  extracao_terceiro_molar: { rotulo: "Extração de siso", especialidade: "cirurgia" },
  protese_total: { rotulo: "Prótese total (dentadura)", especialidade: "protese" },
  coroa_unitaria: { rotulo: "Coroa unitária", especialidade: "protese" },
  aplicacao_fluor: { rotulo: "Aplicação de flúor", especialidade: "odontopediatria" },
  restauracao_dente_de_leite: { rotulo: "Restauração em dente de leite", especialidade: "odontopediatria" },
  biopsia_lesao_bucal: { rotulo: "Biópsia de lesão na boca", especialidade: "estomatologia" },
};
export const rotuloProcedimento = (p: string) => PROCEDIMENTOS[p]?.rotulo ?? p.replace(/_/g, " ");
/** Quem escreve e quem valida (mesma regra do backend: prontuario/service.py). */
export const ESCREVE_PRONTUARIO = ["estudante", "profissional"];
export const VALIDA_PRONTUARIO = ["profissional"];

/** Abrir o prontuário registra um acesso (auditoria); por isso só busca quando a equipe pede. */
export function useProntuario(pacienteId: string, aberto: boolean) {
  const { api } = useSessao();
  return useQuery({
    queryKey: ["prontuario", pacienteId],
    enabled: aberto,
    queryFn: () => api.dados(api.cliente.GET("/pacientes/{paciente_id}/prontuario", { params: { path: { paciente_id: pacienteId } } })),
  });
}

export function useAcoesProntuario() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const recarregar = () => qc.invalidateQueries({ queryKey: ["prontuario"] });
  return {
    escrever: useMutation({ mutationFn: (body: NovoRegistro) => api.dados(api.cliente.POST("/prontuario", { body })), onSuccess: recarregar }),
    validar: useMutation({
      mutationFn: (id: string) => api.dados(api.cliente.POST("/prontuario/{registro_id}/validar", { params: { path: { registro_id: id } } })),
      // A validação pode encaminhar o paciente (indexador): a fila e os pedidos também mudam.
      onSuccess: () => Promise.all(["prontuario", "fila", "painel-clinica", "vagas"].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
    }),
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
