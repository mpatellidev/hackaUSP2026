import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { solicitacoesApi } from "../../api/solicitacoes";
import { ROTULO_ESTADO, type Estado, type Solicitacao } from "../../api/tipos";
import { Carregando, ChipEstado, Erro, Vazio } from "../../componentes/Estados";
import { dataCurta, diasDesde, rotuloDias } from "../../formato";

export default function ListaSolicitacoes() {
  const [estado, setEstado] = useState<Estado | "">("");
  const [itens, setItens] = useState<Solicitacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setItens(null); setErro(null);
    try { setItens(await solicitacoesApi.listar(estado || undefined)); }
    catch (e) { setErro((e as Error).message); }
  }, [estado]);
  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <section aria-labelledby="t-lista">
      <div className="bar">
        <h1 id="t-lista">Solicitações</h1>
        <div className="bar-acoes">
          <label>Situação{" "}
            <select value={estado} onChange={(e) => setEstado(e.target.value as Estado | "")}>
              <option value="">Todas</option>
              {(Object.keys(ROTULO_ESTADO) as Estado[]).map((s) => <option key={s} value={s}>{ROTULO_ESTADO[s]}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn--outline" onClick={() => void carregar()}>Atualizar</button>
        </div>
      </div>

      {erro && <Erro mensagem={erro} aoTentar={() => void carregar()} />}
      {!erro && itens === null && <Carregando texto="Carregando solicitações…" />}
      {!erro && itens?.length === 0 && <Vazio>Nenhuma solicitação por aqui. Use “Atualizar” para conferir de novo.</Vazio>}
      {!erro && itens && itens.length > 0 && (
        <div className="card scroll" style={{ padding: 0 }}>
          <table className="table">
            <caption className="sr-only">Solicitações recebidas pela sua clínica (dados fictícios)</caption>
            <thead><tr><th scope="col">Paciente</th><th scope="col">Especialidade</th><th scope="col">Espera</th><th scope="col">Situação</th><th scope="col">Enviada em</th></tr></thead>
            <tbody>
              {itens.map((s) => (
                <tr key={s.id}>
                  <th scope="row"><Link to={`/solicitacoes/${s.id}`}>{s.paciente_nome_exibicao ?? "Paciente"}</Link></th>
                  <td>{s.especialidade.replaceAll("_", " ")}</td>
                  <td>{rotuloDias(diasDesde(s.criado_em))}</td>
                  <td><ChipEstado estado={s.estado} /></td>
                  <td>{dataCurta(s.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="nota">Pedido não é agendamento. A decisão de atendimento é sempre da equipe.</p>
    </section>
  );
}
