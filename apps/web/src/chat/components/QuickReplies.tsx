import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon } from "./icons";

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  onSelect: (values: string[], labels: string[]) => void;
  multi?: boolean;
  exclusive?: string[];
  disabled?: boolean;
  title?: string;
}

/** Respostas rápidas em pílulas. No modo `multi`, cada pílula é uma caixa de seleção. */
export function QuickReplies({ options, onSelect, multi, exclusive = [], disabled, title = "Escolha uma opção" }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const groupRef = useRef<HTMLFieldSetElement>(null);
  const titleId = useId();

  useEffect(() => {
    setSelected([]);
    // Se o foco se perdeu (ex.: o botão clicado sumiu), leva para a primeira opção.
    if (document.activeElement === document.body || document.activeElement === null) {
      groupRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    }
  }, [options]);

  if (!options.length) return null;

  const toggle = (value: string) => {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (exclusive.includes(value)) return [value];
      return [...prev.filter((v) => !exclusive.includes(v)), value];
    });
  };

  const labelsOf = (values: string[]) => values.map((v) => options.find((o) => o.value === v)?.label ?? v);

  return (
    <fieldset className="qr" ref={groupRef} disabled={disabled} aria-labelledby={titleId}>
      <legend id={titleId} className="sr-only">
        {multi ? `${title} Pode marcar mais de uma.` : title}
      </legend>
      {multi ? (
        <>
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <label key={o.value} className={`pill ${on ? "is-on" : ""}`}>
                <input className="sr-only" type="checkbox" checked={on} onChange={() => toggle(o.value)} />
                {on && <CheckIcon />}
                <span>{o.label}</span>
              </label>
            );
          })}
          <button
            type="button"
            className="pill pill-solid"
            disabled={!selected.length}
            onClick={() => onSelect(selected, labelsOf(selected))}
          >
            Continuar
          </button>
        </>
      ) : (
        options.map((o) => (
          <button key={o.value} type="button" className="pill" onClick={() => onSelect([o.value], [o.label])}>
            {o.label}
          </button>
        ))
      )}
    </fieldset>
  );
}
