/** Dados SIMULADOS (docs/fixtures). Nada aqui sai do computador; é só o modo demonstração. */
import clinicas from "@fixtures/clinicas.json";
import contas from "@fixtures/contas-demo.json";
import eventos from "@fixtures/eventos.json";
import solicitacoes from "@fixtures/solicitacoes.json";
import usuarios from "@fixtures/usuarios.json";
import vinculos from "@fixtures/vinculos.json";
import type { EventoSolicitacao, Solicitacao, Usuario } from "../tipos";

export interface ContaDemo { conta: string; nome: string; papel: string; funcao?: string; clinica_id?: string; clinica_nome?: string }

const nome = (id: string) => (usuarios.itens as any[]).find((u) => u.id === id)?.nome_exibicao ?? "Paciente";

export const CONTAS: ContaDemo[] = (contas.itens as any[]).map((c) => {
  const v = (vinculos.itens as any[]).find((x) => x.usuario_id === c.usuario_id);
  return {
    conta: c.conta, nome: nome(c.usuario_id), papel: c.papel, funcao: v?.funcao, clinica_id: v?.clinica_id,
    clinica_nome: (clinicas.itens as any[]).find((x) => x.id === v?.clinica_id)?.nome,
  };
});

export function usuarioDe(conta: string): Usuario | null {
  const c = (contas.itens as any[]).find((x) => x.conta === conta);
  if (!c) return null;
  const v = (vinculos.itens as any[]).find((x) => x.usuario_id === c.usuario_id);
  return { id: c.usuario_id, papel: c.papel, nome_exibicao: nome(c.usuario_id), clinica_id: v?.clinica_id, funcao: v?.funcao };
}

export const nomePaciente = nome;
export const copiaSolicitacoes = (): Solicitacao[] => structuredClone(solicitacoes.itens) as Solicitacao[];
export const copiaEventos = (): EventoSolicitacao[] => structuredClone(eventos.itens) as EventoSolicitacao[];
