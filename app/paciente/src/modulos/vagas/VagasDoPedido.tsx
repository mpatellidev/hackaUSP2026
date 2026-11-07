import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Aviso, Botao, Cartao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Icone } from "../../design/Icone";

const ROTULO_INTERESSE = { registrado: "Interesse registrado", confirmado: "Confirmada para você", nao_selecionado: "Outra pessoa foi escolhida", retirado: "Interesse retirado" } as const;

/** Vagas da clínica do pedido. Demonstrar interesse NÃO é agendar: a clínica confirma uma pessoa. */
export function VagasDoPedido() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const qc = useQueryClient();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const clinicaId = pedido.data?.clinica_id;
  const vagas = useQuery({
    queryKey: ["vagas", clinicaId],
    enabled: !!clinicaId,
    queryFn: () => api.dados(api.cliente.GET("/vagas", { params: { query: { clinica_id: clinicaId } } })),
  });
  const interesse = useMutation({
    mutationFn: (vagaId: string) => api.dados(api.cliente.POST("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: vagaId } }, body: { solicitacao_id: id } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["vagas"] }), qc.invalidateQueries({ queryKey: ["solicitacao", id] }), qc.invalidateQueries({ queryKey: ["solicitacoes"] })]),
  });

  return (
    <>
      <Link className="voltar" to={`/pedidos/${id}`}><Icone nome="voltar" tamanho={20} /> Voltar ao pedido</Link>
      <h1>Vagas informadas</h1>
      <p className="hint">Ainda não é reserva. A clínica confirma.</p>
      {(pedido.isPending || vagas.isPending) && !pedido.isError && <Carregando />}
      {pedido.isError && <Erro mensagem={mensagemDe(pedido.error)} />}
      {vagas.isError && <Erro mensagem={mensagemDe(vagas.error)} aoTentar={() => vagas.refetch()} />}
      {vagas.data && (
        <>
          <Aviso>{vagas.data.aviso}</Aviso>
          {interesse.isError && <Aviso tom="perigo">{mensagemDe(interesse.error)}</Aviso>}
          {vagas.data.itens.length === 0 && <Vazio>Nenhuma vaga informada por esta clínica agora.</Vazio>}
          <ul className="lista-cartoes">
            {vagas.data.itens.map((v) => (
              <li key={v.id}>
                <Cartao aria-labelledby={`v-${v.id}`} selecionado={v.estado === "aberta" && !v.interesse}>
                  {v.estado === "aberta" && !v.interesse && <span className="chip chip--warn"><Icone nome="vaga" tamanho={20} /> Surgiu uma vaga</span>}
                  <h2 id={`v-${v.id}`}>{rotuloEspecialidade(v.especialidade)}</h2>
                  <p className="com-icone"><Icone nome="horario" tamanho={20} /> {dataHora(v.inicio)}</p>
                  {v.interesse ? <Selo tom={v.interesse === "confirmado" ? "padrao" : "aviso"}>{ROTULO_INTERESSE[v.interesse]}</Selo>
                    : v.estado === "aberta" ? <Botao bloco disabled={interesse.isPending} onClick={() => interesse.mutate(v.id)}>Tenho interesse</Botao>
                    : <Selo tom="aviso">Essa vaga já foi preenchida.</Selo>}
                </Cartao>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
