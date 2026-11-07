import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Icone } from "./Icone";

type VarianteBtn = "primario" | "outline" | "link" | "escuro" | "claro" | "fantasma" | "perigo";
const CLASSE: Record<VarianteBtn, string> = { primario: "", outline: " d-btn--outline", link: " d-btn--link", escuro: " d-btn--dark", claro: " d-btn--light", fantasma: " d-btn--ghost", perigo: " d-btn--danger" };

export const classeBtn = (v: VarianteBtn = "primario", extra = "") => `d-btn${CLASSE[v]}${extra ? ` ${extra}` : ""}`;

export function Btn({ variante = "primario", compacto, className = "", type = "button", ...r }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBtn; compacto?: boolean }) {
  return <button type={type} className={classeBtn(variante, `${compacto ? "d-btn--card " : ""}${className}`.trim())} {...r} />;
}

export function BtnLink({ variante = "primario", compacto, className = "", ...r }: LinkProps & { variante?: VarianteBtn; compacto?: boolean }) {
  return <Link className={classeBtn(variante, `${compacto ? "d-btn--card " : ""}${className}`.trim())} {...r} />;
}

export function BtnTel({ numero, variante = "outline", children }: { numero: string; variante?: VarianteBtn; children: ReactNode }) {
  return <a className={classeBtn(variante)} href={`tel:${numero.replace(/[^\d+]/g, "")}`}>{children}</a>;
}

export function Chip({ tom = "ok", icone, children }: { tom?: "ok" | "sun" | "neutral" | "danger"; icone?: "confirmado" | "naoRecebe" | "vaga"; children: ReactNode }) {
  const classe = tom === "ok" ? "" : ` d-chip--${tom}`;
  return <span className={`d-chip${classe}`}>{icone && <Icone nome={icone} tamanho={20} />}{children}</span>;
}

export function Voltar({ para, children = "Voltar" }: { para: string; children?: ReactNode }) {
  return <Link className="d-voltar" to={para}><Icone nome="voltar" tamanho={20} />{children}</Link>;
}

export function Linhas({ itens, rotulo }: { itens: [string, ReactNode][]; rotulo?: string }) {
  return (
    <dl className="d-dl" aria-label={rotulo}>
      {itens.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export function AvisoPerigo({ children }: { children: ReactNode }) {
  return <div className="d-aviso d-aviso--perigo" role="status"><Icone nome="naoRecebe" tamanho={24} /><b>{children}</b></div>;
}

/** Linha de emergência sempre visível nas telas de abas (SAMU 192: texto estático). */
export function LinhaSamu() {
  return <p className="d-samu">Caso grave? <a href="tel:192">Ligue 192 (SAMU).</a></p>;
}
