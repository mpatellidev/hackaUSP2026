import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Aviso, Botao, Cartao, Carregando, Erro, Selo, TEXTO_EMERGENCIA } from "@uhealth/ui";
import { dataHora, mensagemDe, useSessao } from "@uhealth/api-client";
import { Icone } from "../../design/Icone";

/** O texto de emergência (SAMU 192) é ESTÁTICO. Registrar o relato só avisa a clínica; não promete contato imediato. */
export function Urgencia() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const pedidoId = params.get("pedido");
  const relatos = useQuery({ queryKey: ["urgencias"], queryFn: () => api.dados(api.cliente.GET("/urgencias", {})) });
  const registrar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/urgencias", { body: { solicitacao_id: pedidoId } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["urgencias"] }),
  });

  return (
    <>
      <h1>Você precisa de ajuda urgente?</h1>
      <p>Escolha o que mais se parece com o que você sente.</p>
      <Aviso tom="perigo"><span><Icone nome="alerta" tamanho={20} /> <strong>Em risco agora? Ligue 192 (SAMU).</strong> {TEXTO_EMERGENCIA}</span></Aviso>
      <a className="btn btn--sun btn--block com-icone" href="tel:192"><Icone nome="telefone" tamanho={20} /> Ligar para o SAMU 192</a>

      <Cartao aria-labelledby="h-avisar">
        <h2 id="h-avisar">Dor forte, mas consigo respirar e falar</h2>
        <p>Vamos avisar a clínica. Um profissional da clínica avalia o seu pedido. Pedir como urgente não reduz a sua vez e não promete contato imediato.</p>
        <p><strong>Se piorar, ligue 192 (SAMU).</strong> Não espere a resposta da clínica.</p>
        {registrar.isError && <Aviso tom="perigo">{mensagemDe(registrar.error)}</Aviso>}
        {registrar.isSuccess && <Aviso>Relato registrado. A clínica vai avaliar.</Aviso>}
        <Botao bloco disabled={registrar.isPending} onClick={() => registrar.mutate()}>{registrar.isPending ? "Enviando…" : "Registrar relato de urgência"}</Botao>
        <p className="hint">Texto de exemplo. Precisa ser validado por profissional de saúde.</p>
      </Cartao>

      <Cartao aria-labelledby="h-normal">
        <h2 id="h-normal">Não é urgente</h2>
        <p>Quero pedir atendimento normal.</p>
        <Link className="btn btn--outline btn--block" to="/clinicas">Encontrar uma clínica</Link>
      </Cartao>
      <p className="hint">Em caso de dúvida, ligue 192.</p>

      <section className="pilha" aria-labelledby="h-rel">
        <h2 id="h-rel">Meus relatos</h2>
        {relatos.isPending && <Carregando />}
        {relatos.isError && <Erro mensagem={mensagemDe(relatos.error)} aoTentar={() => relatos.refetch()} />}
        <ul className="lista-cartoes">
          {relatos.data?.itens.map((r) => (
            <li key={r.id}>
              <Cartao>
                <Selo tom={r.estado === "avaliada" ? "padrao" : "aviso"}>{r.rotulo}</Selo>
                <p>Registrado em {dataHora(r.criado_em)}</p>
                {r.avaliacao && <p>Avaliação: {r.avaliacao.classificacao === "urgencia_confirmada" ? "urgência confirmada por profissional" : "sem urgência confirmada"}</p>}
              </Cartao>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
