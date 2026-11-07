import type { ReactNode } from "react";

export interface Coluna<T> {
  titulo: string;
  celula: (linha: T) => ReactNode;
}

/** Tabela simples que vira lista de cartões em telas estreitas (rolagem horizontal evitada). */
export function Tabela<T>({ colunas, linhas, chave, legenda }: {
  colunas: Coluna<T>[]; linhas: T[]; chave: (l: T) => string; legenda: string;
}) {
  return (
    <div className="tabela-rolavel">
      <table className="table">
        <caption className="sr-only">{legenda}</caption>
        <thead><tr>{colunas.map((c) => <th key={c.titulo} scope="col">{c.titulo}</th>)}</tr></thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={chave(l)}>{colunas.map((c) => <td key={c.titulo} data-rotulo={c.titulo}>{c.celula(l)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
