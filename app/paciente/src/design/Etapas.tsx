import { Icone } from "./Icone";

/** Roteiro do pedido (design P2): bolinhas ligadas por uma linha. Atual: `aria-current="step"` e "Você está aqui". */
export function Etapas({ etapas, atual, detalhes = {} }: { etapas: string[]; atual: number; detalhes?: Record<number, string> }) {
  return (
    <ol className="d-passos" aria-label="Etapas do pedido">
      {etapas.map((nome, i) => {
        const feita = i < atual;
        const aqui = i === atual;
        return (
          <li key={nome} className={`d-passo${feita ? " d-passo--feita" : aqui ? " d-passo--atual" : ""}`} aria-current={aqui ? "step" : undefined}>
            <div className="d-passo-trilho">
              <span className="d-passo-bola" aria-hidden="true">{feita && <Icone nome="confirmado" tamanho={16} />}</span>
              {i < etapas.length - 1 && <span className="d-passo-linha" aria-hidden="true" />}
            </div>
            <div className="d-passo-texto">
              {nome}
              {feita && <span className="sr-only"> (concluída)</span>}
              {(detalhes[i] || aqui) && <small>{aqui ? "Você está aqui" : detalhes[i]}</small>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
