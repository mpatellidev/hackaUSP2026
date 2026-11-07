import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Aviso, Botao, Cartao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { CRITERIO_ALTERNATIVA, CUSTO, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";

/** O paciente ESCOLHE a nova clínica; nada é enviado automaticamente. */
export function Alternativas() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const lista = useQuery({ queryKey: ["alternativas", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/alternativas", { params: { path: { solicitacao_id: id } } })) });
  const encaminhar = useMutation({
    mutationFn: (clinica_destino_id: string) => api.dados(api.cliente.POST("/solicitacoes/{solicitacao_id}/encaminhar", { params: { path: { solicitacao_id: id } }, body: { clinica_destino_id } })),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["solicitacoes"] }); navegar(`/pedidos/${r.solicitacao.id}`); },
  });

  return (
    <>
      <Link className="voltar" to={`/pedidos/${id}`}>← Voltar ao pedido</Link>
      <h1>Outras clínicas</h1>
      {lista.isPending && <Carregando />}
      {lista.isError && <Erro mensagem={mensagemDe(lista.error)} aoTentar={() => lista.refetch()} />}
      {lista.data && (
        <>
          <Aviso>{lista.data.aviso}</Aviso>
          <p>Mostramos clínicas que: {lista.data.criterios.map((c) => CRITERIO_ALTERNATIVA[c] ?? c).join("; ")}.</p>
          {lista.data.itens.length === 0 && <Vazio>Não encontramos outra clínica compatível agora. Tente de novo mais tarde.</Vazio>}
          <ul className="lista-cartoes">
            {lista.data.itens.map(({ clinica: c }) => (
              <li key={c.id}>
                <Cartao selecionado={escolhida === c.id}>
                  <h2>{c.nome}</h2>
                  <p>{c.especialidades.map(rotuloEspecialidade).join(" · ")}</p>
                  <Selo tom="aviso">{CUSTO[c.custo_informado]}</Selo>
                  {escolhida === c.id ? (
                    <div className="pilha">
                      <p>Vamos criar um novo pedido nesta clínica com as mesmas informações administrativas do pedido atual. Isso não garante vaga.</p>
                      {encaminhar.isError && <Aviso tom="perigo">{mensagemDe(encaminhar.error)}</Aviso>}
                      <Botao bloco disabled={encaminhar.isPending} onClick={() => encaminhar.mutate(c.id)}>{encaminhar.isPending ? "Enviando…" : "Confirmar e enviar pedido"}</Botao>
                      <Botao variante="outline" bloco onClick={() => setEscolhida(null)}>Cancelar</Botao>
                    </div>
                  ) : (
                    <Botao variante="outline" bloco onClick={() => setEscolhida(c.id)}>Escolher esta clínica</Botao>
                  )}
                </Cartao>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
