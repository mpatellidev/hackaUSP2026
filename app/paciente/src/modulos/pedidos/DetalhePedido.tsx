import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Aviso, Cartao, Carregando, Erro, Selo } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { useClinicasPorId } from "./nomesClinicas";

const COM_VAGAS = ["enviada", "em_analise", "precisa_contato", "aguardando_confirmacao"];

export function DetalhePedido() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const clinicas = useClinicasPorId();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const eventos = useQuery({ queryKey: ["solicitacao", id, "eventos"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/eventos", { params: { path: { solicitacao_id: id } } })) });

  if (pedido.isPending) return <Carregando />;
  if (pedido.isError) return <Erro mensagem={mensagemDe(pedido.error)} aoTentar={() => pedido.refetch()} />;
  const p = pedido.data;
  const estado = ESTADO_PEDIDO[p.estado];
  const clinica = clinicas.get(p.clinica_id);

  return (
    <>
      <Link className="voltar" to="/pedidos">← Meus pedidos</Link>
      <h1>{rotuloEspecialidade(p.especialidade)}</h1>
      <p>{clinica?.nome ?? "Clínica"}{clinica && <> · <a href={`tel:${clinica.telefone.replace(/\D/g, "")}`}>{clinica.telefone}</a> (fictício)</>}</p>
      <Selo tom={estado.tom}>{estado.rotulo}</Selo>
      <Aviso>{estado.explica}</Aviso>
      <p>Seu pedido: “{p.descricao_administrativa}”</p>

      <div className="pilha">
        {p.estado === "indisponivel" && <Link className="btn btn--primary btn--block" to={`/pedidos/${p.id}/alternativas`}>Ver outras clínicas</Link>}
        {COM_VAGAS.includes(p.estado) && <Link className="btn btn--outline btn--block" to={`/pedidos/${p.id}/vagas`}>Ver vagas desta clínica</Link>}
        {p.estado === "agendada" && <Link className="btn btn--primary btn--block" to="/agenda">Ver na agenda</Link>}
        {p.estado !== "concluida" && <Link className="btn btn--outline btn--block" to={`/urgencia?pedido=${p.id}`}>Estou com uma urgência</Link>}
      </div>

      <Cartao aria-labelledby="h-hist">
        <h2 id="h-hist">Histórico</h2>
        {eventos.isPending && <Carregando />}
        {eventos.isError && <Erro mensagem={mensagemDe(eventos.error)} />}
        <ol className="timeline">
          {eventos.data?.itens.map((e) => (
            <li key={e.id}>
              <time dateTime={e.criado_em}>{dataHora(e.criado_em)}</time>
              {e.estado_novo ? ESTADO_PEDIDO[e.estado_novo].rotulo : "Registro"}{e.motivo ? ` — ${e.motivo}` : ""}
            </li>
          ))}
        </ol>
      </Cartao>
    </>
  );
}
