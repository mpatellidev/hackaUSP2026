import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Aviso, Botao, Cartao, CampoSelecao, Campo, Carregando, Erro, Selo } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";

type NovoEstado = "em_analise" | "precisa_contato" | "indisponivel" | "concluida";
const OPCOES: NovoEstado[] = ["em_analise", "precisa_contato", "indisponivel", "concluida"];

export function DetalhePedido() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const qc = useQueryClient();
  const [estado, setEstado] = useState<NovoEstado>("em_analise");
  const [motivo, setMotivo] = useState("");
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const eventos = useQuery({ queryKey: ["solicitacao", id, "eventos"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/eventos", { params: { path: { solicitacao_id: id } } })) });
  const mudar = useMutation({
    mutationFn: () => api.dados(api.cliente.PATCH("/solicitacoes/{solicitacao_id}/estado", { params: { path: { solicitacao_id: id } }, body: { estado, motivo: motivo.trim() || null } })),
    onSuccess: () => { setMotivo(""); return Promise.all([qc.invalidateQueries({ queryKey: ["solicitacao", id] }), qc.invalidateQueries({ queryKey: ["solicitacoes"] })]); },
  });

  if (pedido.isPending) return <Carregando />;
  if (pedido.isError) return <Erro mensagem={mensagemDe(pedido.error)} aoTentar={() => pedido.refetch()} />;
  const p = pedido.data;

  function aoEnviar(e: FormEvent) { e.preventDefault(); mudar.mutate(); }

  return (
    <>
      <Link to="/pedidos">← Pedidos</Link>
      <h1>{rotuloEspecialidade(p.especialidade)}</h1>
      <div className="linha"><Selo tom={ESTADO_PEDIDO[p.estado].tom}>{ESTADO_PEDIDO[p.estado].rotulo}</Selo><span>Recebido em {dataHora(p.criado_em)}</span></div>
      <p>Motivo informado: “{p.descricao_administrativa}”</p>

      <Cartao>
        <h2>Atualizar andamento</h2>
        <form className="pilha" onSubmit={aoEnviar}>
          <CampoSelecao rotulo="Novo estado" value={estado} onChange={(e) => setEstado(e.target.value as NovoEstado)}>
            {OPCOES.map((o) => <option key={o} value={o}>{ESTADO_PEDIDO[o].rotulo}</option>)}
          </CampoSelecao>
          <Campo rotulo="Motivo administrativo (opcional)" value={motivo} maxLength={280} onChange={(e) => setMotivo(e.target.value)} dica="Nunca escreva dado clínico." />
          {mudar.isError && <Aviso tom="perigo">{mensagemDe(mudar.error)}</Aviso>}
          <Botao type="submit" disabled={mudar.isPending}>{mudar.isPending ? "Salvando…" : "Salvar"}</Botao>
        </form>
        <p className="hint">Estados “aguardando confirmação” e “agendada” só mudam pelas vagas: publique a vaga e confirme uma pessoa.</p>
      </Cartao>

      <Cartao>
        <h2>Histórico</h2>
        {eventos.isError && <Erro mensagem={mensagemDe(eventos.error)} />}
        <ol className="timeline">
          {eventos.data?.itens.map((e) => (
            <li key={e.id}><time dateTime={e.criado_em}>{dataHora(e.criado_em)}</time>{e.estado_novo ? ESTADO_PEDIDO[e.estado_novo].rotulo : "Registro"} ({e.autor_papel}){e.motivo ? ` — ${e.motivo}` : ""}</li>
          ))}
        </ol>
      </Cartao>
    </>
  );
}
