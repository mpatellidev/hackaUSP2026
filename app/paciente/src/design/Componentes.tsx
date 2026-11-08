import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Icone, type NomeIcone } from "./Icone";

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

export function Chip({ tom = "ok", icone, children }: { tom?: "ok" | "sun" | "neutral" | "danger"; icone?: NomeIcone; children: ReactNode }) {
  const classe = tom === "ok" ? "" : ` d-chip--${tom}`;
  return <span className={`d-chip${classe}`}>{icone && <Icone nome={icone} tamanho={20} />}{children}</span>;
}

export function Voltar({ para, children = "Voltar" }: { para: string; children?: ReactNode }) {
  return <Link className="d-voltar" to={para}><Icone nome="voltar" tamanho={20} />{children}</Link>;
}

/** Texto longo (endereço, motivo) fica embaixo do rótulo, alinhado à esquerda, em vez de espremido à direita. */
const LONGO = 26;

export function Linhas({ itens, rotulo }: { itens: [string, ReactNode][]; rotulo?: string }) {
  return (
    <dl className="d-dl" aria-label={rotulo}>
      {itens.map(([k, v]) => (
        <div key={k} className={typeof v === "string" && v.length > LONGO ? "d-dl-longo" : undefined}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

/** Carregando: blocos cinza no formato do conteúdo (o leitor de tela ouve só o texto). */
export function Carregando({ texto = "Carregando…", cartoes = 2 }: { texto?: string; cartoes?: number }) {
  return (
    <div className="d-esqueleto" role="status">
      <span className="sr-only">{texto}</span>
      {Array.from({ length: cartoes }, (_, i) => (
        <div key={i} className="d-esqueleto-cartao" aria-hidden="true">
          <span style={{ width: "70%" }} /><span style={{ width: "45%" }} /><span style={{ width: "90%" }} />
        </div>
      ))}
    </div>
  );
}

/** Tela inteira carregando (mantém o espaço da tela, sem "pular"). */
export function TelaCarregando({ texto }: { texto?: string }) {
  return <div className="d-tela"><main className="d-corpo"><span className="d-esqueleto-titulo" aria-hidden="true" /><Carregando texto={texto} /></main></div>;
}

/** Erro de um campo: cor de perigo e ícone, logo abaixo do campo. */
export function ErroCampo({ id, children }: { id?: string; children: ReactNode }) {
  return <p className="d-erro" id={id} role="alert"><Icone nome="alerta" tamanho={20} />{children}</p>;
}

/** "Passo X de N" com barra de progresso acessível. */
export function Progresso({ atual, total }: { atual: number; total: number }) {
  return (
    <div className="d-progresso-bloco">
      <p className="d-small" aria-hidden="true">Passo {atual} de {total}</p>
      <div className="d-progresso" role="progressbar" aria-label={`Passo ${atual} de ${total}`} aria-valuemin={1} aria-valuemax={total} aria-valuenow={atual}>
        <div style={{ width: `${(atual / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function AvisoPerigo({ children }: { children: ReactNode }) {
  return <div className="d-aviso d-aviso--perigo" role="status"><Icone nome="naoRecebe" tamanho={24} /><b>{children}</b></div>;
}

/** Linha de emergência sempre visível nas telas de abas (SAMU 192: texto estático). */
export function LinhaSamu() {
  return <p className="d-samu">Caso grave? <a href="tel:192">Ligue 192 (SAMU).</a></p>;
}
