import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TEXTO_EMERGENCIA } from "@uhealth/ui";
import { dataHora, mensagemDe, useSessao } from "@uhealth/api-client";
import { Btn, Linhas, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { useClinicasPorId } from "../pedidos/nomesClinicas";

/** Urgência (design C2). O texto de emergência (SAMU 192) é ESTÁTICO. Registrar o relato só avisa a clínica; não promete contato imediato. */
export function Urgencia() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const navegar = useNavigate();
  const clinicas = useClinicasPorId();
  const [params] = useSearchParams();
  const pedidoId = params.get("pedido");
  const [avisar, setAvisar] = useState(false);
  const relatos = useQuery({ queryKey: ["urgencias"], queryFn: () => api.dados(api.cliente.GET("/urgencias", {})) });
  const pedido = useQuery({
    queryKey: ["solicitacao", pedidoId], enabled: !!pedidoId,
    queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: pedidoId! } } })),
  });
  const registrar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/urgencias", { body: { solicitacao_id: pedidoId } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["urgencias"] }),
  });

  if (avisar) {
    const clinica = pedido.data ? clinicas.get(pedido.data.clinica_id) : undefined;
    return (
      <div className="d-tela">
        <main className="d-corpo" style={{ gap: 14 }}>
          <button type="button" className="d-voltar" onClick={() => setAvisar(false)}><Icone nome="voltar" tamanho={20} />Voltar</button>
          <h1 className="d-h1">Vamos avisar a clínica</h1>
          <div className="d-aviso d-aviso--ok">Um profissional da clínica avalia o seu pedido. Pedir como urgente <b>não reduz</b> a sua vez.</div>
          <Linhas itens={[...(clinica ? [["Clínica", clinica.nome] as [string, string]] : []), ["Marcado como", "Pedido urgente"]]} />
          <div className="d-aviso d-aviso--16" style={{ background: "var(--d-danger-bg)", color: "var(--d-danger-text)", fontSize: "calc(17px * var(--d-s))" }}>
            <b>Se piorar</b>, ligue 192 (SAMU). Não espere a resposta da clínica.
          </div>
          {registrar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(registrar.error)}</b></div>}
          {registrar.isSuccess && <div className="d-aviso d-aviso--ok" role="status"><b>Relato registrado.</b> A clínica vai avaliar. Ainda não é consulta marcada.</div>}
          <div className="d-fim">
            <Btn disabled={registrar.isPending || registrar.isSuccess} onClick={() => registrar.mutate()}>{registrar.isPending ? "Enviando…" : "Enviar pedido urgente"}</Btn>
            <p className="d-small" style={{ textAlign: "center" }}>Texto de exemplo. Precisa ser validado por profissional de saúde.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="d-tela">
      <main className="d-corpo" style={{ gap: 14 }}>
        <Voltar para={pedidoId ? `/pedidos/${pedidoId}` : "/clinicas"} />
        <h1 className="d-h1">Você precisa de ajuda urgente?</h1>
        <p className="d-p">Escolha o que mais se parece com o que você sente.</p>
        <section className="d-sinais" aria-labelledby="h-graves">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><Icone nome="alerta" tamanho={28} /><b id="h-graves">Sinais graves</b></div>
          <p><strong>Em risco agora? Ligue 192 (SAMU).</strong> {TEXTO_EMERGENCIA}</p>
          <a className="d-btn d-btn--danger" href="tel:192"><Icone nome="telefone" tamanho={22} />Ligar 192 (SAMU)</a>
        </section>
        <button type="button" className="d-bloco" onClick={() => setAvisar(true)}><b>Dor forte</b><br /><small>Mas consigo respirar e falar</small></button>
        <button type="button" className="d-bloco" onClick={() => navegar("/clinicas")}><b>Não é urgente</b><br /><small>Quero pedir atendimento normal</small></button>

        {relatos.isError && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(relatos.error)}</b></div>}
        {relatos.data && relatos.data.itens.length > 0 && (
          <section aria-labelledby="h-rel" style={{ display: "grid", gap: 10 }}>
            <h2 id="h-rel" className="d-h2">Meus relatos</h2>
            <ul className="d-lista" style={{ gap: 10 }}>
              {relatos.data.itens.map((r) => (
                <li key={r.id} className="d-card" style={{ gap: 6 }}>
                  <div className="d-chips"><span className={`d-chip${r.estado === "avaliada" ? "" : " d-chip--sun"}`}>{r.rotulo}</span></div>
                  <p className="d-small">Registrado em {dataHora(r.criado_em)}</p>
                  {r.avaliacao && <p className="d-small">Avaliação: {r.avaliacao.classificacao === "urgencia_confirmada" ? "urgência confirmada por profissional" : "sem urgência confirmada"}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="d-small" style={{ marginTop: "auto" }}>Em caso de dúvida, ligue 192.</p>
      </main>
    </div>
  );
}
