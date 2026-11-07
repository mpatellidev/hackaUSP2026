import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Cartao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { useClinicasPorId } from "./nomesClinicas";

export function ListaPedidos() {
  const { api } = useSessao();
  const clinicas = useClinicasPorId();
  const pedidos = useQuery({ queryKey: ["solicitacoes"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes", {})) });

  return (
    <>
      <h1>Meus pedidos</h1>
      {pedidos.isPending && <Carregando />}
      {pedidos.isError && <Erro mensagem={mensagemDe(pedidos.error)} aoTentar={() => pedidos.refetch()} />}
      {pedidos.data && pedidos.data.itens.length === 0 && <Vazio>Você ainda não enviou pedidos. Comece escolhendo uma clínica.</Vazio>}
      <ul className="lista-cartoes">
        {pedidos.data?.itens.map((p) => (
          <li key={p.id}>
            <Cartao>
              <h2>{rotuloEspecialidade(p.especialidade)}</h2>
              <p>{clinicas.get(p.clinica_id)?.nome ?? "Clínica"} · enviado em {dataHora(p.criado_em)}</p>
              <Selo tom={ESTADO_PEDIDO[p.estado].tom}>{ESTADO_PEDIDO[p.estado].rotulo}</Selo>
              <p><Link to={`/pedidos/${p.id}`}>Ver detalhes</Link></p>
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}
