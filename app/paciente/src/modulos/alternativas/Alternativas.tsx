import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { CRITERIO_ALTERNATIVA, CUSTO, PUBLICO, mensagemDe, useSessao } from "@uhealth/api-client";
import { Btn, BtnLink } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { letraOuNome, nomeCurto, useClinicasPorId } from "../pedidos/nomesClinicas";

/** Alternativas (design P3). O paciente ESCOLHE a nova clínica; nada é enviado automaticamente. */
export function Alternativas() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const clinicas = useClinicasPorId();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const lista = useQuery({ queryKey: ["alternativas", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/alternativas", { params: { path: { solicitacao_id: id } } })) });
  const encaminhar = useMutation({
    mutationFn: (clinica_destino_id: string) => api.dados(api.cliente.POST("/solicitacoes/{solicitacao_id}/encaminhar", { params: { path: { solicitacao_id: id } }, body: { clinica_destino_id } })),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["solicitacoes"] }); navegar(`/pedidos/${r.solicitacao.id}`); },
  });
  const origem = pedido.data ? clinicas.get(pedido.data.clinica_id)?.nome ?? "A clínica" : "A clínica";
  const itens = lista.data?.itens ?? [];

  if (lista.data && itens.length === 0) {
    return (
      <div className="d-tela">
        <main className="d-corpo d-corpo--centro">
          <Ilustracao nome="semClinica" texto="Mapa com um ponto de interrogação" />
          <h1 className="d-h1">Nenhuma clínica pode receber agora</h1>
          <p className="d-p d-p--grande">Não encontramos outra clínica compatível agora. Seu pedido continua guardado.</p>
          <div className="d-fim">
            <BtnLink to={`/pedidos/${id}`}>Ver meu pedido</BtnLink>
            <BtnLink variante="outline" to="/clinicas">Ver outras clínicas</BtnLink>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="d-tela">
      <main className="d-corpo" style={{ padding: "28px 20px 20px" }}>
        <div className="d-aviso d-aviso--perigo" role="status"><Icone nome="naoRecebe" tamanho={28} /><b>{nomeCurto(origem)} não pode receber agora.</b></div>
        <h1 className="d-h1" style={{ lineHeight: 1.15 }}>Encontramos outras opções para você</h1>
        <p className="d-p">Nada é enviado sem a sua confirmação.</p>
        {lista.isPending && <p role="status" className="d-small">Carregando…</p>}
        {lista.isError && (
          <>
            <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(lista.error)}</b></div>
            <Btn onClick={() => void lista.refetch()}>Tentar de novo</Btn>
          </>
        )}
        {encaminhar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(encaminhar.error)}</b></div>}
        <ul className="d-lista" style={{ gap: 16 }}>
          {itens.map(({ clinica: c }, i) => (
            <li key={c.id}>
              <article className={`d-card${i === 0 ? " d-card--sel" : ""}`} aria-labelledby={`a-${c.id}`} style={i === 0 ? undefined : { gap: 8 }}>
                <div className="d-card-topo"><h2 id={`a-${c.id}`} className="d-h2">{c.nome}</h2></div>
                {i === 0 ? (
                  <>
                    <div className="d-aviso d-aviso--ok d-aviso--pequeno"><b>Por que ela?</b> Ela {lista.data!.criterios.map((k) => CRITERIO_ALTERNATIVA[k] ?? k).join("; ")}.</div>
                    {c.custo_informado !== "gratuito" && <p className="d-small">Custo não informado. Confirme antes de se deslocar.</p>}
                    <Btn compacto disabled={encaminhar.isPending} onClick={() => encaminhar.mutate(c.id)}>
                      {encaminhar.isPending && encaminhar.variables === c.id ? "Enviando…" : `Enviar meu pedido para ${letraOuNome(c.nome)}`}
                    </Btn>
                  </>
                ) : (
                  <>
                    <p className="d-small">Recebendo pedidos · {CUSTO[c.custo_informado]} · {c.publico.map((p) => PUBLICO[p]).join(", ")}</p>
                    <Btn variante="outline" className="d-btn--sm" disabled={encaminhar.isPending} onClick={() => encaminhar.mutate(c.id)}>
                      {encaminhar.isPending && encaminhar.variables === c.id ? "Enviando…" : `Enviar meu pedido para ${letraOuNome(c.nome)}`}
                    </Btn>
                  </>
                )}
              </article>
            </li>
          ))}
        </ul>
        <div className="d-fim"><BtnLink variante="link" to={`/pedidos/${id}`}>Agora não, quero esperar</BtnLink></div>
      </main>
    </div>
  );
}
