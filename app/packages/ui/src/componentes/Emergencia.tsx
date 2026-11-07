import { useEffect, useRef } from "react";
import { Botao } from "./Basicos";

/** Texto ESTÁTICO: funciona sem rede, sem IA e sem login. Não diagnostica nem substitui o atendimento de urgência. */
export const TEXTO_EMERGENCIA =
  "Se você ou alguém está em risco agora (falta de ar, dor forte no peito, desmaio, sangramento intenso, pensamentos de se machucar), ligue 192 (SAMU) ou vá ao pronto-socorro mais próximo. Não espere resposta do aplicativo.";

export function CartaoEmergencia({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="emergencia" aria-labelledby="emerg-titulo" onClose={aoFechar}>
      <h2 id="emerg-titulo">Emergência: ligue 192</h2>
      <p>{TEXTO_EMERGENCIA}</p>
      <p>Este aplicativo não faz diagnóstico, não prescreve e não garante vaga.</p>
      <div className="linha">
        <a className="btn btn--sun" href="tel:192">Ligar para o SAMU 192</a>
        <Botao variante="outline" onClick={aoFechar}>Fechar</Botao>
      </div>
    </dialog>
  );
}
