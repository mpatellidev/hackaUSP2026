import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Aviso, Botao, Cartao, CampoSelecao, Carregando, Erro, Selo, TEXTO_EMERGENCIA } from "@uhealth/ui";
import { dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { useClinicasPorId } from "../pedidos/nomesClinicas";

/** O texto de emergência (SAMU 192) é ESTÁTICO. Registrar o relato só avisa a clínica; não promete contato imediato.
 *  O relato precisa de um pedido: é por ele que a clínica certa recebe o aviso. */
export function Urgencia() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const pedidoDaUrl = params.get("pedido");
  const [escolhido, setEscolhido] = useState("");
  const pedidoId = pedidoDaUrl ?? escolhido;
  const clinicas = useClinicasPorId();
  const relatos = useQuery({ queryKey: ["urgencias"], queryFn: () => api.dados(api.cliente.GET("/urgencias", {})) });
  const pedidos = useQuery({
    queryKey: ["solicitacoes"], enabled: !pedidoDaUrl,
    queryFn: () => api.dados(api.cliente.GET("/solicitacoes", {})),
  });
  const abertos = (pedidos.data?.itens ?? []).filter((p) => p.estado !== "concluida");
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
        {!pedidoDaUrl && pedidos.data && abertos.length === 0 && (
          <Aviso>Para avisar uma clínica, você precisa ter um pedido em andamento. <Link to="/clinicas">Escolher uma clínica</Link></Aviso>
        )}
        {!pedidoDaUrl && abertos.length > 0 && (
          <CampoSelecao rotulo="Sobre qual pedido?" value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
            <option value="">Escolha o pedido</option>
            {abertos.map((p) => (
              <option key={p.id} value={p.id}>
                {rotuloEspecialidade(p.especialidade)} · {clinicas.get(p.clinica_id)?.nome ?? "Clínica"}
              </option>
            ))}
          </CampoSelecao>
        )}
        {registrar.isError && <Aviso tom="perigo">{mensagemDe(registrar.error)}</Aviso>}
        <Botao bloco disabled={!pedidoId || registrar.isPending} onClick={() => registrar.mutate()}>{registrar.isPending ? "Enviando…" : "Registrar relato de urgência"}</Botao>
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
