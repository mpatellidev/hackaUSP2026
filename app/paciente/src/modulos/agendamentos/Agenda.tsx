import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data as formatarData, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Btn, BtnLink, BtnTel, TelaCarregando } from "../../design/Componentes";
import { Ilustracao } from "../../design/Ilustracoes";
import { quando } from "../../design/datas";

/** Remarcar: escolhe outro horário livre da mesma clínica e especialidade (a clínica confirma o novo). */
function Remarcar({ agendamentoId, clinicaId, especialidade, aoFechar }: { agendamentoId: string; clinicaId: string; especialidade: string; aoFechar: () => void }) {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [vaga, setVaga] = useState<string | null>(null);
  const livres = useQuery({
    queryKey: ["horarios", clinicaId, especialidade],
    queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/horarios", { params: { path: { clinica_id: clinicaId }, query: { especialidade } } })),
  });
  const remarcar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/agendamentos/{agendamento_id}/remarcar", { params: { path: { agendamento_id: agendamentoId } }, body: { vaga_id: vaga! } })),
    onSuccess: () => qc.invalidateQueries(),
  });
  if (remarcar.isSuccess) {
    return (
      <section className="d-painel d-painel--20" role="status">
        <b>Novo horário pedido: {quando(remarcar.data.inicio)}.</b>
        <span>{remarcar.data.aviso}</span>
        <BtnLink to="/pedidos">Acompanhar pedido</BtnLink>
      </section>
    );
  }
  return (
    <section className="d-painel d-painel--20" aria-labelledby="h-remarcar">
      <b id="h-remarcar">Escolha o novo horário</b>
      {livres.isPending && <span role="status">Buscando horários…</span>}
      {livres.data && livres.data.itens.length === 0 && <span>Não há outro horário livre agora. Ligue para a clínica.</span>}
      <fieldset className="d-campos">
        <legend className="sr-only">Horários livres</legend>
        {livres.data?.itens.map((h) => (
          <label key={h.vaga_id} className={`d-op d-op--m${vaga === h.vaga_id ? " d-op--on" : ""}`}>
            <input type="radio" name="novo-horario" checked={vaga === h.vaga_id} onChange={() => setVaga(h.vaga_id)} />
            {quando(h.inicio)}
          </label>
        ))}
      </fieldset>
      <span className="d-small">O horário atual é liberado sem falta nem penalidade. O novo só vale quando a clínica confirmar.</span>
      {remarcar.isError && <b role="alert">{mensagemDe(remarcar.error)}</b>}
      <Btn aria-busy={remarcar.isPending || undefined} variante="escuro" disabled={!vaga || remarcar.isPending} onClick={() => remarcar.mutate()}>{remarcar.isPending ? "Pedindo…" : "Pedir este horário"}</Btn>
      <Btn variante="fantasma" onClick={aoFechar}>Manter o horário atual</Btn>
    </section>
  );
}

const FUSO = "America/Sao_Paulo";
const DIA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO });
const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: FUSO });

