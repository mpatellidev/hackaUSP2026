import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { mensagemDe, useSessao } from "@uhealth/api-client";
import { Btn, BtnLink, LinhaSamu, TelaCarregando, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { useClinicasPorId } from "../pedidos/nomesClinicas";

const NOTAS: [number, string][] = [[1, "Muito ruim"], [2, "Ruim"], [3, "Regular"], [4, "Bom"], [5, "Muito bom"]];
const MAX_COMENTARIO = 280;

function Formulario({ pedidoId, notaInicial, comentarioInicial, jaAvaliado }: { pedidoId: string; notaInicial: number | null; comentarioInicial: string; jaAvaliado: boolean }) {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [nota, setNota] = useState<number | null>(notaInicial);
  const [comentario, setComentario] = useState(comentarioInicial);
  const enviar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/avaliacoes", { body: { solicitacao_id: pedidoId, nota: nota!, comentario: comentario.trim() || null } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avaliacoes"] }),
  });
  const aoEnviar = (e: FormEvent) => { e.preventDefault(); if (nota) enviar.mutate(); };

  if (enviar.isSuccess) {
    return (
      <>
        <div className="d-aviso d-aviso--ok" role="status"><b>Obrigado pela avaliação.</b> Ela ajuda outras pessoas a escolher. Você pode mudar quando quiser.</div>
        <div className="d-fim">
          <BtnLink to={`/pedidos/${pedidoId}`}>Voltar ao pedido</BtnLink>
          <Btn variante="outline" onClick={() => enviar.reset()}>Mudar minha avaliação</Btn>
        </div>
      </>
    );
  }

  return (
    <form className="d-corpo" style={{ padding: 0 }} onSubmit={aoEnviar} noValidate>
      <fieldset className="d-campos">
        <legend>Como foi o atendimento?</legend>
        {NOTAS.map(([v, rotulo]) => (
          <label key={v} className={`d-op d-op--m${nota === v ? " d-op--on" : ""}`}>
            <input type="radio" name="nota" value={v} checked={nota === v} onChange={() => setNota(v)} />
            {v} · {rotulo}
          </label>
        ))}
      </fieldset>
      <div className="d-campo">
        <label htmlFor="avaliar-comentario">Comentário (opcional)</label>
        <textarea id="avaliar-comentario" value={comentario} maxLength={MAX_COMENTARIO} aria-describedby="avaliar-ajuda" onChange={(e) => setComentario(e.target.value)} />
        <p id="avaliar-ajuda" className="d-small">{comentario.length} de {MAX_COMENTARIO} letras. Não escreva seu nome nem dados de saúde: a clínica e outras pessoas podem ver.</p>
      </div>
      {enviar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(enviar.error)}</b></div>}
      <div className="d-fim">
        <Btn aria-busy={enviar.isPending || undefined} type="submit" disabled={!nota || enviar.isPending}>{enviar.isPending ? "Enviando…" : jaAvaliado ? "Salvar avaliação" : "Enviar avaliação"}</Btn>
        <LinhaSamu />
      </div>
    </form>
  );
}

/** Avaliar a clínica depois do atendimento concluído (POST /avaliacoes; reenviar edita). */
export function Avaliar() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const clinicas = useClinicasPorId();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const minhas = useQuery({ queryKey: ["avaliacoes"], queryFn: () => api.dados(api.cliente.GET("/avaliacoes", {})) });

  if (pedido.isPending || minhas.isPending) return <TelaCarregando />;
  if (pedido.isError || minhas.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para={`/pedidos/${id}`}>Meu pedido</Voltar>
        <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(pedido.error ?? minhas.error)}</b></div>
        <Btn onClick={() => { void pedido.refetch(); void minhas.refetch(); }}>Tentar de novo</Btn>
      </main></div>
    );
  }
  const p = pedido.data;
  const existente = minhas.data.itens.find((a) => a.solicitacao_id === p.id);
  const nome = clinicas.get(p.clinica_id)?.nome ?? "a clínica";

  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para={`/pedidos/${p.id}`}>Meu pedido</Voltar>
        <h1 className="d-h1 d-h1--30">Avaliar {nome}</h1>
        {p.estado !== "concluida" ? (
          <>
            <div className="d-aviso">Você poderá avaliar depois que o atendimento for concluído.</div>
            <div className="d-fim"><BtnLink to={`/pedidos/${p.id}`}>Voltar ao pedido</BtnLink></div>
          </>
        ) : (
          <Formulario pedidoId={p.id} notaInicial={existente?.nota ?? null} comentarioInicial={existente?.comentario ?? ""} jaAvaliado={!!existente} />
        )}
      </main>
    </div>
  );
}
