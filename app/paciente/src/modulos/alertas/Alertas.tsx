import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { mensagemDe, rotuloEspecialidade, useSessao, type Alerta } from "@uhealth/api-client";
import { Btn, BtnLink, Chip, LinhaSamu, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { quando } from "../../design/datas";
import { nomeCurto } from "../pedidos/nomesClinicas";

/** Estados em que o pedido ainda pode usar uma vaga (os mesmos da tela "Ver vagas desta clínica"). */
const ATIVOS = ["enviada", "em_analise", "precisa_contato", "aguardando_confirmacao"];

/** Atalho do topo (sino) com a contagem de avisos não lidos (GET /notificacoes). */
export function AtalhoAlertas() {
  const { api } = useSessao();
  const avisos = useQuery({ queryKey: ["notificacoes"], queryFn: () => api.dados(api.cliente.GET("/notificacoes", {})) });
  const novos = avisos.data?.nao_lidas ?? 0;
  const rotulo = novos > 0 ? `Avisos: ${novos === 1 ? "1 novo" : `${novos} novos`}` : "Avisos";
  return (
    <Link className="d-quad" to="/avisos" aria-label={rotulo}>
      <Icone nome="aviso" tamanho={18} />
      {novos > 0 && <span className="d-badge" aria-hidden="true">{novos > 9 ? "9+" : novos}</span>}
    </Link>
  );
}

/** Uma caixa de opção do design (rádio/caixa visível), usada nas preferências. */
function Opcao({ marcado, aoMudar, children, desabilitado }: { marcado: boolean; aoMudar: (v: boolean) => void; children: string; desabilitado?: boolean }) {
  return (
    <label className={`d-op d-op--m${marcado ? " d-op--on" : ""}`}>
      <input type="checkbox" checked={marcado} disabled={desabilitado} onChange={(e) => aoMudar(e.target.checked)} />
      {children}
    </label>
  );
}

/** Alertas de vaga: preferência, lista e "marcar como lido". Alerta não é reserva e não há push. */
export function Alertas() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const alertas = useQuery({ queryKey: ["alertas"], queryFn: () => api.dados(api.cliente.GET("/alertas", {})) });
  const preferencia = useQuery({ queryKey: ["alertas", "preferencia"], queryFn: () => api.dados(api.cliente.GET("/alertas/preferencia", {})) });
  const pedidos = useQuery({ queryKey: ["solicitacoes"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes", {})) });

  const salvar = useMutation({
    mutationFn: (corpo: { receber: boolean; ligacao: boolean }) => api.dados(api.cliente.PUT("/alertas/preferencia", { body: corpo })),
    onSuccess: (dados) => qc.setQueryData(["alertas", "preferencia"], dados),
  });
  const lido = useMutation({
    mutationFn: (id: string) => api.dados(api.cliente.POST("/alertas/{alerta_id}/lido", { params: { path: { alerta_id: id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alertas"] }),
  });

  /** Pedido ativo nesta clínica, para abrir as vagas do pedido certo. */
  const pedidoDa = (a: Alerta) => pedidos.data?.itens.find((p) => p.clinica_id === a.clinica_id && p.especialidade === a.especialidade && ATIVOS.includes(p.estado));

  if (alertas.isPending || preferencia.isPending) return <div className="d-tela"><main className="d-corpo"><p role="status" className="d-small">Carregando…</p></main></div>;
  if (alertas.isError || preferencia.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para="/clinicas">Buscar</Voltar>
        <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(alertas.error ?? preferencia.error)}</b></div>
        <Btn onClick={() => { void alertas.refetch(); void preferencia.refetch(); }}>Tentar de novo</Btn>
      </main></div>
    );
  }
  const pref = preferencia.data;
  const itens = [...alertas.data.itens].sort((a, b) => Number(a.lido) - Number(b.lido) || b.criado_em.localeCompare(a.criado_em));

  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para="/clinicas">Buscar</Voltar>
        <h1 className="d-h1 d-h1--30">Alertas de vaga</h1>
        <div className="d-aviso d-aviso--pequeno">{alertas.data.aviso}</div>

        <fieldset className="d-campos">
          <legend>Como quer ser avisado</legend>
          <Opcao marcado={pref.receber} desabilitado={salvar.isPending} aoMudar={(v) => salvar.mutate({ receber: v, ligacao: v && pref.ligacao })}>
            Avisar aqui no app quando abrir vaga
          </Opcao>
          <Opcao marcado={pref.ligacao} desabilitado={salvar.isPending || !pref.receber} aoMudar={(v) => salvar.mutate({ receber: pref.receber, ligacao: v })}>
            Também prefiro contato por ligação
          </Opcao>
          <p className="d-small">É só uma preferência para a clínica. Não há ligação automática.</p>
          {salvar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(salvar.error)}</b></div>}
          {salvar.isSuccess && <p role="status" className="d-small">Preferência salva.</p>}
        </fieldset>

        {itens.length === 0 ? (
          <div className="d-corpo--centro" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 0 }}>
            <Ilustracao nome="vagaPreenchida" texto="Relógio com o sol se pondo" />
            <p className="d-p d-p--grande">Nenhum alerta por enquanto. Quando uma clínica do seu pedido abrir vaga, ele aparece aqui.</p>
          </div>
        ) : (
          <ul className="d-lista" aria-label="Alertas">
            {itens.map((a) => {
              const pedido = pedidoDa(a);
              return (
                <li key={a.id}>
                  <article className={`d-card${a.lido ? "" : " d-card--sel"}`} aria-labelledby={`a-${a.id}`}>
                    <div className="d-chips">
                      {a.lido ? <Chip tom="neutral">Lido</Chip> : <Chip tom="sun" icone="vaga">Surgiu uma vaga</Chip>}
                    </div>
                    <h2 id={`a-${a.id}`} className="d-h2">{nomeCurto(a.clinica_nome)}</h2>
                    <p className="d-small">{rotuloEspecialidade(a.especialidade)} · {quando(a.inicio)}</p>
                    <p className="d-small"><b>Ainda não é reserva. A clínica confirma.</b></p>
                    {pedido
                      ? <BtnLink compacto to={`/pedidos/${pedido.id}/vagas`}>Ver vaga</BtnLink>
                      : <p className="d-small">Você não tem pedido ativo nesta clínica.</p>}
                    {!a.lido && (
                      <Btn variante="outline" compacto disabled={lido.isPending} onClick={() => lido.mutate(a.id)}>Marcar como lido</Btn>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        {lido.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(lido.error)}</b></div>}
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}
