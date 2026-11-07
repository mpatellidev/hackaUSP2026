import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Aviso, Botao, Cartao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";

const ROTULO = { agendado: "Agendado", concluido: "Concluído", cancelado: "Cancelado" } as const;

export function Agenda() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [cancelando, setCancelando] = useState<string | null>(null);
  const lista = useQuery({ queryKey: ["agendamentos"], queryFn: () => api.dados(api.cliente.GET("/agendamentos", {})) });
  const cancelar = useMutation({
    mutationFn: (id: string) => api.dados(api.cliente.POST("/agendamentos/{agendamento_id}/cancelar", { params: { path: { agendamento_id: id } }, body: {} })),
    onSuccess: () => { setCancelando(null); return Promise.all([qc.invalidateQueries({ queryKey: ["agendamentos"] }), qc.invalidateQueries({ queryKey: ["solicitacoes"] })]); },
  });

  return (
    <>
      <h1>Minha agenda</h1>
      {lista.isPending && <Carregando />}
      {lista.isError && <Erro mensagem={mensagemDe(lista.error)} aoTentar={() => lista.refetch()} />}
      {lista.data && lista.data.itens.length === 0 && <Vazio>Você ainda não tem atendimento confirmado pela clínica.</Vazio>}
      <ul className="lista-cartoes">
        {lista.data?.itens.map((a) => (
          <li key={a.id}>
            <Cartao>
              <h2>{rotuloEspecialidade(a.vaga.especialidade)}</h2>
              <p>{a.clinica.nome} · {dataHora(a.vaga.inicio)}</p>
              <Selo tom={a.estado === "cancelado" ? "aviso" : "padrao"}>{ROTULO[a.estado]}</Selo>
              {a.estado === "agendado" && (cancelando === a.id ? (
                <div className="pilha">
                  <Aviso>Cancelar antes do horário não gera falta nem penalidade. Seu pedido volta para análise da clínica.</Aviso>
                  {cancelar.isError && <Aviso tom="perigo">{mensagemDe(cancelar.error)}</Aviso>}
                  <Botao bloco disabled={cancelar.isPending} onClick={() => cancelar.mutate(a.id)}>Cancelar este atendimento</Botao>
                  <Botao variante="outline" bloco onClick={() => setCancelando(null)}>Manter</Botao>
                </div>
              ) : (
                <Botao variante="outline" bloco onClick={() => setCancelando(a.id)}>Cancelar</Botao>
              ))}
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}
