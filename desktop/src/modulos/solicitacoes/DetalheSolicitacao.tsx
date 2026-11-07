import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { solicitacoesApi } from "../../api/solicitacoes";
import { ROTULO_ESTADO, type EventoSolicitacao, type Solicitacao } from "../../api/tipos";
import { Carregando, ChipEstado, Erro } from "../../componentes/Estados";
import { dataHora, diasDesde, rotuloDias } from "../../formato";
import { MudarEstado } from "./MudarEstado";

export default function DetalheSolicitacao() {
  const { id = "" } = useParams();
  const [pedido, setPedido] = useState<Solicitacao | null>(null);
  const [eventos, setEventos] = useState<EventoSolicitacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [p, e] = await Promise.all([solicitacoesApi.obter(id), solicitacoesApi.eventos(id)]);
      setPedido(p); setEventos(e);
    } catch (x) { setErro((x as Error).message); }
  }, [id]);
  useEffect(() => { setPedido(null); void carregar(); }, [carregar]);

  async function aoMudar(novo: Solicitacao) {
    setPedido(novo);
    setAviso(`Situação alterada para “${ROTULO_ESTADO[novo.estado]}”.`);
    setEventos(await solicitacoesApi.eventos(id).catch(() => eventos)); // histórico atualizado pelo servidor
  }

  return (
    <section aria-labelledby="t-det">
      <p><Link to="/solicitacoes">← Voltar às solicitações</Link></p>
      {erro && <Erro mensagem={erro} aoTentar={() => void carregar()} />}
      {!erro && !pedido && <Carregando texto="Carregando pedido…" />}
      {pedido && (
        <div className="card" style={{ display: "grid", gap: "var(--uh-space-4)" }}>
          <h1 id="t-det">Pedido de {pedido.paciente_nome_exibicao ?? "paciente"}</h1>
          <dl className="dados">
            <dt>Situação</dt><dd><ChipEstado estado={pedido.estado} /></dd>
            <dt>Especialidade</dt><dd>{pedido.especialidade.replaceAll("_", " ")}</dd>
            <dt>Tempo de espera</dt><dd>{rotuloDias(diasDesde(pedido.criado_em))}</dd>
            <dt>Descrição administrativa</dt><dd>{pedido.descricao_administrativa}</dd>
            {pedido.solicitacao_origem_id && (<><dt>Origem</dt><dd>Encaminhado por escolha do paciente</dd></>)}
          </dl>
          <p className="nota">Sem dados clínicos neste painel. A avaliação clínica é sempre de profissional.</p>
          <div role="status" aria-live="polite" className="sr-only">{aviso}</div>
          {aviso && <div className="notice notice--info"><div>{aviso}</div></div>}
          <MudarEstado pedido={pedido} aoMudar={(s) => void aoMudar(s)} />
          <h2>Histórico</h2>
          <ol className="timeline">
            {eventos.map((e) => (
              <li key={e.id}>
                <time dateTime={e.criado_em}>{dataHora(e.criado_em)}</time>
                {e.tipo === "criada" ? "Pedido enviado" : `${e.estado_anterior ? ROTULO_ESTADO[e.estado_anterior] : "—"} → ${e.estado_novo ? ROTULO_ESTADO[e.estado_novo] : "—"}`}
                {" "}<span className="nota">({e.autor_papel === "paciente" ? "paciente" : "equipe da clínica"})</span>
                {e.motivo && <div className="nota">Motivo: {e.motivo}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
