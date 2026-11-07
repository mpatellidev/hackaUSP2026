import { Icone } from "./Icone";

/** Roteiro do pedido (design: stepper de 5 etapas). Lista ordenada; a etapa atual leva `aria-current="step"`. */
export function Etapas({ etapas, atual, detalhes = {} }: { etapas: string[]; atual: number; detalhes?: Record<number, string> }) {
  return (
    <ol className="stepper" aria-label="Etapas do pedido">
      {etapas.map((nome, i) => {
        const feita = i < atual;
        const aqui = i === atual;
        return (
          <li key={nome} className={feita ? "etapa etapa--feita" : aqui ? "etapa etapa--atual" : "etapa"} aria-current={aqui ? "step" : undefined}>
            <span className="etapa-marca" aria-hidden="true">{feita ? <Icone nome="confirmado" tamanho={20} /> : i + 1}</span>
            <span>
              <strong>{nome}</strong>
              {detalhes[i] && <small>{detalhes[i]}</small>}
              {aqui && <small className="etapa-aqui">Você está aqui</small>}
              {feita && <small className="sr-only">Etapa concluída</small>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
