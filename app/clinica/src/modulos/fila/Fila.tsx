import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Aviso, Carregando, Erro, Selo, Tabela, Vazio } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao, type EstadoSolicitacao } from "@uhealth/api-client";
import { useClinicaAtual } from "../clinicaAtual";

/** Fila EXPLICÁVEL: urgência avaliada por profissional vem sempre antes do score. É sugestão; a decisão é humana. */
export function Fila() {
  const { api } = useSessao();
  const { clinicaId } = useClinicaAtual();
  const fila = useQuery({ queryKey: ["fila", clinicaId], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/fila", { params: { path: { clinica_id: clinicaId } } })) });

  return (
    <>
      <h1>Fila sugerida</h1>
      {fila.isPending && <Carregando />}
      {fila.isError && <Erro mensagem={mensagemDe(fila.error)} aoTentar={() => fila.refetch()} />}
      {fila.data && (
        <>
          <Aviso>{fila.data.aviso}</Aviso>
          <p className="hint">Ordem sugerida: urgência avaliada por profissional primeiro, depois pontuação, depois a data do pedido.{fila.data.fontes_demo ? " Pontuação calculada com dados de demonstração." : ""}</p>
          {fila.data.itens.length === 0 && <Vazio>Nenhum pedido ativo na fila.</Vazio>}
          {fila.data.itens.length > 0 && (
            <Tabela legenda="Fila de pedidos ativos" chave={(i) => i.solicitacao_id} linhas={fila.data.itens} colunas={[
              { titulo: "#", celula: (i) => i.posicao },
              { titulo: "Paciente", celula: (i) => i.paciente_nome_exibicao },
              { titulo: "Pedido", celula: (i) => <>{rotuloEspecialidade(i.especialidade)} · {ESTADO_PEDIDO[i.estado as EstadoSolicitacao]?.rotulo ?? i.estado}<br /><small>{dataHora(i.criado_em)}</small></> },
              { titulo: "Urgência", celula: (i) => i.urgencia_avaliada ? <Selo tom="perigo">Urgência avaliada</Selo> : "—" },
              { titulo: "Pontuação", celula: (i) => (
                <details>
                  <summary>{i.score.toFixed(1)} · detalhes</summary>
                  <ul>
                    {i.componentes.map((c) => <li key={c.nome}>{c.nome.replace(/_/g, " ")}: {c.valor ?? "desconhecido (vale 0)"} × peso {c.peso}</li>)}
                    {i.sinalizacoes.map((s) => <li key={s}><em>{s}</em></li>)}
                  </ul>
                </details>) },
              { titulo: "Ações", celula: (i) => <Link to={`/pedidos/${i.solicitacao_id}`}>Abrir</Link> },
            ]} />
          )}
        </>
      )}
    </>
  );
}