/** "Terça-feira, 14h" / "Quinta-feira, 9h30" (design P4: Horário confirmado). */
function diaEHora(iso: string): string {
  const d = new Date(iso);
  const dia = DIA.format(d);
  const [h, m] = HORA.format(d).split(":");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${Number(h)}h${m === "00" ? "" : m}`;
}

/** Arquivo de calendário (.ics) real, gerado no aparelho a partir do horário confirmado pela clínica. */
function linkCalendario(titulo: string, inicio: string, fim: string): string {
  const formato = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sorriu+//PT", "BEGIN:VEVENT", `UID:${formato(inicio)}@sorriumais`, `DTSTAMP:${formato(new Date().toISOString())}`,
    `DTSTART:${formato(inicio)}`, `DTEND:${formato(fim)}`, `SUMMARY:${titulo}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** Horário confirmado (design P4). Só aparece o que o backend confirmou. */
export function Agenda() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [cancelando, setCancelando] = useState(false);
  const [remarcando, setRemarcando] = useState(false);
  const lista = useQuery({ queryKey: ["agendamentos"], queryFn: () => api.dados(api.cliente.GET("/agendamentos", {})) });
  const cancelar = useMutation({
    mutationFn: (id: string) => api.dados(api.cliente.POST("/agendamentos/{agendamento_id}/cancelar", { params: { path: { agendamento_id: id } }, body: {} })),
    onSuccess: () => { setCancelando(false); return Promise.all([qc.invalidateQueries({ queryKey: ["agendamentos"] }), qc.invalidateQueries({ queryKey: ["solicitacoes"] })]); },
  });

  if (lista.isPending) return <TelaCarregando />;
  if (lista.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(lista.error)}</b></div>
        <Btn onClick={() => void lista.refetch()}>Tentar de novo</Btn>
      </main></div>
    );
  }
  const proximo = lista.data.itens.filter((a) => a.estado === "agendado").sort((a, b) => a.vaga.inicio.localeCompare(b.vaga.inicio))[0];

  if (!proximo) {
    return (
      <div className="d-tela">
        <main className="d-corpo d-corpo--centro">
          <Ilustracao nome="vagaPreenchida" texto="Relógio com o sol se pondo" />
          <h1 className="d-h1">Nenhum horário confirmado</h1>
          <p className="d-p d-p--grande">Quando a clínica confirmar um horário, ele aparece aqui.</p>
          <div className="d-fim"><BtnLink to="/pedidos">Ver meu pedido</BtnLink></div>
        </main>
      </div>
    );
  }

  return (
    <div className="d-tela d-tela--teal">
      <main className="d-corpo" style={{ padding: "32px 20px 20px" }}>
        <div className="d-vaga-topo" style={{ fontSize: "calc(19px * var(--d-s))" }}><Ilustracao nome="horarioConfirmado" /><span>Horário confirmado</span></div>
        <h1 className="d-h1 d-h1--claro" style={{ fontSize: "calc(34px * var(--d-s))", lineHeight: 1.15 }}>{diaEHora(proximo.vaga.inicio)}</h1>
        <section className="d-painel d-painel--20" aria-label="Detalhes do atendimento">
          <div><b>{proximo.clinica.nome}</b><br />{rotuloEspecialidade(proximo.vaga.especialidade)} · {formatarData(proximo.vaga.inicio)}</div>
          <div className="d-sep" />
          <div>Chegue 15 minutos antes e leve um documento com foto.</div>
        </section>
        {remarcando && <Remarcar agendamentoId={proximo.id} clinicaId={proximo.clinica.id} especialidade={proximo.vaga.especialidade} aoFechar={() => setRemarcando(false)} />}
        {cancelando && (
          <div className="d-aviso d-aviso--tinta" role="alert" style={{ fontSize: "calc(17px * var(--d-s))" }}>
            <b>Cancelar antes do horário não gera falta nem penalidade.</b> Seu pedido volta para análise da clínica.
            {cancelar.isError && <p style={{ margin: "8px 0 0" }}><b>{mensagemDe(cancelar.error)}</b></p>}
          </div>
        )}
        <div className="d-fim">
          {cancelando ? (
            <>
              <Btn aria-busy={cancelar.isPending || undefined} variante="escuro" disabled={cancelar.isPending} onClick={() => cancelar.mutate(proximo.id)}>{cancelar.isPending ? "Cancelando…" : "Cancelar este atendimento"}</Btn>
              <Btn variante="fantasma" onClick={() => setCancelando(false)}>Manter horário</Btn>
            </>
          ) : (
            <>
              <a className="d-btn d-btn--dark" download="atendimento-uhealth.ics" href={linkCalendario(`Atendimento — ${proximo.clinica.nome}`, proximo.vaga.inicio, proximo.vaga.fim)}>Adicionar ao calendário</a>
              {!remarcando && <Btn variante="claro" onClick={() => setRemarcando(true)}>Remarcar</Btn>}
              <BtnTel variante="claro" numero={proximo.clinica.telefone}>Ligar para a clínica</BtnTel>
              <Btn variante="fantasma" onClick={() => setCancelando(true)}>Não vou conseguir ir</Btn>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
