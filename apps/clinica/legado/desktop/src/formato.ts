const FUSO = "America/Sao_Paulo";
export const diasDesde = (iso: string, agora = new Date()) =>
  Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 86_400_000));
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO });
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
export const rotuloDias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
