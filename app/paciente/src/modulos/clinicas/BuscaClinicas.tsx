import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { BotaoAudio, BotaoLetras } from "../../design/Preferencias";
import { Btn, BtnLink, Chip, LinhaSamu } from "../../design/Componentes";
import { Icone, Simbolo } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { quando } from "../../design/datas";
import { AtalhoAlertas } from "../alertas/Alertas";
import { AtalhoPerfil } from "../perfil/Perfil";
import { MapaClinicas } from "./MapaClinicas";

type Ordem = "distancia" | "valor" | "data";
type ItemComparacao = { clinica: { id: string; nome: string; universidade?: string | null; tipo_instituicao?: string | null; valor_consulta?: number | null;
  custo_informado: string; especialidades: string[]; turnos?: string[]; latitude?: number | null; longitude?: number | null; bairro?: string | null; cidade: string };
  distancia_km: number | null; proximos_horarios: { vaga_id: string; especialidade: string; inicio: string }[] };

/** "Gratuito", "R$ 60,00" ou "A confirmar". */
export function textoValor(c: { valor_consulta?: number | null; custo_informado: string }): string {
  if (c.valor_consulta) return c.valor_consulta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return c.custo_informado === "gratuito" ? "Gratuito" : "A confirmar";
}
const km = (d: number | null) => (d == null ? null : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);
const TURNO = { manha: "Manhã", tarde: "Tarde", noite: "Noite" } as const;

function Seletor({ id, rotulo, valor, aoMudar, opcoes }: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: [string, string][] }) {
  return (
    <div className="d-campo" style={{ flex: "1 1 45%" }}>
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)}>
        {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  );
}

