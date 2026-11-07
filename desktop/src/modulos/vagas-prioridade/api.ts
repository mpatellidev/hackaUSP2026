import { ApiErro, http, MODO } from "../../api/cliente";

export interface Vaga { id: string; especialidade: string; inicio: string; estado: "aberta" | "preenchida" | "cancelada"; interesse?: string; }
export interface ItemFila { solicitacao_id: string; paciente_nome_exibicao: string; score: number; urgencia_avaliada: boolean; componentes: { nome: string; valor: number | null; peso: number; fonte: string }[]; sinalizacoes: string[]; }
let vagas: Vaga[] = [{ id: "vaga-demo-1", especialidade: "clinica_geral", inicio: "2026-11-12T14:00:00-03:00", estado: "aberta" }];

export const apiVagasPrioridade = {
  async listarVagas(): Promise<Vaga[]> {
    if (MODO === "mock") return vagas;
    return http<Vaga[]>("GET", "/vagas");
  },
  async criarVaga(especialidade: string, inicio: string): Promise<Vaga> {
    if (MODO === "mock") { const v = { id: crypto.randomUUID(), especialidade, inicio, estado: "aberta" as const }; vagas = [...vagas, v]; return v; }
    return http<Vaga>("POST", "/vagas", { especialidade, inicio, fim: inicio });
  },
  async confirmar(vagaId: string, interesseId: string) {
    if (MODO === "mock") { const v = vagas.find((x) => x.id === vagaId); if (!v || v.estado !== "aberta") throw new ApiErro(409, "vaga_ja_preenchida", "Esta vaga já foi preenchida."); v.estado = "preenchida"; v.interesse = "confirmado"; return v; }
    return http<Vaga>("POST", `/vagas/${vagaId}/confirmar`, { interesse_id: interesseId });
  },
  async fila(clinicaId: string): Promise<ItemFila[]> {
    if (MODO === "mock") return [{ solicitacao_id: "pedido-demo-1", paciente_nome_exibicao: "Ana M.", score: 41, urgencia_avaliada: true, componentes: [{ nome: "tempo_espera", valor: 26, peso: 1, fonte: "solicitacao.criado_em" }], sinalizacoes: ["Urgência avaliada: revisão humana obrigatória."] }];
    return (await http<{ itens: ItemFila[] }>("GET", `/clinicas/${clinicaId}/fila`)).itens;
  },
};
