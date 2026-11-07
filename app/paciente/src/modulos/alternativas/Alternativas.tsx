import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Aviso, Botao, Cartao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { CRITERIO_ALTERNATIVA, CUSTO, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Icone } from "../../design/Icone";
import { useClinicasPorId } from "../pedidos/nomesClinicas";

/** O paciente ESCOLHE a nova clínica; nada é enviado automaticamente. */
export function Alternativas() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const clinicas = useClinicasPorId();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const lista = useQuery({ queryKey: ["alternativas", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}/alternativas", { params: { path: { solicitacao_id: id } } })) });
  const encaminhar = useMutation({
    mutationFn: (clinica_destino_id: string) => api.dados(api.cliente.POST("/solicitacoes/{solicitacao_id}/encaminhar", { params: { path: { solicitacao_id: id } }, body: { clinica_destino_id } })),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["solicitacoes"] }); navegar(`/pedidos/${r.solicitacao.id}`, { state: { acabouDeEnviar: true } }); },
  });
  const origem = pedido.data ? clinicas.get(pedido.data.clinica_id)?.nome ?? "A clínica" : "A clínica";

  return (
    <>
      <Link className="voltar" to={`/pedidos/${id}`}><Icone nome="voltar" tamanho={20} /> Voltar ao pedido</Link>
      <Aviso tom="perigo"><span><Icone nome="naoRecebe" tamanho={20} /> {origem} não pode receber agora.</span></Aviso>
      <h1>Encontramos outras opções para você</h1>
      {lista.isPending && <Carregando />}
      {lista.isError && <Erro mensagem={mensagemDe(lista.error)} aoTentar={() => lista.refetch()} />}
      {lista.data && (
        <>
          <Aviso>{lista.data.aviso}</Aviso>
          {encaminhar.isError && <Aviso tom="perigo">{mensagemDe(encaminhar.error)}</Aviso>}
          {lista.data.itens.length === 0 && <Vazio>Não encontramos outra clínica compatível agora. Tente de novo mais tarde.</Vazio>}
          <ul className="lista-cartoes">
            {lista.data.itens.map(({ clinica: c }, i) => (
              <li key={c.id}>
                <Cartao selecionado={i === 0} aria-labelledby={`a-${c.id}`}>
                  <h2 id={`a-${c.id}`}>{c.nome}</h2>
                  <p>{c.cidade}, {c.uf} · {c.especialidades.map(rotuloEspecialidade).join(" · ")}</p>
                  <div className="etiquetas">
                    <Selo><Icone nome="confirmado" tamanho={20} /> Recebendo pedidos</Selo>
                    <Selo tom="aviso">{CUSTO[c.custo_informado]}</Selo>
                  </div>
                  <p><strong>Por que ela?</strong> Ela {lista.data.criterios.map((k) => CRITERIO_ALTERNATIVA[k] ?? k).join("; ")}.</p>
                  {c.custo_informado === "a_confirmar" && <p className="hint">Custo não informado. Confirme antes de se deslocar.</p>}
                  <Botao bloco variante={i === 0 ? "primary" : "outline"} disabled={encaminhar.isPending} onClick={() => encaminhar.mutate(c.id)}>
                    {encaminhar.isPending && encaminhar.variables === c.id ? "Enviando…" : `Enviar meu pedido para ${c.nome}`}
                  </Botao>
                  <Link className="btn btn--outline btn--block" to={`/clinicas/${c.id}`}>Ver detalhes</Link>
                </Cartao>
              </li>
            ))}
          </ul>
          <Link className="btn btn--outline btn--block" to={`/pedidos/${id}`}>Agora não, quero esperar</Link>
        </>
      )}
    </>
  );
}
