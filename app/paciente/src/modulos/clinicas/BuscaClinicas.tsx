import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { BotaoAudio, BotaoLetras } from "../../design/Preferencias";
import { Btn, BtnLink, Carregando, Chip, LinhaSamu } from "../../design/Componentes";
import { Icone, Simbolo } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { quando } from "../../design/datas";
import { AtalhoAlertas } from "../alertas/Alertas";
import { AtalhoPerfil } from "../perfil/Perfil";
import { TROCAR_PARA, salvarModo } from "../../modoAtendimento";
import { Marca } from "@uhealth/ui";

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

/** Emergência e troca para a assistente: só na página inicial, logo abaixo de "Escolha a clínica". */
function AcoesInicio() {
  const { api } = useSessao();
  return (
    <div className="d-troca">
      <Link className="d-emergencia-btn" to="/emergencia"><Icone nome="alerta" tamanho={20} />Emergência</Link>
      <button type="button" className="d-troca-btn" onClick={() => salvarModo(api, "conversa")}>
        <Icone nome="conversa" tamanho={20} />{TROCAR_PARA.conversa}
      </button>
    </div>
  );
}

/** Escolher clínica (comparar e agendar): distância, valor, tipo, especialidades e próximos horários. */
export function BuscaClinicas() {
  const { api } = useSessao();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
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
  const ativos = [dist, valor, esp, tipo, turno].filter(Boolean).length;
  const limparFiltros = () => { setDist(""); setValor(""); setEsp(""); setTipo(""); setTurno(""); };

  if (dados.isError) {
    return (
      <div className="d-tela"><AcoesInicio /><main className="d-corpo d-corpo--24 d-corpo--centro" role="alert">
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
          <Marca className="d-marca" />
          <BotaoAudio aoOuvir={() => document.querySelector("main")?.textContent ?? ""} />
          <BotaoLetras />
          <AtalhoAlertas />
          <AtalhoPerfil />
        </div>
        <h1 className="d-h1 d-h1--30 d-h1--claro">Escolha a clínica</h1>
        <div className="d-cidade">
          <Icone nome="local" />
          <span>{voce ? (gps ? "Perto da sua localização" : `Perto de ${perfil.data?.bairro || "você"}`) : <Link to="/perfil/endereco" style={{ color: "inherit" }}>Cadastrar endereço</Link>}</span>
          {!gps && <button type="button" onClick={usarGps}>Usar GPS</button>}
        </div>
      </header>
      <AcoesInicio />

      <main className="d-corpo" style={{ gap: 14 }}>
        <div className="d-linhaBtn d-linhaBtn--fim">
          <Seletor id="ordem" rotulo="Ordenar por" valor={ordem} aoMudar={(v) => setOrdem(v as Ordem)}
            opcoes={[["distancia", "Mais perto"], ["valor", "Menor valor"], ["data", "Horário mais cedo"]]} />
          <Btn variante="outline" aria-expanded={filtrosAbertos} onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
            <Icone nome="filtro" />Filtros{ativos ? ` (${ativos})` : ""}
          </Btn>
        </div>
        {filtrosAbertos && (
          <section className="d-card" aria-label="Filtros" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Seletor id="f-dist" rotulo="Distância" valor={dist} aoMudar={setDist} opcoes={[["", "Qualquer"], ["5", "Até 5 km"], ["10", "Até 10 km"], ["20", "Até 20 km"]]} />
            <Seletor id="f-valor" rotulo="Valor" valor={valor} aoMudar={setValor} opcoes={[["", "Qualquer"], ["gratis", "Só gratuito"], ["50", "Até R$ 50"], ["100", "Até R$ 100"]]} />
            <Seletor id="f-esp" rotulo="Especialidade" valor={esp} aoMudar={setEsp} opcoes={[["", "Todas"], ...especialidades.map((e): [string, string] => [e, rotuloEspecialidade(e)])]} />
            <Seletor id="f-tipo" rotulo="Tipo" valor={tipo} aoMudar={setTipo} opcoes={[["", "Pública ou particular"], ["publica", "Pública"], ["privada", "Particular"]]} />
            <Seletor id="f-turno" rotulo="Turno" valor={turno} aoMudar={setTurno} opcoes={[["", "Qualquer"], ["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"]]} />
            {ativos > 0 && <Btn variante="link" onClick={limparFiltros}>Limpar filtros</Btn>}
          </section>
        )}
        {dados.isPending && <Carregando texto="Buscando clínicas…" cartoes={3} />}
        {dados.data && <p role="status" className="d-small">{itens.length === 1 ? "1 clínica" : `${itens.length} clínicas`}{ativos ? " com esses filtros" : ""}</p>}
        {dados.data && itens.length === 0 && (
          <section className="d-card d-vazio" aria-labelledby="h-vazio">
            <Ilustracao nome="semClinica" />
            <h2 id="h-vazio" className="d-h2">{ativos ? "Nenhuma clínica com esses filtros" : "Nenhuma clínica encontrada"}</h2>
            <p className="d-small">{ativos ? "Tente tirar um filtro ou aumentar a distância." : "Confira o endereço no seu perfil ou use o GPS."}</p>
            {ativos > 0
              ? <Btn variante="outline" compacto onClick={limparFiltros}>Limpar filtros</Btn>
              : <BtnLink variante="outline" compacto to="/perfil/endereco">Revisar endereço</BtnLink>}
          </section>
        )}
        <ul className="d-lista">
          {itens.map((i, n) => (
            <li key={i.clinica.id}>
              <article className={`d-card${n === 0 ? " d-card--sel" : ""}`} aria-labelledby={`c-${i.clinica.id}`}>
                <div className="d-card-topo">
                  <h2 id={`c-${i.clinica.id}`} className="d-h2">{i.clinica.nome}</h2>
                  {km(i.distancia_km) && <span className="d-distancia"><Icone nome="local" tamanho={16} /><span className="sr-only">Distância: </span>{km(i.distancia_km)}</span>}
                </div>
                <p className="d-small d-card-meta"><Icone nome="clinica" tamanho={20} /><span>{i.clinica.universidade} · {i.clinica.tipo_instituicao === "publica" ? "pública" : "particular"}</span></p>
                <div className="d-chips">
                  <Chip tom={textoValor(i.clinica) === "Gratuito" ? "sun" : "neutral"}>{textoValor(i.clinica)}</Chip>
                  {(i.clinica.turnos ?? []).map((t) => <Chip key={t} tom="neutral">{TURNO[t as keyof typeof TURNO]}</Chip>)}
                </div>
                <p className="d-small">Atende: {i.clinica.especialidades.map(rotuloEspecialidade).join(", ")}</p>
                <p className="d-small d-card-meta"><Icone nome="horario" tamanho={20} /><span><b>Próximos horários:</b> {i.proximos_horarios.length ? i.proximos_horarios.map((h) => quando(h.inicio)).join(" · ") : "a clínica liga para combinar"}</span></p>
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
