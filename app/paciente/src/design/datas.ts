const FUSO = "America/Sao_Paulo";
const CHAVE = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: FUSO });
const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });

/** "14h" ou "10h12", como no design. */
export function horaCurta(iso: string): string {
  const [h, m] = HORA.format(new Date(iso)).split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** "Hoje, 10h12" · "Amanhã, 14h" · "Ontem, 9h" · "08/11, 14h" (fuso de São Paulo). */
export function quando(iso: string, agora: Date = new Date()): string {
  const dia = CHAVE.format(new Date(iso));
  const diaDe = (deslocamentoDias: number) => CHAVE.format(new Date(agora.getTime() + deslocamentoDias * 864e5));
  const prefixo = dia === diaDe(0) ? "Hoje" : dia === diaDe(1) ? "Amanhã" : dia === diaDe(-1) ? "Ontem" : DATA_CURTA.format(new Date(iso));
  return `${prefixo}, ${horaCurta(iso)}`;
}
