import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Aviso, CampoSelecao, Carregando, Erro, Selo, Tabela, Vazio } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao, type EstadoSolicitacao } from "@uhealth/api-client";

export function ListaPedidos() {
  const { api } = useSessao();
  const [estado, setEstado] = useState<EstadoSolicitacao | "">("");
  const pedidos = useQuery({
    queryKey: ["solicitacoes", estado],
    queryFn: () => api.dados(api.cliente.GET("/solicitacoes", { params: { query: { estado: estado || undefined } } })),
  });

  return (
    <>
      <h1>Pedidos</h1>
      <Aviso>A priorização clínica é sempre humana. Para ver a ordem sugerida (urgência avaliada primeiro), abra a Fila.</Aviso>
      <CampoSelecao rotulo="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoSolicitacao | "")}>
        <option value="">Todos</option>
        {Object.entries(ESTADO_PEDIDO).map(([valor, { rotulo }]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </CampoSelecao>
      {pedidos.isPending && <Carregando />}
      {pedidos.isError && <Erro mensagem={mensagemDe(pedidos.error)} aoTentar={() => pedidos.refetch()} />}
      {pedidos.data && pedidos.data.itens.length === 0 && <Vazio>Nenhum pedido neste filtro.</Vazio>}
      {pedidos.data && pedidos.data.itens.length > 0 && (
        <Tabela legenda="Pedidos da clínica" chave={(p) => p.id} linhas={pedidos.data.itens} colunas={[
          { titulo: "Especialidade", celula: (p) => rotuloEspecialidade(p.especialidade) },
          { titulo: "Estado", celula: (p) => <Selo tom={ESTADO_PEDIDO[p.estado].tom}>{ESTADO_PEDIDO[p.estado].rotulo}</Selo> },
          { titulo: "Recebido em", celula: (p) => dataHora(p.criado_em) },
          { titulo: "Motivo", celula: (p) => p.descricao_administrativa },
          { titulo: "Ações", celula: (p) => <Link to={`/pedidos/${p.id}`}>Abrir</Link> },
        ]} />
      )}
    </>
  );
}
