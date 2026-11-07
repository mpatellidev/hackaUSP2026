import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Aviso, Botao, Cartao, CampoSelecao, CampoTexto, Carregando, Erro, Selo } from "@uhealth/ui";
import { CUSTO, PUBLICO, mensagemDe, rotuloEspecialidade, useSessao, type PublicoAlvo } from "@uhealth/api-client";

export function DetalheClinica() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const clinica = useQuery({ queryKey: ["clinica", id], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: id } } })) });
  const notas = useQuery({ queryKey: ["avaliacoes-clinica", id], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/avaliacoes", { params: { path: { clinica_id: id } } })) });

  const [especialidade, setEspecialidade] = useState("");
  const [publico, setPublico] = useState<PublicoAlvo | "">("");
  const [descricao, setDescricao] = useState("");
  const enviar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/solicitacoes", {
      body: { clinica_id: id, especialidade: especialidade || clinica.data!.especialidades[0], publico_alvo: (publico || clinica.data!.publico[0]) as PublicoAlvo, descricao_administrativa: descricao },
    })),
    onSuccess: (pedido) => { void qc.invalidateQueries({ queryKey: ["solicitacoes"] }); navegar(`/pedidos/${pedido.id}`); },
  });

  if (clinica.isPending) return <Carregando />;
  if (clinica.isError) return <Erro mensagem={mensagemDe(clinica.error)} aoTentar={() => clinica.refetch()} />;
  const c = clinica.data;

  function aoEnviar(e: FormEvent) { e.preventDefault(); enviar.mutate(); }

  return (
    <>
      <Link className="voltar" to="/clinicas">← Voltar às clínicas</Link>
      <h1>{c.nome}</h1>
      <div className="etiquetas">
        <Selo tom={c.recebendo_pedidos ? "padrao" : "aviso"}>{c.recebendo_pedidos ? "Recebendo pedidos" : "Sem receber pedidos agora"}</Selo>
        <Selo tom="aviso">{CUSTO[c.custo_informado]}</Selo>
      </div>
      <p>{c.cidade}, {c.uf} · Telefone: <a href={`tel:${c.telefone.replace(/\D/g, "")}`}>{c.telefone}</a> (fictício)</p>
      <p>Atende: {c.especialidades.map(rotuloEspecialidade).join(", ")}. Público: {c.publico.map((p) => PUBLICO[p]).join(", ")}.</p>
      {notas.data && notas.data.quantidade > 0 && <p>Avaliação: {notas.data.media} de 5 ({notas.data.quantidade} {notas.data.quantidade === 1 ? "avaliação" : "avaliações"} fictícias)</p>}

      <Aviso>Enviar um pedido não garante vaga. A clínica analisa e responde. Não escreva dados de saúde: descreva só o que precisa.</Aviso>

      {c.recebendo_pedidos ? (
        <Cartao>
          <h2>Pedir atendimento</h2>
          <form className="pilha" onSubmit={aoEnviar}>
            <CampoSelecao rotulo="Especialidade" value={especialidade || c.especialidades[0]} onChange={(e) => setEspecialidade(e.target.value)}>
              {c.especialidades.map((e) => <option key={e} value={e}>{rotuloEspecialidade(e)}</option>)}
            </CampoSelecao>
            <CampoSelecao rotulo="Quem será atendido" value={publico || c.publico[0]} onChange={(e) => setPublico(e.target.value as PublicoAlvo)}>
              {c.publico.map((p) => <option key={p} value={p}>{PUBLICO[p]}</option>)}
            </CampoSelecao>
            <CampoTexto rotulo="Motivo do pedido (texto simples)" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              minLength={3} maxLength={280} required dica="Ex.: consulta de rotina. Máximo de 280 letras." />
            {enviar.isError && <Aviso tom="perigo">{mensagemDe(enviar.error)}</Aviso>}
            <Botao type="submit" bloco disabled={enviar.isPending || descricao.trim().length < 3}>{enviar.isPending ? "Enviando…" : "Enviar pedido"}</Botao>
          </form>
        </Cartao>
      ) : (
        <Aviso>Esta clínica não está recebendo pedidos agora. Volte e escolha outra.</Aviso>
      )}
    </>
  );
}
