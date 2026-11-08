import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ESTADO_PEDIDO, mensagemDe, useSessao, type EventoSolicitacao } from "@uhealth/api-client";
import { Btn, LinhaSamu, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { quando } from "../../design/datas";

/** Texto de cada evento, só com o que o backend registrou (nada é inferido). Também usado pela conversa guiada. */
export function descreverEvento(e: EventoSolicitacao): string {
  switch (e.tipo) {
    case "criada": return "Solicitação enviada";
    case "encaminhamento_escolhido": return "Você escolheu enviar o pedido para outra clínica";
    case "interesse_registrado": return "Você demonstrou interesse em uma vaga";
    case "confirmacao": return "A clínica confirmou o horário";
    case "transicao": return e.estado_novo ? ESTADO_PEDIDO[e.estado_novo].rotulo : "O pedido mudou de etapa";
  }
}

/** Histórico do pedido (design: linha do tempo com `<time datetime>`). GET /solicitacoes/{id}/eventos. */
export function Historico() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const eventos = useQuery({
    queryKey: ["solicitacao", id, "eventos"],
    queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/eventos", { params: { path: { solicitacao_id: id } } })),
  });

  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para={`/pedidos/${id}`}>Meu pedido</Voltar>
        <h1 className="d-h1 d-h1--30">Histórico do pedido</h1>
        {eventos.isPending && <p role="status" className="d-small">Carregando…</p>}
        {eventos.isError && (
          <>
            <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(eventos.error)}</b></div>
            <Btn onClick={() => void eventos.refetch()}>Tentar de novo</Btn>
          </>
        )}
        {eventos.data && eventos.data.itens.length === 0 && <p className="d-p d-p--grande">Ainda não há registros neste pedido.</p>}
        {eventos.data && eventos.data.itens.length > 0 && (
          <ol className="d-tempo" aria-label="Histórico do pedido">
            {[...eventos.data.itens].sort((a, b) => a.criado_em.localeCompare(b.criado_em)).map((e) => (
              <li key={e.id} className="d-tempo-item">
                <time dateTime={e.criado_em}>{quando(e.criado_em)}</time>
                <b>{descreverEvento(e)}</b>
                <span className="d-small">{e.autor_papel === "paciente" ? "Por você" : "Pela clínica"}</span>
                {e.motivo && <span className="d-small">Motivo: {e.motivo}</span>}
              </li>
            ))}
          </ol>
        )}
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}
