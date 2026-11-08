import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PUBLICO, mensagemDe, rotuloEspecialidade, useSessao, useUsuario, type PublicoAlvo } from "@uhealth/api-client";
import { Btn, BtnLink, Linhas, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { linkComoChegar } from "../urgencia/Urgencia";
import { textoValor } from "./BuscaClinicas";

type Passo = "clinica" | "especialidade" | "horario" | "dados" | "revisao" | "comprovante";
const FUSO = "America/Sao_Paulo";
const DIA_CHAVE = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const DIA_LONGO = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO });
const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
const DIAS = [["seg", "Segunda"], ["ter", "Terça"], ["qua", "Quarta"], ["qui", "Quinta"], ["sex", "Sexta"], ["sab", "Sábado"], ["dom", "Domingo"]] as const;
const ETAPAS: Passo[] = ["especialidade", "horario", "dados", "revisao"];
const formatarTelefone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const meio = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
};
const diaHora = (iso: string) => `${DIA_LONGO.format(new Date(iso))}, às ${HORA.format(new Date(iso))}`;

function Progresso({ passo }: { passo: Passo }) {
  const i = ETAPAS.indexOf(passo);
  if (i < 0) return null;
  return (
    <>
      <p className="d-small" aria-live="polite">Passo {i + 1} de {ETAPAS.length}</p>
      <div className="d-progresso" role="presentation"><div style={{ width: `${((i + 1) / ETAPAS.length) * 100}%` }} /></div>
    </>
  );
}

/** Página da clínica + agendamento manual: clínica → especialidade → data e horário → dados → revisão → comprovante.
 *  O horário escolhido fica reservado no pedido e a clínica confirma (urgência avaliada e prioridade continuam valendo). */
