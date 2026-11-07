import type { ReactNode } from "react";
import { ROTULO_ESTADO, type Estado } from "../api/tipos";

export const Carregando = ({ texto = "Carregando…" }: { texto?: string }) => (
  <p role="status" aria-live="polite" className="estado-vazio">{texto}</p>
);

export const Erro = ({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) => (
  <div role="alert" className="notice notice--danger">
    <div>
      <strong>Não foi possível concluir.</strong> {mensagem}
      {aoTentar && <div style={{ marginTop: 8 }}><button type="button" className="btn btn--outline" onClick={aoTentar}>Tentar de novo</button></div>}
    </div>
  </div>
);

export const Vazio = ({ children }: { children: ReactNode }) => <p className="estado-vazio">{children}</p>;

export function ChipEstado({ estado }: { estado: Estado }) {
  const cls = estado === "indisponivel" ? "chip chip--danger" : estado === "em_analise" || estado === "precisa_contato" ? "chip chip--warn" : "chip";
  return <span className={cls}>{ROTULO_ESTADO[estado]}</span>;
}

export const SeloDemo = ({ modo }: { modo: "mock" | "api" }) => (
  <div className="selo-demo" role="note">
    <strong>Conta fictícia · demonstração.</strong>{" "}
    {modo === "mock" ? "Modo demonstração: dados simulados, nada é enviado." : "Dados fictícios no servidor de demonstração."}
  </div>
);
