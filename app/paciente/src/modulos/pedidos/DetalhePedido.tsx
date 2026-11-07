import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { Aviso, Cartao, Carregando, Erro, Selo } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Etapas } from "../../design/Etapas";
import { Icone } from "../../design/Icone";
import { useClinicasPorId } from "./nomesClinicas";

const ETAPAS = ["Solicitação enviada", "Em análise pela clínica", "Triagem ou contato", "Horário confirmado", "Atendimento realizado"];
/** Etapa atual do roteiro, derivada só do estado que o backend devolveu (nada é inferido). */
const ETAPA_ATUAL: Record<string, number> = { enviada: 1, em_analise: 1, precisa_contato: 2, aguardando_confirmacao: 2, agendada: 3, concluida: 5, indisponivel: 1 };

const COM_VAGAS = ["enviada", "em_analise", "precisa_contato", "aguardando_confirmacao"];

export function DetalhePedido() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const clinicas = useClinicasPorId();
  const recemEnviado = (useLocation().state as { acabouDeEnviar?: boolean } | null)?.acabouDeEnviar === true;
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const eventos = useQuery({ queryKey: ["solicitacao", id, "eventos"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/eventos", { params: { path: { solicitacao_id: id } } })) });

  if (pedido.isPending) return <Carregando />;
  if (pedido.isError) return <Erro mensagem={mensagemDe(pedido.error)} aoTentar={() => pedido.refetch()} />;
  const p = pedido.data;
  const estado = ESTADO_PEDIDO[p.estado];
  const clinica = clinicas.get(p.clinica_id);

  return (
    <>
      <Link className="voltar" to="/pedidos"><Icone nome="voltar" tamanho={20} /> Meus pedidos</Link>
      {recemEnviado && <Aviso tom="info"><span><strong>Pedido enviado. A clínica vai analisar.</strong> Ainda não é consulta marcada.</span></Aviso>}
      <h1>{rotuloEspecialidade(p.especialidade)}</h1>
      <p>{clinica?.nome ?? "Clínica"}{clinica && <> · <a href={`tel:${clinica.telefone.replace(/\D/g, "")}`}>{clinica.telefone}</a> (fictício)</>}</p>
      <Selo tom={estado.tom}>{estado.rotulo}</Selo>
      <Aviso tom={p.estado === "indisponivel" ? "perigo" : "info"}>{p.estado === "indisponivel" ? <span className="com-icone"><Icone nome="naoRecebe" tamanho={20} /> {clinica?.nome ?? "Clínica"} não pode receber agora.</span> : estado.explica}</Aviso>
      {p.estado !== "indisponivel" && (
        <Cartao aria-labelledby="h-etapas">
          <h2 id="h-etapas">Etapas</h2>
          <Etapas etapas={ETAPAS} atual={ETAPA_ATUAL[p.estado] ?? 1} detalhes={{ 0: dataHora(p.criado_em) }} />
        </Cartao>
      )}
      <p>Seu pedido: “{p.descricao_administrativa}”</p>

      <div className="pilha">
        {p.estado === "indisponivel" && <Link className="btn btn--primary btn--block" to={`/pedidos/${p.id}/alternativas`}>Ver outras clínicas</Link>}
        {COM_VAGAS.includes(p.estado) && <Link className="btn btn--outline btn--block" to={`/pedidos/${p.id}/vagas`}>Ver vagas desta clínica</Link>}
        {p.estado === "agendada" && <Link className="btn btn--primary btn--block" to="/agenda">Ver na agenda</Link>}
        {clinica && <a className="btn btn--outline btn--block com-icone" href={`tel:${clinica.telefone.replace(/\D/g, "")}`}><Icone nome="telefone" tamanho={20} /> Ligar para a clínica</a>}
        {p.estado !== "concluida" && <Link className="btn btn--outline btn--block" to={`/urgencia?pedido=${p.id}`}>Estou com uma urgência</Link>}
        <p className="hint">Caso grave? Ligue 192 (SAMU).</p>
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
