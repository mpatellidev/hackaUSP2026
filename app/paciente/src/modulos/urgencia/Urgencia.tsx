import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TEXTO_EMERGENCIA } from "@uhealth/ui";
import { mensagemDe, useSessao, type Clinica } from "@uhealth/api-client";
import { Btn, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";

/** Link que abre o app de mapas com a rota até a clínica. */
export function linkComoChegar(c: Clinica): string {
  const destino = c.latitude != null && c.longitude != null ? `${c.latitude},${c.longitude}` : encodeURIComponent(`${c.endereco ?? ""} ${c.cidade}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}
const km = (d: number | null | undefined) => (d == null ? null : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);

function CartaoUrgencia({ c, distancia, ateHoras, principal }: { c: Clinica; distancia: number | null; ateHoras: string | null; principal?: boolean }) {
  return (
    <article className={`d-card${principal ? " d-card--sel" : ""}`} aria-labelledby={`u-${c.id}`}>
      {principal && <span className="d-chip d-chip--danger" style={{ alignSelf: "flex-start" }}>Mais perto e aberta agora</span>}
      <h2 id={`u-${c.id}`} className="d-h2">{c.nome}</h2>
      <p className="d-small" style={{ display: "flex", gap: 6 }}><Icone nome="local" tamanho={20} />
        <span>{c.endereco ? `${c.endereco}, ${c.bairro} · ${c.cidade}` : c.cidade}{km(distancia) ? ` · ${km(distancia)}` : ""}</span></p>
      <p className="d-small">Urgência aberta {ateHoras === "24 horas" ? "24 horas" : `até ${ateHoras}`} · {c.telefone}</p>
      <div className="d-linhaBtn">
        <a className="d-btn d-btn--danger" href={`tel:${c.telefone.replace(/[^\d+]/g, "")}`}><Icone nome="telefone" tamanho={22} />Ligar</a>
        <a className="d-btn d-btn--outline" href={linkComoChegar(c)} target="_blank" rel="noreferrer"><Icone nome="local" tamanho={22} />Como chegar</a>
      </div>
    </article>
  );
}

/** Emergência (declarada pelo paciente). NÃO cria agendamento: mostra a clínica de urgência ABERTA mais próxima,
 *  alternativas e, para sinais graves, pronto-socorro / SAMU 192 (texto fixo, aparece mesmo sem rede). */
export function Urgencia() {
  const { api } = useSessao();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const r = useQuery({
    queryKey: ["emergencia", gps],
    queryFn: () => api.dados(api.cliente.GET("/emergencia", { params: { query: gps ?? {} } })),
  });
  const usarGps = () => navigator.geolocation?.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => undefined, { timeout: 8000 });

  return (
    <div className="d-tela">
      <main className="d-corpo" style={{ gap: 14 }}>
        <Voltar para="/clinicas" />
        <h1 className="d-h1">Emergência no dente</h1>
        <section className="d-sinais" aria-labelledby="h-graves">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><Icone nome="alerta" tamanho={28} /><b id="h-graves">Sinais graves: não espere</b></div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {(r.data?.sinais_graves ?? ["Sangramento que não para", "Inchaço que dificulta respirar ou engolir", "Febre alta"]).map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p><strong>Vá a um pronto-socorro ou ligue 192 (SAMU).</strong> {TEXTO_EMERGENCIA}</p>
          <a className="d-btn d-btn--danger" href="tel:192"><Icone nome="telefone" tamanho={22} />Ligar 192 (SAMU)</a>
        </section>

        <h2 className="d-h2">Clínica de urgência aberta agora</h2>
        {r.isPending && <p role="status" className="d-small">Procurando a clínica aberta mais perto…</p>}
        {r.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(r.error)}</b> Se for grave, ligue 192.</div>}
        {r.data && !r.data.usou_localizacao && !gps && (
          <Btn variante="outline" onClick={usarGps}><Icone nome="local" />Usar minha localização para achar a mais perto</Btn>
        )}
        {r.data?.principal && <CartaoUrgencia principal c={r.data.principal.clinica} distancia={r.data.principal.distancia_km} ateHoras={r.data.principal.aberta_ate} />}
        {r.data && !r.data.principal && <div className="d-aviso d-aviso--perigo" role="alert"><b>{r.data.aviso}</b></div>}
        {r.data && r.data.alternativas.length > 0 && (
          <>
            <h2 className="d-h2">Outras opções perto</h2>
            {r.data.alternativas.map((a) => <CartaoUrgencia key={a.clinica.id} c={a.clinica} distancia={a.distancia_km} ateHoras={a.aberta_ate} />)}
          </>
        )}
        {r.data?.principal && <p className="d-small">{r.data.aviso}</p>}
      </main>
    </div>
  );
}
