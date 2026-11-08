import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ESTADO_PEDIDO, mensagemDe, useSessao } from "@uhealth/api-client";
import { quando } from "../../design/datas";
import { BotaoOuvir } from "../../design/Preferencias";
import { Btn, BtnLink, BtnTel, LinhaSamu, TelaCarregando, Voltar } from "../../design/Componentes";
import { Etapas } from "../../design/Etapas";
import { Icone } from "../../design/Icone";
import { nomeCurto, useClinicasPorId } from "./nomesClinicas";

const ETAPAS = ["Solicitação enviada", "Em análise pela clínica", "Triagem ou contato", "Horário confirmado", "Atendimento realizado"];
/** Etapa atual, derivada só do estado que o backend devolveu (nada é inferido). */
const ETAPA_ATUAL: Record<string, number> = { enviada: 1, em_analise: 1, precisa_contato: 2, aguardando_confirmacao: 2, agendada: 3, concluida: 5, indisponivel: 1 };
const TITULO: Record<string, string> = {
  enviada: "Seu pedido foi enviado", em_analise: "Seu pedido está em análise", precisa_contato: "A clínica quer falar com você",
  indisponivel: "A clínica não pode receber agora", aguardando_confirmacao: "Aguardando a confirmação da clínica",
  agendada: "Seu horário foi confirmado", concluida: "Atendimento concluído",
};
/** Avisos do design (P2) para os estados que ele mostra; os demais usam o texto padrão do app. */
const AVISO: Record<string, [string, string]> = { enviada: ["Pedido enviado.", "A clínica vai analisar."] };
const COM_VAGAS = ["enviada", "em_analise", "precisa_contato", "aguardando_confirmacao"];

/** Acompanhar pedido (design P2). */
export function DetalhePedido() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const clinicas = useClinicasPorId();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });

  if (pedido.isPending) return <TelaCarregando />;
  if (pedido.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para="/pedidos">Meu pedido</Voltar>
        <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(pedido.error)}</b></div>
        <Btn onClick={() => void pedido.refetch()}>Tentar de novo</Btn>
      </main></div>
    );
  }
  const p = pedido.data;
  const estado = ESTADO_PEDIDO[p.estado];
  const clinica = clinicas.get(p.clinica_id);
  const recusado = p.estado === "indisponivel";

  return (
    <div className="d-tela">
      <main className="d-corpo" style={{ paddingBottom: 12 }}>
        <p className="d-small">Pedido para {clinica?.nome ?? "a clínica"}</p>
        <h1 className="d-h1 d-h1--30">{TITULO[p.estado]}</h1>
        {recusado
          ? <div className="d-aviso d-aviso--perigo" role="status"><Icone nome="naoRecebe" tamanho={24} /><b>{nomeCurto(clinica?.nome ?? "A clínica")} não pode receber agora.</b></div>
          : <div className="d-aviso"><b>{(AVISO[p.estado] ?? [`${estado.rotulo}.`, estado.explica])[0]}</b> {(AVISO[p.estado] ?? [`${estado.rotulo}.`, estado.explica])[1]}</div>}
        {!recusado && <Etapas etapas={ETAPAS} atual={ETAPA_ATUAL[p.estado] ?? 1} detalhes={{ 0: quando(p.criado_em) }} />}
        <div className="d-fim">
          {recusado && <BtnLink to={`/pedidos/${p.id}/alternativas`}>Ver outras clínicas</BtnLink>}
          {COM_VAGAS.includes(p.estado) && <BtnLink variante="outline" to={`/pedidos/${p.id}/vagas`}>Ver vagas desta clínica</BtnLink>}
          {p.estado === "agendada" && <BtnLink to="/agenda">Ver horário confirmado</BtnLink>}
          {p.estado === "concluida" && <BtnLink to={`/pedidos/${p.id}/avaliar`}>Avaliar a clínica</BtnLink>}
          <div className="d-linhaBtn">
            <BotaoOuvir />
            {clinica && <BtnTel numero={clinica.telefone}>Ligar para a clínica</BtnTel>}
          </div>
          <BtnLink variante="link" to={`/pedidos/${p.id}/historico`}>Ver histórico do pedido</BtnLink>
          {p.estado !== "concluida" && <BtnLink variante="link" to={`/urgencia?pedido=${p.id}`}>Estou com uma urgência</BtnLink>}
          <LinhaSamu />
        </div>
      </main>
    </div>
  );
}
