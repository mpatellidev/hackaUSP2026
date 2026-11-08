import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Aviso, Botao, CampoTexto, Carregando, Erro, Selo, Tabela, Vazio } from "@uhealth/ui";
import { dataHora, mensagemDe, rotuloEspecialidade, useSessao, type Agendamento } from "@uhealth/api-client";
import { useClinicaAtual } from "../clinicaAtual";

const ESTADO = { agendado: "Agendado", concluido: "Concluído", cancelado: "Cancelado" } as const;
const DESFECHO: Record<string, string> = {
  pendente: "Pendente", compareceu: "Compareceu", falta_registrada: "Falta registrada",
  cancelado_antecipado: "Cancelado pelo paciente", cancelado_pela_clinica: "Cancelado pela clínica",
};

/** Mesma regra da API (POST /faltas): só profissional, depois que o horário começou, com justificativa. */
const podeRegistrarFalta = (a: Agendamento, funcao: string, agora = Date.now()) =>
  funcao === "profissional" && a.estado === "agendado" && a.desfecho === "pendente" && new Date(a.vaga.inicio).getTime() <= agora;

export function Agendamentos() {
  const { api } = useSessao();
  const { funcao } = useClinicaAtual();
  const qc = useQueryClient();
  const [alvo, setAlvo] = useState<{ a: Agendamento; acao: "cancelar" | "concluir" | "falta" } | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const lista = useQuery({ queryKey: ["agendamentos"], queryFn: () => api.dados(api.cliente.GET("/agendamentos", {})) });
  const depois = () => { setAlvo(null); return Promise.all(["agendamentos", "solicitacoes", "vagas", "fila"].map((k) => qc.invalidateQueries({ queryKey: [k] }))); };
  const cancelar = useMutation({
    mutationFn: (a: Agendamento) => api.dados(api.cliente.POST("/agendamentos/{agendamento_id}/cancelar", { params: { path: { agendamento_id: a.id } }, body: {} })),
    onSuccess: depois,
  });
  const concluir = useMutation({
    mutationFn: (a: Agendamento) => api.dados(api.cliente.PATCH("/solicitacoes/{solicitacao_id}/estado", { params: { path: { solicitacao_id: a.solicitacao_id } }, body: { estado: "concluida" } })),
    onSuccess: depois,
  });
  const falta = useMutation({
    mutationFn: (a: Agendamento) => api.dados(api.cliente.POST("/faltas", { body: { agendamento_id: a.id, justificativa: justificativa.trim() } })),
    onSuccess: () => { setJustificativa(""); return depois(); },
  });
  const erro = cancelar.error ?? concluir.error ?? falta.error;
  const ocupado = cancelar.isPending || concluir.isPending || falta.isPending;

  return (
    <>
      <h1>Agendamentos</h1>
      {lista.isPending && <Carregando />}
      {lista.isError && <Erro mensagem={mensagemDe(lista.error)} aoTentar={() => lista.refetch()} />}
      {erro && <Aviso tom="perigo">{mensagemDe(erro)}</Aviso>}
      {lista.data && lista.data.itens.length === 0 && <Vazio>Nenhum agendamento confirmado ainda.</Vazio>}
      {lista.data && lista.data.itens.length > 0 && (
        <Tabela legenda="Agendamentos da clínica" chave={(a) => a.id} linhas={lista.data.itens} colunas={[
          { titulo: "Quando", celula: (a) => dataHora(a.vaga.inicio) },
          { titulo: "Paciente", celula: (a) => a.paciente_nome_exibicao ?? "—" },
          { titulo: "Especialidade", celula: (a) => rotuloEspecialidade(a.vaga.especialidade) },
          { titulo: "Estado", celula: (a) => <><Selo tom={a.estado === "cancelado" ? "aviso" : "padrao"}>{ESTADO[a.estado]}</Selo> <small>{DESFECHO[a.desfecho]}</small></> },
          { titulo: "Ações", celula: (a) => a.estado !== "agendado" ? "—" : (alvo?.a.id === a.id ? (
            alvo.acao === "falta" ? (
              <form className="pilha" onSubmit={(e) => { e.preventDefault(); falta.mutate(a); }}>
                <CampoTexto rotulo="Justificativa da falta" dica="Fica registrada e pode ser revista por outra pessoa da clínica." required minLength={5} maxLength={280}
                  value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
                <span className="linha">
                  <Botao type="submit" disabled={ocupado}>Registrar falta</Botao>
                  <Botao variante="outline" onClick={() => setAlvo(null)}>Voltar</Botao>
                </span>
              </form>
            ) : (
              <span className="linha">
                <Botao disabled={ocupado} onClick={() => (alvo.acao === "cancelar" ? cancelar : concluir).mutate(a)}>
                  {alvo.acao === "cancelar" ? "Confirmar cancelamento" : "Confirmar conclusão"}
                </Botao>
                <Botao variante="outline" onClick={() => setAlvo(null)}>Voltar</Botao>
              </span>
            )
          ) : (
            <span className="linha">
              <Botao variante="outline" onClick={() => setAlvo({ a, acao: "concluir" })}>Concluir</Botao>
              <Botao variante="outline" onClick={() => setAlvo({ a, acao: "cancelar" })}>Cancelar</Botao>
              {podeRegistrarFalta(a, funcao) && <Botao variante="outline" onClick={() => setAlvo({ a, acao: "falta" })}>Registrar falta</Botao>}
            </span>
          )) },
        ]} />
      )}
      <p className="hint">Cancelar não gera falta nem penalidade. Falta só é registrada por profissional, depois do horário, com justificativa e revisão. A falta confirmada entra no comparecimento do score do paciente; urgência avaliada continua passando na frente.</p>
    </>
  );
}
