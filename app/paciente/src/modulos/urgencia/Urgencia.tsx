import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Aviso, Botao, Cartao, Carregando, Erro, Selo, TEXTO_EMERGENCIA } from "@uhealth/ui";
import { dataHora, mensagemDe, useSessao } from "@uhealth/api-client";

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
      <h1>Estou com uma urgência</h1>
      <Aviso tom="perigo"><span><strong>Em risco agora? Ligue 192 (SAMU).</strong> {TEXTO_EMERGENCIA}</span></Aviso>
      <a className="btn btn--sun btn--block" href="tel:192">Ligar para o SAMU 192</a>

      <Cartao>
        <h2>Avisar a clínica</h2>
        <p>Se o seu caso não é uma emergência agora, mas você acha que precisa ser olhado com prioridade, registre o relato. Um profissional da clínica avalia. Relatar não prejudica a sua posição e não promete contato imediato.</p>
        {registrar.isError && <Aviso tom="perigo">{mensagemDe(registrar.error)}</Aviso>}
        <Botao bloco disabled={registrar.isPending} onClick={() => registrar.mutate()}>{registrar.isPending ? "Enviando…" : "Registrar relato de urgência"}</Botao>
      </Cartao>

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
