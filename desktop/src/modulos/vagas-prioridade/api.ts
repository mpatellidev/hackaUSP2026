import { ApiErro, http, MODO } from "../../api/cliente";

export interface Vaga {
  id: string; clinica_id?: string; especialidade: string; inicio: string; fim?: string;
  estado: "aberta" | "preenchida" | "cancelada"; interesses_registrados?: number;
}
export interface Interesse {
  id: string; vaga_id: string; solicitacao_id: string; paciente_nome_exibicao: string;
  estado: "registrado" | "confirmado" | "nao_selecionado" | "retirado";
  posicao_sugerida: number; urgencia_avaliada: boolean; score: number; sinalizacoes: string[];
}
export interface ItemFila { solicitacao_id: string; paciente_nome_exibicao: string; score: number; urgencia_avaliada: boolean; componentes: { nome: string; valor: number | null; peso: number; fonte: string }[]; sinalizacoes: string[]; }

// ---- mock (modo demonstração) ---------------------------------------------------------------
let vagas: Vaga[] = [{ id: "vaga-demo-1", especialidade: "clinica_geral", inicio: "2026-11-12T14:00:00-03:00", estado: "aberta", interesses_registrados: 2 }];
let interesses: Interesse[] = [
  { id: "interesse-demo-1", vaga_id: "vaga-demo-1", solicitacao_id: "pedido-demo-1", paciente_nome_exibicao: "Ana M.", estado: "registrado", posicao_sugerida: 1, urgencia_avaliada: true, score: 41, sinalizacoes: ["Urgência avaliada: revisão humana obrigatória."] },
  { id: "interesse-demo-2", vaga_id: "vaga-demo-1", solicitacao_id: "pedido-demo-2", paciente_nome_exibicao: "Eva R.", estado: "registrado", posicao_sugerida: 2, urgencia_avaliada: false, score: 18, sinalizacoes: [] },
];

export const apiVagasPrioridade = {
  async listarVagas(): Promise<Vaga[]> {
    if (MODO === "mock") return vagas;
    return (await http<{ itens: Vaga[] }>("GET", "/vagas")).itens;
  },
  async criarVaga(especialidade: string, inicio: string, fim: string): Promise<Vaga> {
    if (MODO === "mock") { const v: Vaga = { id: crypto.randomUUID(), especialidade, inicio, fim, estado: "aberta", interesses_registrados: 0 }; vagas = [...vagas, v]; return v; }
    return http<Vaga>("POST", "/vagas", { especialidade, inicio, fim });
  },
  /** Interessados na ordem SUGERIDA pela prioridade (#13): urgência avaliada primeiro. A decisão é humana. */
  async interesses(vagaId: string): Promise<Interesse[]> {
    if (MODO === "mock") return interesses.filter((i) => i.vaga_id === vagaId);
    return (await http<{ itens: Interesse[] }>("GET", `/vagas/${vagaId}/interesses`)).itens;
  },
  /** Confirma UMA pessoa, pelo `interesse_id` escolhido na lista. Segunda confirmação -> 409. */
  async confirmar(vagaId: string, interesseId: string): Promise<Vaga> {
    if (MODO === "mock") {
      const v = vagas.find((x) => x.id === vagaId);
      if (!v || v.estado !== "aberta") throw new ApiErro(409, "vaga_ja_preenchida", "Esta vaga já foi preenchida. Veja outras vagas disponíveis.");
      const escolhido = interesses.find((i) => i.id === interesseId && i.vaga_id === vagaId && i.estado === "registrado");
      if (!escolhido) throw new ApiErro(404, "nao_encontrado", "Não encontramos este interesse.");
      interesses = interesses.map((i) => i.vaga_id !== vagaId ? i : { ...i, estado: i.id === interesseId ? "confirmado" : i.estado === "registrado" ? "nao_selecionado" : i.estado });
      v.estado = "preenchida"; v.interesses_registrados = 0;
      return v;
    }
    return http<Vaga>("POST", `/vagas/${vagaId}/confirmar`, { interesse_id: interesseId });
  },
  async fila(clinicaId: string): Promise<ItemFila[]> {
    if (MODO === "mock") return [{ solicitacao_id: "pedido-demo-1", paciente_nome_exibicao: "Ana M.", score: 41, urgencia_avaliada: true, componentes: [{ nome: "tempo_espera", valor: 26, peso: 1, fonte: "solicitacao.criado_em" }], sinalizacoes: ["Urgência avaliada: revisão humana obrigatória."] }];
    return (await http<{ itens: ItemFila[] }>("GET", `/clinicas/${clinicaId}/fila`)).itens;
  },
};
