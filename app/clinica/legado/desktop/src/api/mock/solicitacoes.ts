import { ApiErro } from "../cliente";
import type { SolicitacoesApi } from "../solicitacoes";
import { EXIGE_MOTIVO, TRANSICOES, type Estado, type EventoSolicitacao, type Solicitacao, type Usuario } from "../tipos";
import { copiaEventos, copiaSolicitacoes, nomePaciente } from "./dados";

/** Mock em memória: isola por clínica e aplica a tabela de transições (contrato §5), como o servidor faria. */
export function criarMockSolicitacoes(usuario: () => Usuario | null, atraso = 150): SolicitacoesApi {
  let pedidos = copiaSolicitacoes();
  let eventos = copiaEventos();
  const espera = () => new Promise((r) => setTimeout(r, atraso));
  const clinica = () => {
    const u = usuario();
    if (!u) throw new ApiErro(401, "nao_autenticado", "Você precisa entrar para continuar.");
    if (u.papel !== "funcionario" || !u.clinica_id) throw new ApiErro(403, "acesso_negado", "Você não tem permissão para fazer isso.");
    return u.clinica_id;
  };
  const doEscopo = (id: string) => {
    const c = clinica();
    const s = pedidos.find((p) => p.id === id && p.clinica_id === c);
    if (!s) throw new ApiErro(404, "nao_encontrado", "Não encontramos o que você procurou.");
    return s;
  };
  const comNome = (s: Solicitacao): Solicitacao => ({ ...s, paciente_nome_exibicao: nomePaciente(s.paciente_id) });

  return {
    async listar(estado) {
      await espera();
      const c = clinica();
      return pedidos
        .filter((p) => p.clinica_id === c && (!estado || p.estado === estado))
        .sort((a, b) => a.criado_em.localeCompare(b.criado_em)).map(comNome);
    },
    async obter(id) { await espera(); return comNome(doEscopo(id)); },
    async eventos(id) {
      await espera(); doEscopo(id);
      return eventos.filter((e) => e.solicitacao_id === id).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    },
    async transicionar(id, novo: Estado, motivo?: string) {
      await espera();
      const s = doEscopo(id);
      if (!(TRANSICOES[s.estado] ?? []).includes(novo))
        throw new ApiErro(409, "transicao_invalida", "Esta mudança de situação não é permitida para este pedido.");
      if (EXIGE_MOTIVO.includes(novo) && !motivo?.trim())
        throw new ApiErro(422, "validacao", "Informe o motivo administrativo.");
      const u = usuario()!;
      const agora = new Date().toISOString();
      const ev: EventoSolicitacao = {
        id: crypto.randomUUID(), solicitacao_id: id, tipo: "transicao", estado_anterior: s.estado, estado_novo: novo,
        autor_usuario_id: u.id, autor_papel: "funcionario", motivo: motivo?.trim() || null, criado_em: agora,
      };
      eventos = [...eventos, ev];
      s.estado = novo; s.atualizado_em = agora;
      return comNome(s);
    },
    reiniciar() { pedidos = copiaSolicitacoes(); eventos = copiaEventos(); },
  };
}
