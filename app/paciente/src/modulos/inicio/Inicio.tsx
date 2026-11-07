import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Cartao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao, useUsuario } from "@uhealth/api-client";

export function Inicio() {
  const usuario = useUsuario();
  const { api } = useSessao();
  const pedidos = useQuery({ queryKey: ["solicitacoes"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes", {})) });
  const agenda = useQuery({ queryKey: ["agendamentos"], queryFn: () => api.dados(api.cliente.GET("/agendamentos", {})) });

  const proximo = agenda.data?.itens.filter((a) => a.estado === "agendado").sort((a, b) => a.vaga.inicio.localeCompare(b.vaga.inicio))[0];
  const ativos = pedidos.data?.itens.filter((p) => p.estado !== "concluida") ?? [];

  return (
    <>
      <h1>Olá, {usuario.nome_exibicao}</h1>
      <div className="linha">
        <Link className="btn btn--primary" to="/clinicas">Encontrar uma clínica</Link>
        <Link className="btn btn--outline" to="/urgencia">Estou com uma urgência</Link>
      </div>

      <section className="pilha" aria-labelledby="h-prox">
        <h2 id="h-prox">Próximo atendimento</h2>
        {agenda.isPending && <Carregando />}
        {agenda.isError && <Erro mensagem={mensagemDe(agenda.error)} aoTentar={() => agenda.refetch()} />}
        {agenda.data && !proximo && <Vazio>Você ainda não tem atendimento confirmado.</Vazio>}
        {proximo && (
          <Cartao selecionado>
            <p><strong>{rotuloEspecialidade(proximo.vaga.especialidade)}</strong> · {proximo.clinica.nome}</p>
            <p>{dataHora(proximo.vaga.inicio)}</p>
            <Link to="/agenda">Ver na agenda</Link>
          </Cartao>
        )}
      </section>

      <section className="pilha" aria-labelledby="h-ped">
        <h2 id="h-ped">Meus pedidos</h2>
        {pedidos.isPending && <Carregando />}
        {pedidos.isError && <Erro mensagem={mensagemDe(pedidos.error)} aoTentar={() => pedidos.refetch()} />}
        {pedidos.data && ativos.length === 0 && <Vazio>Nenhum pedido em andamento.</Vazio>}
        <ul className="lista-cartoes">
          {ativos.map((p) => (
            <li key={p.id}>
              <Cartao>
                <p><strong>{rotuloEspecialidade(p.especialidade)}</strong></p>
                <Selo tom={ESTADO_PEDIDO[p.estado].tom}>{ESTADO_PEDIDO[p.estado].rotulo}</Selo>
                <p><Link to={`/pedidos/${p.id}`}>Ver detalhes</Link></p>
              </Cartao>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
