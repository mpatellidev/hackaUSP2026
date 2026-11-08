import type { ItemFila } from "./dados";
import { NOME_COMPONENTE, fmtPontos, grupoScore } from "./dados";
import { Icone } from "./Icone";

/* Score explicável (slide "Score alto, prioridade na fila"): comparecimento + situação socioeconômica = score.
   Os números são os da API (valor × peso). Urgência avaliada por profissional vem sempre antes do score. */

/** Barra de pontos na fila; a 1ª posição ganha destaque amarelo, como no pitch. */
export function BarraScore({ score, maximo, destaque }: { score: number; maximo: number; destaque: boolean }) {
  const largura = maximo > 0 ? Math.max(0, Math.min(1, score / maximo)) : 0;
  return (
    <span className={`d-score-barra${destaque ? " d-is-first" : ""}`} aria-hidden="true">
      <span style={{ width: `${Math.round(largura * 100)}%` }} />
    </span>
  );
}

export function PrioridadeExplicada({ item, demo }: { item: ItemFila; demo: boolean }) {
  const grupos = grupoScore(item.componentes);
  return (
    <section className="d-prioridade" aria-labelledby={`pri-${item.solicitacao_id}`}>
      <div className="d-prioridade-topo">
        <span id={`pri-${item.solicitacao_id}`} className="d-eyebrow">Prioridade sugerida</span>
        <span className="d-muted">{item.posicao ? `${item.posicao}º na fila` : "Fora da fila ativa"}</span>
      </div>
      {item.urgencia_avaliada && (
        <p className="d-chip d-chip--perigo"><Icone nome="ajuda" />Urgência avaliada por profissional: vem antes de qualquer score</p>
      )}
      <p className="d-formula" aria-label={`${grupos.map((g) => `${g.titulo} ${fmtPontos(g.pontos)}`).join(" mais ")}, igual a score ${fmtPontos(item.score)}`}>
        {grupos.map((g, i) => (
          <span key={g.titulo} className="d-formula-parte">
            {i > 0 && <span className="d-formula-op" aria-hidden="true">+</span>}
            <span className="d-chip"><small>{g.titulo}</small><b>{fmtPontos(g.pontos)}</b></span>
          </span>
        ))}
        <span className="d-formula-op" aria-hidden="true">=</span>
        <span className="d-chip d-chip--marca"><small>Score</small><b>{fmtPontos(item.score)}</b></span>
      </p>
      <details className="d-disclosure">
        <summary>De onde vêm os pontos</summary>
        <ul className="d-lista-simples">
          {item.componentes.map((c) => (
            <li key={c.nome}>
              <b>{NOME_COMPONENTE[c.nome] ?? c.nome.replace(/_/g, " ")}</b>: {c.valor === null ? "não informado (vale 0)" : `${fmtPontos(c.valor)} × peso ${fmtPontos(c.peso)}`}
              <small> · fonte: {c.fonte}</small>
            </li>
          ))}
          {item.sinalizacoes.map((s) => <li key={s}><em>{s}</em></li>)}
        </ul>
      </details>
      <p className="d-profile-footer">{demo ? "Pontuação ilustrativa · dados fictícios. " : ""}A ordem é sugestão; quem decide é a equipe.</p>
    </section>
  );
}
