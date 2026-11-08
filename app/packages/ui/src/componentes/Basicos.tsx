import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

type Variante = "primary" | "outline" | "sun";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  bloco?: boolean;
}

/** Um botão principal por tela; os demais usam `outline`. */
/** Nome da marca: "Sorriu+" em branco com o "u" em amarelo, sobre verde-escuro (contraste em qualquer fundo). */
export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`uh-marca ${className}`.trim()} role="img" aria-label="Sorriu+">
      <span aria-hidden="true">Sorri<span className="uh-marca-u">u</span>+</span>
    </span>
  );
}

export function Botao({ variante = "primary", bloco, className = "", type = "button", ...resto }: BotaoProps) {
  return <button type={type} className={`btn btn--${variante}${bloco ? " btn--block" : ""} ${className}`.trim()} {...resto} />;
}

export function Cartao({ selecionado, className = "", ...resto }: HTMLAttributes<HTMLElement> & { selecionado?: boolean }) {
  return <article className={`card${selecionado ? " card--selected" : ""} ${className}`.trim()} {...resto} />;
}

type TomSelo = "padrao" | "aviso" | "perigo";

/** Chip de estado: sempre texto (e ícone quando houver), nunca só cor. */
export function Selo({ tom = "padrao", children }: { tom?: TomSelo; children: ReactNode }) {
  const classe = tom === "aviso" ? " chip--warn" : tom === "perigo" ? " chip--danger" : "";
  return <span className={`chip${classe}`}>{children}</span>;
}

export function Aviso({ tom = "info", children, ...resto }: HTMLAttributes<HTMLDivElement> & { tom?: "info" | "perigo" }) {
  return (
    <div className={`notice notice--${tom}`} role={tom === "perigo" ? "alert" : "note"} {...resto}>
      {children}
    </div>
  );
}

interface CampoBase {
  rotulo: string;
  dica?: string;
  erro?: string;
}

export function Campo({ rotulo, dica, erro, ...resto }: CampoBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} aria-invalid={erro ? true : undefined} aria-describedby={dica || erro ? `${id}-d` : undefined} {...resto} />
      {(dica || erro) && <span id={`${id}-d`} className={erro ? "error" : "hint"}>{erro ?? dica}</span>}
    </div>
  );
}

export function CampoSelecao({ rotulo, dica, erro, children, ...resto }: CampoBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} aria-invalid={erro ? true : undefined} {...resto}>{children}</select>
      {(dica || erro) && <span className={erro ? "error" : "hint"}>{erro ?? dica}</span>}
    </div>
  );
}

export function CampoTexto({ rotulo, dica, erro, ...resto }: CampoBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      <textarea id={id} aria-invalid={erro ? true : undefined} {...resto} />
      {(dica || erro) && <span className={erro ? "error" : "hint"}>{erro ?? dica}</span>}
    </div>
  );
}
