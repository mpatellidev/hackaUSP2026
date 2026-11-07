import { useState, type FormEvent } from "react";
import { solicitacoesApi } from "../../api/solicitacoes";
import { EXIGE_MOTIVO, ROTULO_ESTADO, TRANSICOES, type Estado, type Solicitacao } from "../../api/tipos";
import { Erro } from "../../componentes/Estados";

const ACAO: Partial<Record<Estado, string>> = {
  em_analise: "Colocar em análise", precisa_contato: "Precisa de contato", indisponivel: "Não recebemos agora",
};

/** Só oferece as mudanças válidas para o estado atual. O servidor continua sendo quem decide (409 vira erro visível). */
export function MudarEstado({ pedido, aoMudar }: { pedido: Solicitacao; aoMudar(s: Solicitacao): void }) {
  const opcoes = TRANSICOES[pedido.estado] ?? [];
  const [novo, setNovo] = useState<Estado | "">("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (opcoes.length === 0)
    return <p className="nota">Este pedido está em “{ROTULO_ESTADO[pedido.estado]}”. Não há mudança de situação disponível para a clínica agora.</p>;

  const exige = novo !== "" && EXIGE_MOTIVO.includes(novo);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!novo) return;
    setErro(null); setEnviando(true);
    try {
      aoMudar(await solicitacoesApi.transicionar(pedido.id, novo, motivo.trim() || undefined));
      setNovo(""); setMotivo("");
    } catch (x) { setErro((x as Error).message); }
    finally { setEnviando(false); }
  }

  return (
    <form onSubmit={enviar} className="form-grid" aria-labelledby="t-mudar">
      <h3 id="t-mudar">Mudar situação</h3>
      <fieldset className="opcoes">
        <legend className="sr-only">Nova situação</legend>
        {opcoes.map((o) => (
          <label key={o}><input type="radio" name="novo" value={o} checked={novo === o} onChange={() => setNovo(o)} /> {ACAO[o]}</label>
        ))}
      </fieldset>
      {exige && (
        <label className="field">
          <span>Motivo administrativo (obrigatório)</span>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={280} rows={3} required
            placeholder="Ex.: sem agenda neste período. Não escreva dados de saúde." />
        </label>
      )}
      {erro && <Erro mensagem={erro} />}
      <button type="submit" className="btn btn--primary" disabled={!novo || enviando}>{enviando ? "Salvando…" : "Confirmar mudança"}</button>
    </form>
  );
}