export function AgendarClinica() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const usuario = useUsuario();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const clinica = useQuery({ queryKey: ["clinica", id], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: id } } })) });
  const [passo, setPasso] = useState<Passo>("clinica");
  const [esp, setEsp] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [horario, setHorario] = useState<{ vaga_id: string; inicio: string } | "sem" | null>(null);
  const [paraQuem, setParaQuem] = useState<"mim" | "outra">("mim");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [motivo, setMotivo] = useState("");
  const [publico, setPublico] = useState<PublicoAlvo | null>(null);
  const [tentou, setTentou] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const horarios = useQuery({
    queryKey: ["horarios", id, esp], enabled: !!esp && passo === "horario",
    queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/horarios", { params: { path: { clinica_id: id }, query: { especialidade: esp! } } })),
  });
  const confirmar = useMutation({
    mutationFn: async () => {
      const c = clinica.data!;
      const pedido = await api.dados(api.cliente.POST("/solicitacoes", { body: {
        clinica_id: id, especialidade: esp!, publico_alvo: publico ?? (c.publico.includes("adultos") ? "adultos" : c.publico[0]),
        descricao_administrativa: motivo.trim(), para_quem: paraQuem, nome_paciente: paraQuem === "outra" ? nome.trim() : usuario.nome_exibicao,
        telefone_contato: telefone } }));
      let erroHorario: string | null = null;
      if (horario && horario !== "sem") {
        try {
          await api.dados(api.cliente.POST("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: horario.vaga_id } }, body: { solicitacao_id: pedido.id } }));
        } catch (e) { erroHorario = mensagemDe(e); }
      }
      return { pedido, erroHorario };
    },
    onSuccess: () => { void qc.invalidateQueries(); setPasso("comprovante"); },
  });

  if (clinica.isPending) return <div className="d-tela"><main className="d-corpo"><p role="status" className="d-small">Carregando…</p></main></div>;
  if (clinica.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para="/clinicas" />
        <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(clinica.error)}</b></div>
        <Btn onClick={() => void clinica.refetch()}>Tentar de novo</Btn>
      </main></div>
    );
  }
  const c = clinica.data;
  const voltar = (p: Passo) => <button type="button" className="d-voltar" onClick={() => setPasso(p)}><Icone nome="voltar" tamanho={20} />Voltar</button>;

  // ---------- 1. a clínica ----------
  if (passo === "clinica") {
    return (
      <div className="d-tela"><main className="d-corpo" style={{ gap: 14 }}>
        <Voltar para="/clinicas">Clínicas</Voltar>
        <h1 className="d-h1">{c.nome}</h1>
        <p className="d-small">{c.universidade} · {c.tipo_instituicao === "publica" ? "pública" : "particular"}</p>
        <Linhas rotulo="Sobre a clínica" itens={[
          ["Valor da consulta", textoValor(c)],
          ["Endereço", c.endereco ? `${c.endereco}, ${c.bairro} · ${c.cidade}/${c.uf}` : `${c.cidade}/${c.uf}`],
          ["Telefone", c.telefone],
        ]} />
        <a className="d-btn d-btn--outline" href={linkComoChegar(c)} target="_blank" rel="noreferrer"><Icone nome="local" />Como chegar</a>
        {c.como_chegar && <p className="d-p d-p--texto"><b>Transporte:</b> {c.como_chegar}</p>}
        <p className="d-p d-p--texto"><b>Acessibilidade:</b> {c.acessibilidade_info ?? (c.acessivel ? "Acesso sem degraus." : "Sem informação.")}</p>
        <section aria-labelledby="h-func"><h2 id="h-func" className="d-h2">Horário de funcionamento</h2>
          <Linhas itens={DIAS.map(([k, nomeDia]) => [nomeDia, c.horarios_funcionamento?.[k] ? `${c.horarios_funcionamento[k]![0]} às ${c.horarios_funcionamento[k]![1]}` : "Fechada"] as [string, string])} />
          {c.atende_urgencia && <p className="d-small">Atende urgência{c.horario_urgencia?.dom ? " 24 horas" : " no horário indicado pela clínica"}.</p>}
        </section>
        <p className="d-small">Atende: {c.especialidades.map(rotuloEspecialidade).join(", ")}</p>
        <div className="d-fim">
          {c.recebendo_pedidos
            ? <Btn onClick={() => setPasso("especialidade")}>Agendar nesta clínica</Btn>
            : <div className="d-aviso d-aviso--perigo" role="status"><b>Esta clínica não está recebendo pedidos agora.</b></div>}
        </div>
      </main></div>
    );
  }

  // ---------- 6. comprovante ----------
  if (passo === "comprovante" && confirmar.data) {
    const p = confirmar.data.pedido;
    return (
      <div className="d-tela"><main className="d-corpo d-corpo--24" style={{ gap: 14 }}>
        <div style={{ alignSelf: "center" }}><Ilustracao nome="enviado" texto="Envelope com marca de confirmação" /></div>
        <h1 className="d-h1 d-h1--30">Pedido de agendamento enviado</h1>
        <section className="d-card" aria-label="Comprovante">
          <b>Comprovante · protocolo {p.id.slice(0, 8).toUpperCase()}</b>
          <Linhas itens={[
            ["Clínica", c.nome],
            ["Endereço", c.endereco ? `${c.endereco}, ${c.bairro}` : c.cidade],
            ["Atendimento", rotuloEspecialidade(esp!)],
            ["Horário pedido", horario && horario !== "sem" && !confirmar.data.erroHorario ? diaHora(horario.inicio) : "A clínica liga para combinar"],
            ["Valor", textoValor(c)],
            ["Situação", "Aguardando confirmação da clínica"],
          ]} />
        </section>
        {confirmar.data.erroHorario && <div className="d-aviso d-aviso--perigo" role="alert"><b>O horário escolhido acabou de ser ocupado ({confirmar.data.erroHorario}). Seu pedido foi enviado mesmo assim; veja outros horários no acompanhamento.</b></div>}
        <div className="d-aviso d-aviso--14">Só é consulta marcada quando a clínica confirmar. Você recebe um aviso no app.</div>
        <div className="d-fim">
          <BtnLink to={`/pedidos/${p.id}`}>Acompanhar pedido</BtnLink>
          <Btn variante="outline" onClick={() => window.print()}>Imprimir comprovante</Btn>
          <Btn variante="link" onClick={() => navegar("/clinicas")}>Voltar ao início</Btn>
        </div>
      </main></div>
    );
  }

  // ---------- 2. especialidade ----------
  if (passo === "especialidade") {
    return (
      <div className="d-tela"><main className="d-corpo" style={{ gap: 14 }}>
        {voltar("clinica")}
        <Progresso passo={passo} />
        <h1 className="d-h1">Que atendimento você precisa?</h1>
        <fieldset className="d-campos">
          <legend className="sr-only">Especialidade</legend>
          {c.especialidades.map((e) => (
            <label key={e} className={`d-op d-op--m${esp === e ? " d-op--on" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", padding: "10px 14px" }}>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input type="radio" name="esp" checked={esp === e} onChange={() => { setEsp(e); setDia(null); setHorario(null); }} />{rotuloEspecialidade(e)}
              </span>
              {e === "triagem" && <span className="d-small" style={{ fontWeight: 400 }}>Começo da trilha de cuidado: avaliação completa e plano de tratamento.</span>}
            </label>
          ))}
        </fieldset>
        <p className="d-small">Dor forte ou dente quebrado agora? Use o botão Emergência na página inicial ou <a href="tel:192">ligue 192 (SAMU)</a>.</p>
        <div className="d-fim"><Btn disabled={!esp} onClick={() => setPasso("horario")}>Continuar</Btn></div>
      </main></div>
    );
  }

  // ---------- 3. data e horário (calendário com a disponibilidade real) ----------
  if (passo === "horario") {
    const lista = horarios.data?.itens ?? [];
    const porDia = new Map<string, typeof lista>();
    for (const h of lista) {
      const k = DIA_CHAVE.format(new Date(h.inicio));
      porDia.set(k, [...(porDia.get(k) ?? []), h]);
    }
    const hoje = new Date();
    const dias = Array.from({ length: 21 }, (_, i) => new Date(hoje.getTime() + i * 864e5));
    const vazios = (dias[0].getDay() + 6) % 7; // grade começa na segunda
    return (
      <div className="d-tela"><main className="d-corpo" style={{ gap: 14 }}>
        {voltar("especialidade")}
        <Progresso passo={passo} />
        <h1 className="d-h1">Escolha o dia e o horário</h1>
        <p className="d-small">{rotuloEspecialidade(esp!)} · {c.nome}</p>
        {horarios.isPending && <p role="status" className="d-small">Buscando horários livres…</p>}
        {horarios.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(horarios.error)}</b></div>}
        <div className="d-calendario" role="grid" aria-label="Próximas 3 semanas. Dias com ponto têm horário livre.">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <span key={i} className="d-cal-cab" aria-hidden="true">{d}</span>)}
          {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
          {dias.map((d) => {
            const k = DIA_CHAVE.format(d);
            const livres = porDia.get(k)?.length ?? 0;
            return (
              <button key={k} type="button" role="gridcell" className={`d-cal-dia${livres ? "" : " d-cal-dia--vazio"}${dia === k ? " d-cal-dia--on" : ""}`}
                aria-pressed={dia === k} aria-label={`${DIA_LONGO.format(d)}: ${livres ? `${livres} horário${livres > 1 ? "s" : ""} livre${livres > 1 ? "s" : ""}` : "sem horário"}`}
                onClick={() => { setDia(k); setHorario(null); }}>
                {d.getDate()}{livres > 0 && <span className="d-cal-ponto" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {dia && !porDia.get(dia)?.length && (
          <div className="d-aviso d-aviso--pequeno" role="status">
            <b>Nenhum horário livre em {DIA_LONGO.format(new Date(`${dia}T12:00:00-03:00`))}.</b> Escolha um dia com ponto amarelo ou peça para a clínica ligar.
          </div>
        )}
        {dia && !!porDia.get(dia)?.length && (
          <fieldset className="d-campos">
            <legend>Horários de {DIA_LONGO.format(new Date(`${dia}T12:00:00-03:00`))}</legend>
            <div className="d-chips" style={{ gap: 10 }}>
              {porDia.get(dia)!.map((h) => {
                const on = horario !== null && horario !== "sem" && horario.vaga_id === h.vaga_id;
                return (
                  <label key={h.vaga_id} className={`d-op d-op--m${on ? " d-op--on" : ""}`} style={{ flex: "0 1 auto" }}>
                    <input type="radio" name="hora" checked={on} onChange={() => setHorario({ vaga_id: h.vaga_id, inicio: h.inicio })} />{HORA.format(new Date(h.inicio))}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {horarios.data && lista.length === 0 && <p className="d-p">Esta clínica não tem horário livre nas próximas semanas para este atendimento.</p>}
        <label className={`d-op d-op--m${horario === "sem" ? " d-op--on" : ""}`}>
          <input type="radio" name="hora" checked={horario === "sem"} onChange={() => { setHorario("sem"); setDia(null); }} />Nenhum serve: a clínica me liga para combinar
        </label>
        <div className="d-fim"><Btn disabled={!horario} onClick={() => setPasso("dados")}>Continuar</Btn></div>
      </main></div>
    );
  }

  // ---------- 4. dados ----------
  if (passo === "dados") {
    const telOk = telefone.replace(/\D/g, "").length >= 10;
    const nomeOk = paraQuem === "mim" || nome.trim().length >= 2;
    const motivoOk = motivo.trim().length >= 3;
    const pubOk = c.publico.length <= 1 || !!publico;
    const seguir = (e: FormEvent) => { e.preventDefault(); setTentou(true); if (telOk && nomeOk && motivoOk && pubOk) setPasso("revisao"); };
    return (
      <div className="d-tela"><form className="d-corpo" style={{ gap: 14 }} onSubmit={seguir} noValidate>
        {voltar("horario")}
        <Progresso passo={passo} />
        <h1 className="d-h1">Seus dados</h1>
        <fieldset className="d-campos">
          <legend>Para quem é o atendimento?</legend>
          <div className="d-segs">
            {(["mim", "outra"] as const).map((v) => (
              <label key={v} className={`d-op d-op--m${paraQuem === v ? " d-op--on" : ""}`}>
                <input type="radio" name="quem" checked={paraQuem === v} onChange={() => setParaQuem(v)} />{v === "mim" ? "Para mim" : "Outra pessoa"}
              </label>
            ))}
          </div>
        </fieldset>
        {paraQuem === "outra" && (
          <div className="d-campo">
            <label htmlFor="ag-nome">Nome completo de quem será atendido</label>
            <input id="ag-nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} aria-invalid={tentou && !nomeOk} />
            {tentou && !nomeOk && <p className="d-small" role="alert">Digite o nome.</p>}
          </div>
        )}
        {c.publico.length > 1 && (
          <fieldset className="d-campos">
            <legend>Quem será atendido?</legend>
            {c.publico.map((p) => (
              <label key={p} className={`d-op d-op--m${publico === p ? " d-op--on" : ""}`}><input type="radio" name="pub" checked={publico === p} onChange={() => setPublico(p)} />{PUBLICO[p]}</label>
            ))}
            {tentou && !pubOk && <p className="d-small" role="alert">Escolha uma opção.</p>}
          </fieldset>
        )}
        <div className="d-campo">
          <label htmlFor="ag-tel">Telefone para contato (com DDD)</label>
          <input id="ag-tel" type="tel" inputMode="tel" placeholder="(11) 91234-5678" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} aria-invalid={tentou && !telOk} />
          {tentou && !telOk && <p className="d-small" role="alert">Digite o telefone com DDD.</p>}
        </div>
        <div className="d-campo">
          <label htmlFor="ag-motivo">Em poucas palavras, do que você precisa?</label>
          <textarea id="ag-motivo" value={motivo} maxLength={280} onChange={(e) => setMotivo(e.target.value)} aria-invalid={tentou && !motivoOk} placeholder="Ex.: avaliação de rotina" />
          {tentou && !motivoOk && <p className="d-small" role="alert">Escreva pelo menos 3 letras.</p>}
        </div>
        <div className="d-fim"><Btn type="submit">Continuar</Btn></div>
      </form></div>
    );
  }

  // ---------- 5. revisão ----------
  return (
    <div className="d-tela"><main className="d-corpo" style={{ gap: 14 }}>
      {voltar("dados")}
      <Progresso passo={passo} />
      <h1 className="d-h1">Revise antes de confirmar</h1>
      <Linhas rotulo="Resumo do agendamento" itens={[
        ["Clínica", c.nome],
        ["Endereço", c.endereco ? `${c.endereco}, ${c.bairro}` : c.cidade],
        ["Atendimento", rotuloEspecialidade(esp!)],
        ["Dia e horário", horario && horario !== "sem" ? diaHora(horario.inicio) : "A clínica liga para combinar"],
        ["Valor", textoValor(c)],
        ["Paciente", paraQuem === "outra" ? nome.trim() : usuario.nome_exibicao],
        ["Telefone", telefone],
        ["Motivo", motivo.trim()],
      ]} />
      <label className="d-consent">
        <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
        Autorizo a {c.nome} a ver estes dados para analisar meu pedido.
      </label>
      <p className="d-small">O horário fica reservado no seu pedido. Só é consulta marcada quando a clínica confirmar.</p>
      {confirmar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(confirmar.error)}</b></div>}
      <div className="d-fim">
        <Btn disabled={!autorizo || confirmar.isPending} onClick={() => confirmar.mutate()}>{confirmar.isPending ? "Enviando…" : "Confirmar agendamento"}</Btn>
        <Btn variante="outline" onClick={() => setPasso("dados")}>Corrigir algo</Btn>
      </div>
    </main></div>
  );
}