/** Escolher clínica (comparar e agendar): distância, valor, tipo, especialidades e próximos horários. Lista ou mapa. */
export function BuscaClinicas() {
  const { api } = useSessao();
  const navegar = useNavigate();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [dist, setDist] = useState("");
  const [valor, setValor] = useState("");
  const [esp, setEsp] = useState("");
  const [tipo, setTipo] = useState("");
  const [turno, setTurno] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("distancia");
  const perfil = useQuery({ queryKey: ["perfil"], queryFn: () => api.dados(api.cliente.GET("/perfil", {})) });
  const dados = useQuery({
    queryKey: ["comparacao", gps],
    queryFn: () => api.dados(api.cliente.GET("/clinicas-comparacao", { params: { query: gps ?? {} } })),
  });
  const voce = gps ?? (perfil.data?.latitude != null ? { lat: perfil.data.latitude, lng: perfil.data.longitude! } : null);
  const usarGps = () => navigator.geolocation?.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => undefined, { timeout: 8000 });

  const todos = (dados.data?.itens ?? []) as ItemComparacao[];
  const especialidades = [...new Set(todos.flatMap((i) => i.clinica.especialidades))];
  const itens = useMemo(() => todos
    .filter((i) => !dist || (i.distancia_km != null && i.distancia_km <= Number(dist)))
    .filter((i) => !valor || (valor === "gratis" ? !i.clinica.valor_consulta && i.clinica.custo_informado === "gratuito" : (i.clinica.valor_consulta ?? 0) <= Number(valor)))
    .filter((i) => !esp || i.clinica.especialidades.includes(esp))
    .filter((i) => !tipo || i.clinica.tipo_instituicao === tipo)
    .filter((i) => !turno || (i.clinica.turnos ?? []).includes(turno))
    .sort((a, b) => ordem === "valor" ? (a.clinica.valor_consulta ?? 0) - (b.clinica.valor_consulta ?? 0)
      : ordem === "data" ? (a.proximos_horarios[0]?.inicio ?? "9").localeCompare(b.proximos_horarios[0]?.inicio ?? "9")
        : (a.distancia_km ?? 1e9) - (b.distancia_km ?? 1e9)), [todos, dist, valor, esp, tipo, turno, ordem]);
  const abrir = useCallback((id: string) => navegar(`/clinicas/${id}`), [navegar]);
  const pontos = useMemo(() => itens.filter((i) => i.clinica.latitude != null).map((i) => ({
    id: i.clinica.id, nome: i.clinica.nome, lat: i.clinica.latitude!, lng: i.clinica.longitude!,
    detalhe: [km(i.distancia_km), textoValor(i.clinica)].filter(Boolean).join(" · ") })), [itens]);
  const ativos = [dist, valor, esp, tipo, turno].filter(Boolean).length;

  if (dados.isError) {
    return (
      <div className="d-tela"><main className="d-corpo d-corpo--24 d-corpo--centro" role="alert">
        <Ilustracao nome="semInternet" texto="Celular sem sinal de internet" />
        <h1 className="d-h1">Não deu para buscar</h1>
        <p className="d-p d-p--grande">{mensagemDe(dados.error)}</p>
        <div className="d-fim"><Btn onClick={() => void dados.refetch()}>Tentar de novo</Btn></div>
      </main></div>
    );
  }

  return (
    <div className="d-tela">
      <header className="d-topo">
        <div className="d-topo-linha">
          <Simbolo tamanho={30} escuro />
          <span className="d-marca">UHealth</span>
          <BotaoAudio aoOuvir={() => document.querySelector("main")?.textContent ?? ""} />
          <BotaoLetras />
          <AtalhoAlertas />
          <AtalhoPerfil />
        </div>
        <h1 className="d-h1 d-h1--30 d-h1--claro">Escolha a clínica</h1>
        <div className="d-cidade">
          <Icone nome="local" />
          <span>{voce ? (gps ? "Perto da sua localização" : `Perto de ${perfil.data?.bairro || "você"}`) : "Sem endereço: distância indisponível"}</span>
          {!gps && <button type="button" onClick={usarGps}>Usar GPS</button>}
        </div>
      </header>

      <main className="d-corpo" style={{ gap: 14 }}>
        {!voce && perfil.data && <div className="d-aviso d-aviso--pequeno">Para ver a distância, <Link to="/perfil/endereco" style={{ color: "inherit" }}>cadastre seu endereço</Link> ou use o GPS.</div>}
        <div className="d-segs" role="group" aria-label="Como ver">
          {(["lista", "mapa"] as const).map((v) => (
            <label key={v} className={`d-op d-op--m${vista === v ? " d-op--on" : ""}`}>
              <input type="radio" name="vista" checked={vista === v} onChange={() => setVista(v)} />{v === "lista" ? "Lista" : "Mapa"}
            </label>
          ))}
        </div>
        <div className="d-linhaBtn">
          <Seletor id="ordem" rotulo="Ordenar por" valor={ordem} aoMudar={(v) => setOrdem(v as Ordem)}
            opcoes={[["distancia", "Mais perto"], ["valor", "Menor valor"], ["data", "Horário mais cedo"]]} />
        </div>
        <Btn variante="outline" aria-expanded={filtrosAbertos} onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
          <Icone nome="filtro" />Filtros{ativos ? ` (${ativos})` : ""}
        </Btn>
        {filtrosAbertos && (
          <section className="d-card" aria-label="Filtros" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Seletor id="f-dist" rotulo="Distância" valor={dist} aoMudar={setDist} opcoes={[["", "Qualquer"], ["5", "Até 5 km"], ["10", "Até 10 km"], ["20", "Até 20 km"]]} />
            <Seletor id="f-valor" rotulo="Valor" valor={valor} aoMudar={setValor} opcoes={[["", "Qualquer"], ["gratis", "Só gratuito"], ["50", "Até R$ 50"], ["100", "Até R$ 100"]]} />
            <Seletor id="f-esp" rotulo="Especialidade" valor={esp} aoMudar={setEsp} opcoes={[["", "Todas"], ...especialidades.map((e): [string, string] => [e, rotuloEspecialidade(e)])]} />
            <Seletor id="f-tipo" rotulo="Tipo" valor={tipo} aoMudar={setTipo} opcoes={[["", "Pública ou particular"], ["publica", "Pública"], ["privada", "Particular"]]} />
            <Seletor id="f-turno" rotulo="Turno" valor={turno} aoMudar={setTurno} opcoes={[["", "Qualquer"], ["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"]]} />
            {ativos > 0 && <Btn variante="link" onClick={() => { setDist(""); setValor(""); setEsp(""); setTipo(""); setTurno(""); }}>Limpar filtros</Btn>}
          </section>
        )}
        {dados.isPending && <p role="status" className="d-small">Buscando clínicas…</p>}
        {dados.data && <p role="status" className="d-small">{itens.length === 1 ? "1 clínica" : `${itens.length} clínicas`}{ativos ? " com esses filtros" : ""}</p>}
        {vista === "mapa" && dados.data && <MapaClinicas pontos={pontos} voce={voce} aoEscolher={abrir} />}
        <ul className="d-lista">
          {itens.map((i, n) => (
            <li key={i.clinica.id}>
              <article className={`d-card${n === 0 ? " d-card--sel" : ""}`} aria-labelledby={`c-${i.clinica.id}`}>
                <div className="d-card-topo">
                  <h2 id={`c-${i.clinica.id}`} className="d-h2">{i.clinica.nome}</h2>
                  {km(i.distancia_km) && <span className="d-small" style={{ whiteSpace: "nowrap" }}>{km(i.distancia_km)}</span>}
                </div>
                <p className="d-small">{i.clinica.universidade} · {i.clinica.tipo_instituicao === "publica" ? "pública" : "particular"}</p>
                <div className="d-chips">
                  <Chip tom={textoValor(i.clinica) === "Gratuito" ? "sun" : "neutral"}>{textoValor(i.clinica)}</Chip>
                  {(i.clinica.turnos ?? []).map((t) => <Chip key={t} tom="neutral">{TURNO[t as keyof typeof TURNO]}</Chip>)}
                </div>
                <p className="d-small">Atende: {i.clinica.especialidades.map(rotuloEspecialidade).join(", ")}</p>
                <p className="d-small"><b>Próximos horários:</b> {i.proximos_horarios.length ? i.proximos_horarios.map((h) => quando(h.inicio)).join(" · ") : "a clínica liga para combinar"}</p>
                <BtnLink compacto to={`/clinicas/${i.clinica.id}`}>Ver clínica e agendar</BtnLink>
              </article>
            </li>
          ))}
        </ul>
        <div className="d-fim">
          <LinhaSamu />
          <Link className="d-btn d-btn--link" to="/emergencia">Estou com uma emergência</Link>
        </div>
      </main>
    </div>
  );
}
