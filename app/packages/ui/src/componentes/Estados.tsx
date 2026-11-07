import type { ReactNode } from "react";
import { Aviso, Botao } from "./Basicos";

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return <p role="status" aria-live="polite" className="estado">{texto}</p>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="estado estado--vazio">{children}</p>;
}

/** Erro de tela com a mensagem pronta da API (pt-BR, sem jargão) e, se houver, "tentar de novo". */
export function Erro({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div className="pilha">
      <Aviso tom="perigo">{mensagem}</Aviso>
      {aoTentar && <Botao variante="outline" onClick={aoTentar}>Tentar de novo</Botao>}
    </div>
  );
}

/** Rótulo de dados fictícios / demonstração, exibido em todo o app. */
export function FaixaDemo({ children }: { children?: ReactNode }) {
  return (
    <div className="faixa-demo" role="note">
      {children ?? "Protótipo de hackathon · dados fictícios · login de demonstração"}
    </div>
  );
}
