import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Aviso, Botao, Cartao, CampoSelecao, CampoTexto, Carregando, Erro, Selo } from "@uhealth/ui";
import { CUSTO, PUBLICO, mensagemDe, rotuloEspecialidade, useSessao, type PublicoAlvo } from "@uhealth/api-client";
import { Icone } from "../../design/Icone";

/** Pedido em dois passos (design C1): preencher e revisar. Nada é enviado sem o paciente tocar em "Enviar pedido". */
export function DetalheClinica() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const clinica = useQuery({ queryKey: ["clinica", id], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: id } } })) });
  const notas = useQuery({ queryKey: ["avaliacoes-clinica", id], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/avaliacoes", { params: { path: { clinica_id: id } } })) });

  const [revisando, setRevisando] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const [especialidade, setEspecialidade] = useState("");
  const [publico, setPublico] = useState<PublicoAlvo | "">("");
  const [descricao, setDescricao] = useState("");
  const enviar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/solicitacoes", {
      body: { clinica_id: id, especialidade: especialidade || clinica.data!.especialidades[0], publico_alvo: (publico || clinica.data!.publico[0]) as PublicoAlvo, descricao_administrativa: descricao },
    })),
    onSuccess: (pedido) => { void qc.invalidateQueries({ queryKey: ["solicitacoes"] }); navegar(`/pedidos/${pedido.id}`, { state: { acabouDeEnviar: true } }); },
  });

  if (clinica.isPending) return <Carregando />;
  if (clinica.isError) return <Erro mensagem={mensagemDe(clinica.error)} aoTentar={() => clinica.refetch()} />;
  const c = clinica.data;
  const espEscolhida = especialidade || c.especialidades[0];
  const pubEscolhido = (publico || c.publico[0]) as PublicoAlvo;
  const podeRevisar = descricao.trim().length >= 3;

  if (revisando) {
    return (
      <>
        <p className="hint">Último passo</p>
        <h1>Revise antes de enviar</h1>
        <Cartao aria-labelledby="h-rev">
          <h2 id="h-rev" className="sr-only">Resumo do pedido</h2>
          <dl className="resumo">
            <dt>Clínica</dt><dd>{c.nome}</dd>
            <dt>Atendimento</dt><dd>{rotuloEspecialidade(espEscolhida)}</dd>
            <dt>Para</dt><dd>{PUBLICO[pubEscolhido]}</dd>
            <dt>Motivo</dt><dd>{descricao}</dd>
            <dt>Custo</dt><dd>{CUSTO[c.custo_informado]}, a confirmar</dd>
          </dl>
        </Cartao>
        <label className="consentimento">
          <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
          <span>Autorizo a {c.nome} a ver estas informações para analisar meu pedido.</span>
        </label>
        <p className="hint">Enviar não garante vaga. Ainda não é consulta marcada.</p>
        {enviar.isError && <Aviso tom="perigo">{mensagemDe(enviar.error)}</Aviso>}
        <div className="pilha">
          <Botao bloco disabled={!autorizo || enviar.isPending} onClick={() => enviar.mutate()}>{enviar.isPending ? "Enviando…" : "Enviar pedido"}</Botao>
          <Botao bloco variante="outline" onClick={() => setRevisando(false)}>Corrigir algo</Botao>
        </div>
      </>
    );
  }

  return (
    <>
      <Link className="voltar" to="/clinicas"><Icone nome="voltar" tamanho={20} /> Voltar às clínicas</Link>
      <h1>{c.nome}</h1>
      <div className="etiquetas">
        <Selo tom={c.recebendo_pedidos ? "padrao" : "aviso"}>
          <Icone nome={c.recebendo_pedidos ? "confirmado" : "naoRecebe"} tamanho={20} />
          {c.recebendo_pedidos ? "Recebendo pedidos" : "Fechada por ora"}
        </Selo>
        <Selo tom="aviso">{CUSTO[c.custo_informado]}</Selo>
      </div>
      <p>{c.cidade}, {c.uf}</p>
      <p><a className="com-icone" href={`tel:${c.telefone.replace(/\D/g, "")}`}><Icone nome="telefone" tamanho={20} /> {c.telefone}</a> (fictício)</p>
      <p>Atende: {c.especialidades.map(rotuloEspecialidade).join(", ")}. Público: {c.publico.map((p) => PUBLICO[p]).join(", ")}.</p>
      {notas.data && notas.data.quantidade > 0 && <p>Avaliação: {notas.data.media} de 5 ({notas.data.quantidade} {notas.data.quantidade === 1 ? "avaliação" : "avaliações"} fictícias)</p>}

      <Aviso>Enviar um pedido não garante vaga. A clínica analisa e responde. Não escreva dados de saúde: descreva só o que precisa.</Aviso>

      {c.recebendo_pedidos ? (
        <Cartao>
          <h2>Pedir atendimento</h2>
          <form className="pilha" onSubmit={(e) => { e.preventDefault(); if (podeRevisar) setRevisando(true); }}>
            <CampoSelecao rotulo="Especialidade" value={espEscolhida} onChange={(e) => setEspecialidade(e.target.value)}>
              {c.especialidades.map((e) => <option key={e} value={e}>{rotuloEspecialidade(e)}</option>)}
            </CampoSelecao>
            <CampoSelecao rotulo="Quem será atendido" value={pubEscolhido} onChange={(e) => setPublico(e.target.value as PublicoAlvo)}>
              {c.publico.map((p) => <option key={p} value={p}>{PUBLICO[p]}</option>)}
            </CampoSelecao>
            <CampoTexto rotulo="Motivo do pedido (texto simples)" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              minLength={3} maxLength={280} required dica="Ex.: consulta de rotina. Máximo de 280 letras." />
            <Botao type="submit" bloco disabled={!podeRevisar}>Revisar pedido</Botao>
          </form>
        </Cartao>
      ) : (
        <Aviso>Clínica não pode receber agora. Volte e escolha outra.</Aviso>
      )}
    </>
  );
}
