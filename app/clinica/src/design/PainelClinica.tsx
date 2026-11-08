import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ESTADO_PEDIDO, FUNCAO, PUBLICO, data, dataHora, hora, mensagemDe, rotuloEspecialidade, useSessao, useUsuario, type Clinica, type Profissional, type Vaga } from "@uhealth/api-client";
import { useClinicaAtual } from "../modulos/clinicaAtual";
import { FUNCOES_QUE_EDITAM, PEDE_MOTIVO, PROXIMOS, diasDeEspera, protocolo, useAcoesPainel, useEventos, useInteressados, usePainel, type EstadoPedido, type ItemFila, type NovoEstado, type Pedido } from "./dados";
import { Icone, Simbolo, type NomeIcone } from "./Icone";
import "./clinica.css";
import { Marca } from "@uhealth/ui";

/* Painel administrativo da clínica. Dados reais da API, no escopo do token (a clínica vem do servidor).
   Regras de estado, vaga e prioridade são do backend; aqui só mostramos e pedimos. */

type Pagina = "solicitacoes" | "triagem" | "servicos" | "pacientes" | "configuracoes";
type Aba = "Todas" | EstadoPedido;
type AbaServico = "Todos" | "Com vagas" | "Sem vagas";
type Janela = { tipo: "perfil" } | { tipo: "servico"; especialidade: string } | { tipo: "publicar"; especialidade?: string } | null;

const TITULOS: Record<Pagina, string> = { solicitacoes: "Solicitações", triagem: "Triagem", servicos: "Serviços e vagas", pacientes: "Pacientes", configuracoes: "Configurações" };
const DESCRICOES: Record<Pagina, string> = {
  solicitacoes: "Gerencie os pedidos recebidos pela clínica.",
  triagem: "Organize a fila e registre o próximo passo de cada pessoa.",
  servicos: "Veja as especialidades da clínica, publique vagas e confirme quem será atendido.",
  pacientes: "Conheça as necessidades de quem procura sua clínica.",
  configuracoes: "Atualize os dados e o recebimento de solicitações.",
};
const MENU: [Pagina, NomeIcone][] = [["solicitacoes", "caixa"], ["triagem", "pessoas"], ["servicos", "grade"], ["pacientes", "coracao"]];
const ABAS: Aba[] = ["Todas", ...(Object.keys(ESTADO_PEDIDO) as EstadoPedido[])];
const ABAS_SERVICO: AbaServico[] = ["Todos", "Com vagas", "Sem vagas"];
const TODOS_SERVICOS = "Todos os serviços";
const ROTA = /^#\/clinicas\/[^/]+\/(solicitacoes|triagem|servicos|pacientes|configuracoes)$/;
const SELO: Record<EstadoPedido, { tom: string; icone: NomeIcone }> = {
  enviada: { tom: "", icone: "caixa" },
  em_analise: { tom: " d-warning", icone: "relogio" },
  precisa_contato: { tom: " d-warning", icone: "telefone" },
  aguardando_confirmacao: { tom: " d-warning", icone: "relogio" },
  agendada: { tom: "", icone: "confirmado" },
  concluida: { tom: " d-neutral", icone: "confirmado" },
  indisponivel: { tom: " d-neutral", icone: "fechar" },
};
const ESTADO_VAGA: Record<Vaga["estado"], string> = { aberta: "Aberta", preenchida: "Preenchida", cancelada: "Cancelada" };

/** Página aberta pelo link, por exemplo `#/clinicas/<id>/servicos`. A clínica sempre é a do token. */
const paginaInicial = (): Pagina => (location.hash.match(ROTA)?.[1] as Pagina | undefined) ?? "solicitacoes";
const iniciais = (nome: string) => nome.split(" ").filter((p) => /^[A-ZÀ-Ú]/.test(p)).slice(0, 2).map((p) => p[0]).join("") || "UH";

/** Situação com ícone e texto (rótulo do backend). */
function Selo({ estado }: { estado: EstadoPedido }) {
  return <span className={`d-badge${SELO[estado].tom}`}><Icone nome={SELO[estado].icone} />{ESTADO_PEDIDO[estado].rotulo}</span>;
}

function Carregando() {
  return <div className="d-panel d-empty" role="status">Carregando…</div>;
}

function Falha({ erro, aoTentar }: { erro: unknown; aoTentar: () => void }) {
  return (
    <div className="d-panel d-empty" role="alert">
      <h2>Não foi possível carregar</h2><p>{mensagemDe(erro)}</p>
      <button type="button" className="d-button" onClick={aoTentar}>Tentar de novo</button>
    </div>
  );
}

/** Ação principal do pedido, de acordo com o estado (o backend valida a mudança). */
function AcaoPedido({ p, ocupado, aoTriar, aoConcluir }: { p: Pedido; ocupado: boolean; aoTriar: () => void; aoConcluir: () => void }) {
  if (p.estado === "agendada") {
    return <button type="button" className="d-button d-primary" disabled={ocupado} onClick={aoConcluir}><Icone nome="confirmado" /> Registrar conclusão</button>;
  }
  if (!PROXIMOS[p.estado]) return <button type="button" className="d-button d-primary" disabled>{ESTADO_PEDIDO[p.estado].rotulo}</button>;
  return (
    <button type="button" className="d-button d-primary" disabled={ocupado} onClick={aoTriar}>
      <Icone nome="pessoas" /> {p.estado === "enviada" ? "Iniciar triagem" : "Continuar triagem"}
    </button>
  );
}

/** Detalhes da solicitação: resumo ao lado da tabela ou perfil completo na janela. */
function Perfil({ p, completo = false, acao, aoVerPerfil }: { p: Pedido; completo?: boolean; acao: ReactNode; aoVerPerfil?: () => void }) {
  const dias = diasDeEspera(p.criado_em);
  const contato = (
    <div className="d-details">
      <div className="d-detail"><small>Telefone de contato</small>{p.telefone_contato ?? "Não informado"}</div>
      <div className="d-detail"><small>Pedido feito</small>{p.para_quem === "outra" ? `por outra pessoa${p.nome_paciente ? ` (para ${p.nome_paciente})` : ""}` : "pela própria pessoa"}</div>
    </div>
  );
  return (
    <aside className={`d-panel d-profile${completo ? " d-is-full" : ""}`}>
      <div className="d-profile-heading"><span className="d-eyebrow">Detalhes da solicitação</span><span className="d-profile-id">#{protocolo(p.id)}</span></div>
      <div className="d-profile-identity"><h2>{p.paciente_nome_exibicao}</h2><p>{PUBLICO[p.publico_alvo]}</p></div>
      <Selo estado={p.estado} />
      <div className="d-profile-service"><span className="d-eyebrow">Serviço solicitado</span><h3>{rotuloEspecialidade(p.especialidade)}</h3>{completo && <p>{p.descricao_administrativa}</p>}</div>
      <div className="d-detail"><small>Tempo de espera</small><strong>{dias} {dias === 1 ? "dia" : "dias"}</strong><span className="d-muted"> · desde {data(p.criado_em)}</span></div>
      {completo ? contato : (
        <details className="d-disclosure"><summary>Contato e informações complementares</summary><p className="d-muted">{p.descricao_administrativa}</p>{contato}</details>
      )}
      {completo && dias >= 19 && <p className="d-profile-footer">Tempo de espera e barreiras devem ser avaliados pela equipe.</p>}
      <div className="d-profile-actions">
        {acao}
        {!completo && <button type="button" className="d-text-button" onClick={aoVerPerfil}>Ver perfil completo <Icone nome="seta" /></button>}
      </div>
    </aside>
  );
}

function Historico({ p }: { p: Pedido }) {
  const eventos = useEventos(p.id);
  return (
    <>
      <h3 style={{ marginTop: 24 }}>Histórico da solicitação</h3>
      {eventos.isPending && <p className="d-muted" role="status">Carregando…</p>}
      {eventos.isError && <p className="d-muted" role="alert">{mensagemDe(eventos.error)}</p>}
      {eventos.data && (
        <ol className="d-timeline">
          {eventos.data.itens.map((e) => (
            <li key={e.id}>
              <time dateTime={e.criado_em}>{dataHora(e.criado_em)}</time>
              {e.estado_novo ? ESTADO_PEDIDO[e.estado_novo].rotulo : "Registro"}{e.motivo && <p className="d-triage-observation">{e.motivo}</p>}
            </li>
          ))}
        </ol>
      )}
      <p className="d-muted" style={{ fontSize: 12 }}>Dados fictícios de demonstração. Nenhuma mensagem é enviada pelo painel.</p>
    </>
  );
}

function Tabela({ lista, total, idSelecionado, aoEscolher }: { lista: Pedido[]; total: number; idSelecionado: string | null; aoEscolher: (id: string) => void }) {
  return (
    <>
      <div className="d-table-scroll">
        <table>
          <caption>Solicitações da clínica</caption>
          <thead><tr><th scope="col">Paciente</th><th scope="col">Serviço solicitado</th><th scope="col">Espera</th><th scope="col">Situação</th></tr></thead>
          <tbody>
            {lista.length ? lista.map((p) => (
              <tr key={p.id} className={p.id === idSelecionado ? "d-selected" : undefined}>
                <td>
                  <div className="d-patient-cell"><div>
                    <button type="button" className="d-patient-name" onClick={() => aoEscolher(p.id)} aria-label={`Ver perfil de ${p.paciente_nome_exibicao}`}>{p.paciente_nome_exibicao}</button>
                    <small>#{protocolo(p.id)} · {PUBLICO[p.publico_alvo]}</small>
                  </div></div>
                </td>
                <td>{rotuloEspecialidade(p.especialidade)}</td>
                <td>{diasDeEspera(p.criado_em)} dias</td>
                <td><Selo estado={p.estado} /></td>
              </tr>
            )) : <tr><td colSpan={4} className="d-empty">Nenhuma solicitação encontrada com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="d-table-footer"><span>{lista.length} de {total} solicitações</span><span>Dados de demonstração</span></div>
    </>
  );
}

/** Registro da equipe sobre um pedido da fila. Recriado a cada pedido (chave = id). */
function Triagem({ fila, aviso, p, ocupado, erro, aoEscolher, aoIr, aoSalvar }: {
  fila: ItemFila[]; aviso: string; p?: Pedido; ocupado: boolean; erro: unknown;
  aoEscolher: (id: string) => void; aoIr: (pagina: Pagina) => void; aoSalvar: (estado: NovoEstado, motivo: string | null) => void;
}) {
  const opcoes = p ? PROXIMOS[p.estado] ?? [] : [];
  const [resultado, setResultado] = useState<NovoEstado | undefined>(opcoes[0]);
  if (!p) {
    return (
      <div className="d-panel d-empty">
        <Icone nome="confirmado" /><h2>Nenhuma pessoa na triagem</h2><p>Os pedidos ativos da clínica aparecem aqui.</p>
        <button type="button" className="d-button" onClick={() => aoIr("solicitacoes")}>Ver solicitações</button>
      </div>
    );
  }
  function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const motivo = String(new FormData(e.currentTarget).get("motivo") ?? "").trim();
    if (resultado) aoSalvar(resultado, motivo || null);
  }
  return (
    <div className="d-triage-layout">
      <div className="d-queue" aria-label="Fila sugerida">
        {fila.map((f) => (
          <button type="button" key={f.solicitacao_id} className={`d-queue-card${f.solicitacao_id === p.id ? " d-active" : ""}`} onClick={() => aoEscolher(f.solicitacao_id)}>
            <div>
              <b>{f.posicao}. {f.paciente_nome_exibicao}</b>
              <p>{rotuloEspecialidade(f.especialidade)}</p>
              {f.urgencia_avaliada && <span className="d-badge d-danger"><Icone nome="ajuda" />Urgência avaliada</span>}
              <small>{diasDeEspera(f.criado_em)} dias de espera · {ESTADO_PEDIDO[f.estado as EstadoPedido]?.rotulo ?? f.estado}</small>
            </div>
          </button>
        ))}
      </div>
      <form className="d-panel d-form-panel" onSubmit={salvar}>
        <span className="d-eyebrow">Registro da equipe</span>
        <h2 style={{ marginTop: 8 }}>Triagem de {p.paciente_nome_exibicao}</h2>
        <p className="d-muted" style={{ fontSize: 13, marginTop: 8 }}>{rotuloEspecialidade(p.especialidade)} · “{p.descricao_administrativa}”</p>
        <p className="d-profile-footer">{aviso}</p>
        {opcoes.length ? (
          <div className="d-form-grid">
            <label className="d-field d-full">Resultado
              <select name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value as NovoEstado)}>
                {opcoes.map((o) => <option key={o} value={o}>{ESTADO_PEDIDO[o].rotulo}</option>)}
              </select>
            </label>
            <label className="d-field d-full">Motivo administrativo{resultado && PEDE_MOTIVO.includes(resultado) ? "" : " (opcional)"}
              <textarea name="motivo" maxLength={280} required={!!resultado && PEDE_MOTIVO.includes(resultado)} placeholder="Ex.: confirmar disponibilidade de transporte. Nunca escreva dado clínico." />
            </label>
          </div>
        ) : (
          <div className="d-notice" style={{ margin: "22px 0" }}><strong>{ESTADO_PEDIDO[p.estado].rotulo}</strong>{ESTADO_PEDIDO[p.estado].explica} Confirme a pessoa em Serviços e vagas.</div>
        )}
        <div className="d-notice"><strong>Para agendar</strong>Publique uma vaga em Serviços e vagas. A pessoa demonstra interesse e a clínica confirma uma única pessoa. O diagnóstico e a avaliação clínica pertencem ao prontuário profissional.</div>
        {!!erro && <div className="d-notice" role="alert" style={{ marginTop: 12 }}><strong>Não foi possível salvar</strong>{mensagemDe(erro)}</div>}
        <div className="d-modal-actions">
          <button type="button" className="d-button" onClick={() => aoIr("solicitacoes")}>Voltar</button>
          {opcoes.length > 0 && <button className="d-button d-primary" disabled={ocupado}><Icone nome="confirmado" /> {ocupado ? "Salvando…" : "Salvar triagem"}</button>}
        </div>
        <p className="d-profile-footer">A ordem da fila é sugestão; a decisão é da equipe. Nenhuma mensagem é enviada pelo painel.</p>
      </form>
    </div>
  );
}

function Catalogo({ especialidades, vagas, profissionais, pedidos, publico, aba, aoTrocarAba, aoGerenciar }: {
  especialidades: string[]; vagas: Vaga[]; profissionais: Profissional[]; pedidos: Pedido[]; publico: Clinica["publico"];
  aba: AbaServico; aoTrocarAba: (a: AbaServico) => void; aoGerenciar: (especialidade: string) => void;
}) {
  const abertas = (e: string) => vagas.filter((v) => v.especialidade === e && v.estado === "aberta").length;
  const lista = especialidades.filter((e) => aba === "Todos" || (aba === "Com vagas") === abertas(e) > 0);
  return (
    <>
      <div className="d-service-toolbar">
        <div className="d-tabs" aria-label="Filtrar serviços">
          {ABAS_SERVICO.map((t) => (
            <button type="button" key={t} className={`d-tab${t === aba ? " d-active" : ""}`} aria-pressed={t === aba} onClick={() => aoTrocarAba(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="d-service-grid">
        {lista.length ? lista.map((e) => {
          const profs = profissionais.filter((p) => p.especialidade === e);
          const aguardando = pedidos.filter((p) => p.especialidade === e && PROXIMOS[p.estado] && p.estado !== "agendada").length;
          return (
            <article key={e} className="d-panel d-service-card">
              <div className="d-service-card-head">
                <div><h2>{rotuloEspecialidade(e)}</h2><span className="d-service-type">{profs.length} profissional(is) ativo(s)</span></div>
                <span className="d-service-capacity"><b>{abertas(e)}</b> vagas abertas</span>
              </div>
              <p>{aguardando} pedido(s) ativo(s) nesta especialidade.</p>
              <details className="d-disclosure">
                <summary>Profissionais e público atendido</summary>
                <dl>
                  <dt>Profissionais ativos</dt><dd>{profs.length ? profs.map((p) => p.nome_exibicao).join(", ") : "Nenhum profissional ativo cadastrado."}</dd>
                  <dt>Público atendido pela clínica</dt><dd>{publico.map((x) => PUBLICO[x]).join(", ")}</dd>
                </dl>
              </details>
              <div className="d-service-card-foot">
                <span className={`d-badge${abertas(e) ? "" : " d-neutral"}`}><Icone nome={abertas(e) ? "confirmado" : "relogio"} />{abertas(e) ? "Com vagas abertas" : "Sem vagas abertas"}</span>
                <button type="button" className="d-text-button" onClick={() => aoGerenciar(e)}>Gerenciar serviço <Icone nome="seta" /></button>
              </div>
            </article>
          );
        }) : <div className="d-panel d-empty">Nenhum serviço neste filtro.</div>}
      </div>
    </>
  );
}

function Interessados({ vaga, ocupado, aoConfirmar }: { vaga: Vaga; ocupado: boolean; aoConfirmar: (interesseId: string) => void }) {
  const lista = useInteressados(vaga.id);
  if (lista.isPending) return <p className="d-muted" role="status">Carregando…</p>;
  if (lista.isError) return <p className="d-muted" role="alert">{mensagemDe(lista.error)}</p>;
  return (
    <div className="d-details">
      <p className="d-profile-footer">{lista.data.aviso}</p>
      {lista.data.itens.length === 0 && <p className="d-muted">Ninguém demonstrou interesse ainda.</p>}
      {lista.data.itens.map((i) => (
        <div key={i.id} className="d-detail">
          <strong>#{i.posicao_sugerida} · {i.paciente_nome_exibicao}</strong>
          <span className="d-muted"> · pedido {ESTADO_PEDIDO[i.pedido_estado].rotulo.toLowerCase()} · {i.estado.replace(/_/g, " ")}</span>
          {i.urgencia_avaliada && <> <span className="d-badge d-danger"><Icone nome="ajuda" />Urgência avaliada</span></>}
          {i.estado === "registrado" && vaga.estado === "aberta" && (
            <div><button type="button" className="d-text-button" disabled={ocupado} onClick={() => aoConfirmar(i.id)}>Confirmar esta pessoa <Icone nome="seta" /></button></div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Vagas de uma especialidade, com interessados e confirmação (que é o que gera o agendamento). */
function VagasDoServico({ vagas, profissionais, ocupado, aoConfirmar, aoPublicar }: {
  vagas: Vaga[]; profissionais: Profissional[]; ocupado: boolean; aoConfirmar: (vagaId: string, interesseId: string) => void; aoPublicar: () => void;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  return (
    <>
      <p className="d-muted" style={{ marginTop: 12, fontSize: 13 }}>Vaga não é agendamento: a clínica confirma uma única pessoa entre as interessadas.</p>
      {vagas.length === 0 && <p className="d-empty">Nenhuma vaga publicada para este serviço.</p>}
      <ol className="d-timeline">
        {[...vagas].sort((a, b) => a.inicio.localeCompare(b.inicio)).map((v) => (
          <li key={v.id}>
            <time dateTime={v.inicio}>{dataHora(v.inicio)} até {hora(v.fim)}</time>
            {ESTADO_VAGA[v.estado]} · {v.interesses_registrados ?? 0} interesse(s)
            {v.profissional_id && <span className="d-muted"> · {profissionais.find((p) => p.id === v.profissional_id)?.nome_exibicao ?? "Profissional"}</span>}
            <div><button type="button" className="d-text-button" onClick={() => setAberta(aberta === v.id ? null : v.id)}>{aberta === v.id ? "Ocultar interessados" : "Ver interessados"}</button></div>
            {aberta === v.id && <Interessados vaga={v} ocupado={ocupado} aoConfirmar={(id) => aoConfirmar(v.id, id)} />}
          </li>
        ))}
      </ol>
      <div className="d-modal-actions"><button type="button" className="d-button d-primary" onClick={aoPublicar}><Icone nome="mais" /> Publicar vaga para este serviço</button></div>
    </>
  );
}

function FormPublicar({ especialidades, inicial, profissionais, ocupado, erro, aoCancelar, aoSalvar }: {
  especialidades: string[]; inicial?: string; profissionais: Profissional[]; ocupado: boolean; erro: unknown;
  aoCancelar: () => void; aoSalvar: (corpo: { especialidade: string; inicio: string; fim: string; profissional_id: string | null }) => void;
}) {
  const [especialidade, setEspecialidade] = useState(inicial ?? especialidades[0] ?? "");
  function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    aoSalvar({
      especialidade,
      inicio: new Date(String(f.get("inicio"))).toISOString(),
      fim: new Date(String(f.get("fim"))).toISOString(),
      profissional_id: String(f.get("profissional") || "") || null,
    });
  }
  return (
    <form onSubmit={salvar}>
      <p className="d-muted" style={{ marginTop: 12, fontSize: 13 }}>Vaga não é agendamento. Pacientes demonstram interesse e a clínica confirma uma única pessoa.</p>
      <div className="d-form-grid">
        <label className="d-field d-full">Serviço
          <select name="especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            {especialidades.map((e) => <option key={e} value={e}>{rotuloEspecialidade(e)}</option>)}
          </select>
        </label>
        <label className="d-field">Início<input type="datetime-local" name="inicio" required /></label>
        <label className="d-field">Fim<input type="datetime-local" name="fim" required /></label>
        <label className="d-field d-full">Profissional (opcional)
          <select name="profissional" key={especialidade}>
            <option value="">Sem profissional definido</option>
            {profissionais.filter((p) => p.especialidade === especialidade).map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
          </select>
        </label>
      </div>
      {!!erro && <div className="d-notice" role="alert"><strong>Não foi possível publicar</strong>{mensagemDe(erro)}</div>}
      <div className="d-modal-actions">
        <button type="button" className="d-button" onClick={aoCancelar}>Cancelar</button>
        <button className="d-button d-primary" disabled={ocupado}>{ocupado ? "Publicando…" : "Publicar vaga"}</button>
      </div>
    </form>
  );
}

function Configuracoes({ c, podeEditar, ocupado, erro, aoSalvar }: { c: Clinica; podeEditar: boolean; ocupado: boolean; erro: unknown; aoSalvar: (f: FormData) => void }) {
  return (
    <form className="d-panel d-form-panel" onSubmit={(e) => { e.preventDefault(); aoSalvar(new FormData(e.currentTarget)); }}>
      <span className="d-eyebrow">Identidade da unidade</span>
      <h2 style={{ marginTop: 8 }}>Informações da clínica</h2>
      <p className="d-muted" style={{ fontSize: 13, marginTop: 7 }}>Esses dados ajudam o paciente a encontrar sua equipe.</p>
      {!podeEditar && <div className="d-notice" style={{ marginTop: 14 }}><strong>Somente leitura</strong>Só a recepção (atendimento) ou a coordenação podem alterar estes dados.</div>}
      <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="d-form-grid">
          <label className="d-field d-full">Nome da clínica<input name="nome" defaultValue={c.nome} required maxLength={120} /></label>
          <label className="d-field d-full">Endereço<input name="endereco" defaultValue={c.endereco ?? ""} maxLength={200} /></label>
          <label className="d-field">Bairro<input name="bairro" defaultValue={c.bairro ?? ""} maxLength={80} /></label>
          <label className="d-field">Telefone<input name="telefone" defaultValue={c.telefone} required maxLength={40} /></label>
          <label className="d-field">Cidade<input value={`${c.cidade}/${c.uf}`} readOnly /></label>
          <label className="d-field">Universidade<input value={c.universidade ?? "—"} readOnly /></label>
        </div>
        <hr className="d-divider" />
        <h3>Recebimento de solicitações</h3>
        <label className="d-checkbox"><input type="checkbox" name="recebendo_pedidos" defaultChecked={c.recebendo_pedidos} />Receber novas solicitações de pacientes</label>
        <p className="d-muted" style={{ fontSize: 12 }}>Ao pausar, as solicitações existentes continuam disponíveis para a equipe.</p>
        <hr className="d-divider" />
        <h3>Aparência</h3>
        <p className="d-muted" style={{ fontSize: 12, margin: "8px 0 15px" }}>Use o botão de tema no topo para alternar entre claro e escuro.</p>
        {!!erro && <div className="d-notice" role="alert" style={{ marginBottom: 15 }}><strong>Não foi possível salvar</strong>{mensagemDe(erro)}</div>}
        <button className="d-button d-primary" disabled={ocupado}><Icone nome="confirmado" /> {ocupado ? "Salvando…" : "Salvar configurações"}</button>
      </fieldset>
      <p className="d-profile-footer">As alterações valem para o app do paciente assim que forem salvas.</p>
    </form>
  );
}

export function PainelClinica() {
  const { sair } = useSessao();
  const usuario = useUsuario();
  const { clinicaId, funcao } = useClinicaAtual();
  const { clinica, pedidos, fila, vagas, profissionais } = usePainel(clinicaId);
  const acoes = useAcoesPainel(clinicaId);

  const [pagina, setPagina] = useState<Pagina>(paginaInicial);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("Todas");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState(TODOS_SERVICOS);
  const [abaServico, setAbaServico] = useState<AbaServico>("Todos");
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [janela, setJanela] = useState<Janela>(null);
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null);
  const refJanela = useRef<HTMLDialogElement>(null);

  const linhas = pedidos.data?.itens ?? [];
  const itensFila = fila.data?.itens ?? [];
  const listaVagas = vagas.data?.itens ?? [];
  const listaProfissionais = profissionais.data?.itens ?? [];
  const especialidades = clinica.data?.especialidades ?? [];
  const termo = busca.toLocaleLowerCase("pt-BR");
  const filtrados = linhas.filter((p) => (aba === "Todas" || p.estado === aba)
    && (categoria === TODOS_SERVICOS || p.especialidade === categoria)
    && `${p.paciente_nome_exibicao} ${protocolo(p.id)} ${rotuloEspecialidade(p.especialidade)}`.toLocaleLowerCase("pt-BR").includes(termo));

  // A seleção acompanha os filtros (Solicitações) e a fila (Triagem).
  let idSelecionado = selecionado ?? linhas[0]?.id ?? null;
  if (pagina === "solicitacoes" && filtrados.length && !filtrados.some((p) => p.id === idSelecionado)) idSelecionado = filtrados[0].id;
  if (pagina === "triagem" && itensFila.length && !itensFila.some((f) => f.solicitacao_id === idSelecionado)) idSelecionado = itensFila[0].solicitacao_id;
  if (idSelecionado !== selecionado) setSelecionado(idSelecionado);
  const paciente = linhas.find((p) => p.id === idSelecionado) ?? linhas[0];

  useEffect(() => { history.replaceState(null, "", `#/clinicas/${clinicaId}/${pagina}`); }, [clinicaId, pagina]);
  useEffect(() => {
    const d = refJanela.current;
    if (!d) return;
    if (janela && !d.open) d.showModal();
    if (!janela && d.open) d.close();
  }, [janela]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const avisar = (texto: string) => setAviso((a) => ({ texto, n: (a?.n ?? 0) + 1 }));
  const fechar = () => { setJanela(null); acoes.publicarVaga.reset(); };
  const limparFiltros = () => { setAba("Todas"); setBusca(""); setCategoria(TODOS_SERVICOS); };

  function irPara(p: Pagina) {
    setPagina(p);
    setMenuAberto(false);
    acoes.mudarEstado.reset();
    acoes.salvarClinica.reset();
  }

  function escolherPaciente(id: string) {
    setSelecionado(id);
    if (pagina !== "triagem" && window.innerWidth <= 1200) setJanela({ tipo: "perfil" });
  }

  /** "Iniciar triagem" marca o pedido como em análise (API) e abre o registro; os demais estados ativos só abrem. */
  function triar(p: Pedido) {
    const abrir = () => { setSelecionado(p.id); setJanela(null); irPara("triagem"); };
    if (p.estado !== "enviada") { abrir(); return; }
    acoes.mudarEstado.mutate({ id: p.id, estado: "em_analise", motivo: null }, { onSuccess: abrir, onError: (e) => avisar(mensagemDe(e)) });
  }

  function concluir(p: Pedido) {
    acoes.mudarEstado.mutate({ id: p.id, estado: "concluida", motivo: null }, {
      onSuccess: () => avisar("Atendimento registrado como concluído."),
      onError: (e) => avisar(mensagemDe(e)),
    });
  }

  function salvarTriagem(estado: NovoEstado, motivo: string | null) {
    if (!paciente) return;
    acoes.mudarEstado.mutate({ id: paciente.id, estado, motivo }, {
      onSuccess: () => { limparFiltros(); irPara("solicitacoes"); avisar("Triagem registrada. Nenhuma mensagem foi enviada pelo painel."); },
    });
  }

  function publicar(especialidade?: string) {
    if (!especialidades.length) { avisar("A clínica ainda não tem especialidades cadastradas."); return; }
    acoes.publicarVaga.reset();
    setJanela({ tipo: "publicar", especialidade });
  }

  function exportar() {
    const csv = "﻿Protocolo;Paciente;Serviço;Espera (dias);Situação\r\n" + filtrados.map((p) => [protocolo(p.id), p.paciente_nome_exibicao, rotuloEspecialidade(p.especialidade), diasDeEspera(p.criado_em), ESTADO_PEDIDO[p.estado].rotulo].map((s) => `"${String(s).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `uhealth-solicitacoes-${protocolo(clinicaId)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    avisar("Solicitações exportadas em CSV.");
  }

  function salvarConfiguracoes(f: FormData) {
    acoes.salvarClinica.mutate({
      nome: String(f.get("nome")), telefone: String(f.get("telefone")),
      endereco: String(f.get("endereco") ?? ""), bairro: String(f.get("bairro") ?? ""), recebendo_pedidos: f.has("recebendo_pedidos"),
    }, { onSuccess: () => avisar("Configurações salvas.") });
  }

  const ocupado = acoes.mudarEstado.isPending;
  const acaoDo = (p: Pedido) => <AcaoPedido p={p} ocupado={ocupado} aoTriar={() => triar(p)} aoConcluir={() => concluir(p)} />;
  const perfil = paciente && <Perfil p={paciente} acao={acaoDo(paciente)} aoVerPerfil={() => setJanela({ tipo: "perfil" })} />;
  const falhaPrincipal = [clinica, pedidos].find((q) => q.isError);

  const conteudo = falhaPrincipal ? <Falha erro={falhaPrincipal.error} aoTentar={() => { void clinica.refetch(); void pedidos.refetch(); }} />
    : !clinica.data || !pedidos.data ? <Carregando /> : {
      solicitacoes: (
        <>
          <div className="d-metrics">
            <article className="d-metric"><p className="d-metric-title">Solicitações recebidas</p><p className="d-metric-value">{String(linhas.length).padStart(2, "0")}</p></article>
            <article className="d-metric"><p className="d-metric-title">Pessoas na fila</p><p className="d-metric-value">{fila.data ? String(fila.data.total).padStart(2, "0") : "—"}</p></article>
            <article className="d-metric"><p className="d-metric-title">Vagas abertas</p><p className="d-metric-value">{vagas.data ? listaVagas.filter((v) => v.estado === "aberta").length : "—"}</p></article>
          </div>
          <div className="d-split">
            <section className="d-panel">
              <div className="d-panel-head">
                <h2><span>Solicitações recebidas</span><span className="d-subcount">({linhas.length})</span></h2>
                <button type="button" className="d-text-button" onClick={exportar}><Icone nome="exportar" /> Exportar</button>
              </div>
              <div className="d-tabs" aria-label="Filtrar por situação">
                {ABAS.map((t) => (
                  <button type="button" key={t} className={`d-tab${t === aba ? " d-active" : ""}`} aria-pressed={t === aba} onClick={() => setAba(t)}>{t === "Todas" ? t : ESTADO_PEDIDO[t].rotulo}</button>
                ))}
              </div>
              <div className="d-filterbar">
                <label className="d-search"><Icone nome="buscar" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente ou protocolo" aria-label="Buscar paciente ou protocolo" /></label>
                <select className="d-filter-select" aria-label="Filtrar serviço" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value={TODOS_SERVICOS}>{TODOS_SERVICOS}</option>
                  {[...new Set(linhas.map((p) => p.especialidade))].map((e) => <option key={e} value={e}>{rotuloEspecialidade(e)}</option>)}
                </select>
              </div>
              <Tabela lista={filtrados} total={linhas.length} idSelecionado={idSelecionado} aoEscolher={escolherPaciente} />
            </section>
            {filtrados.length ? perfil : <aside className="d-panel d-profile d-empty">Selecione uma solicitação para ver os detalhes.</aside>}
          </div>
        </>
      ),
      triagem: fila.isError ? <Falha erro={fila.error} aoTentar={() => void fila.refetch()} />
        : !fila.data ? <Carregando />
        : <Triagem key={itensFila.length ? idSelecionado ?? "" : "vazia"} fila={itensFila} aviso={fila.data.aviso}
            p={itensFila.length ? paciente : undefined} ocupado={ocupado} erro={acoes.mudarEstado.error}
            aoEscolher={escolherPaciente} aoIr={irPara} aoSalvar={salvarTriagem} />,
      servicos: vagas.isError || profissionais.isError
        ? <Falha erro={vagas.error ?? profissionais.error} aoTentar={() => { void vagas.refetch(); void profissionais.refetch(); }} />
        : !vagas.data || !profissionais.data ? <Carregando />
        : <Catalogo especialidades={especialidades} vagas={listaVagas} profissionais={listaProfissionais} pedidos={linhas} publico={clinica.data.publico}
            aba={abaServico} aoTrocarAba={setAbaServico} aoGerenciar={(e) => setJanela({ tipo: "servico", especialidade: e })} />,
      pacientes: (
        <div className="d-split">
          <section className="d-panel">
            <div className="d-panel-head"><h2>Pacientes da clínica</h2></div>
            <Tabela lista={linhas} total={linhas.length} idSelecionado={idSelecionado} aoEscolher={escolherPaciente} />
          </section>
          {perfil ?? <aside className="d-panel d-profile d-empty">Nenhuma solicitação recebida ainda.</aside>}
        </div>
      ),
      configuracoes: <Configuracoes key={clinica.dataUpdatedAt} c={clinica.data} podeEditar={FUNCOES_QUE_EDITAM.includes(funcao)}
        ocupado={acoes.salvarClinica.isPending} erro={acoes.salvarClinica.error} aoSalvar={salvarConfiguracoes} />,
    }[pagina];

  const titulo = !janela ? "" : janela.tipo === "perfil" ? "Perfil do paciente" : janela.tipo === "publicar" ? "Publicar vaga" : rotuloEspecialidade(janela.especialidade);

  return (
    <div className={`d-admin${temaEscuro ? " d-theme-dark" : ""}`}>
      <a className="d-skip" href="#main-content">Pular para conteúdo</a>
      <div className={`d-shell${menuAberto ? " d-menu-open" : ""}`}>
        <button type="button" className="d-menu-backdrop" onClick={() => setMenuAberto((m) => !m)} aria-label="Fechar menu" />
        <aside className="d-sidebar">
          <div className="d-brand"><Simbolo /><Marca /></div>
          <p className="d-nav-label">Atendimento</p>
          <nav className="d-navigation" aria-label="Principal">
            {MENU.map(([p, icone]) => (
              <a key={p} href={`#${p}`} className={`d-nav-item${pagina === p ? " d-active" : ""}`} aria-current={pagina === p ? "page" : undefined} onClick={(e) => { e.preventDefault(); irPara(p); }}>
                <Icone nome={icone} />{TITULOS[p]}
                {p === "solicitacoes" && <span className="d-count">{linhas.filter((x) => x.estado === "enviada").length}</span>}
              </a>
            ))}
          </nav>
          <p className="d-nav-label d-management">Gestão</p>
          <a href="#configuracoes" className={`d-nav-item${pagina === "configuracoes" ? " d-active" : ""}`} aria-current={pagina === "configuracoes" ? "page" : undefined} onClick={(e) => { e.preventDefault(); irPara("configuracoes"); }}>
            <Icone nome="ajustes" />Configurações
          </a>
          <Link to="/pedidos" className="d-nav-item"><Icone nome="arquivo" />Painel operacional</Link>
          <div className="d-sidebar-bottom">
            {clinica.data && (
              <div className={`d-clinic-status${clinica.data.recebendo_pedidos ? "" : " d-is-paused"}`}><b><span className="d-status-dot" />{clinica.data.recebendo_pedidos ? "Recebimento ativo" : "Novos pedidos pausados"}</b></div>
            )}
            <div className="d-account">
              <span className="d-avatar">{iniciais(usuario.nome_exibicao)}</span>
              <div><b>{usuario.nome_exibicao}</b><small>{FUNCAO[funcao] ?? funcao}</small></div>
              <button type="button" className="d-sair" onClick={() => void sair()}>Sair</button>
            </div>
          </div>
        </aside>
        <div className="d-workspace">
          <header className="d-topbar">
            <div className="d-clinic-switch">
              <button type="button" className="d-icon-btn d-mobile-menu" onClick={() => setMenuAberto((m) => !m)} aria-label="Abrir ou fechar menu"><Icone nome="menu" /></button>
              <span className="d-clinic-label">Clínica</span>
              <strong className="d-clinic-name">{clinica.data?.nome ?? "Carregando…"}</strong>
            </div>
            <div className="d-top-actions">
              <span className="d-demo-label">Ambiente de demonstração</span>
              <button type="button" className="d-icon-btn" onClick={() => setTemaEscuro((t) => !t)} aria-label="Alternar tema claro e escuro"><Icone nome="sol" /></button>
            </div>
          </header>
          <main className="d-content" id="main-content">
            <div className="d-breadcrumb">Clínica <Icone nome="avancar" /> <span>{TITULOS[pagina]}</span></div>
            <div className="d-page-heading">
              <div><h1>{TITULOS[pagina]}</h1><p>{DESCRICOES[pagina]}</p></div>
              {pagina !== "configuracoes" && (
                <button type="button" className="d-button d-primary" onClick={() => publicar()}><Icone nome="mais" />Publicar vaga</button>
              )}
            </div>
            {conteudo}
            <footer className="d-bottom-note"><span><Icone nome="escudo" /> Dados fictícios · ambiente de demonstração</span><span>Sorriu+ · Portal da clínica</span></footer>
          </main>
        </div>
      </div>
      <dialog ref={refJanela} aria-labelledby="dialog-title" onClose={fechar}>
        {janela && (
          <>
            <div className="d-modal-head">
              <h2 id="dialog-title">{titulo}</h2>
              <button type="button" className="d-icon-btn" onClick={fechar} aria-label="Fechar janela"><Icone nome="fechar" /></button>
            </div>
            {janela.tipo === "perfil" && paciente && (
              <>
                <Perfil p={paciente} completo acao={acaoDo(paciente)} />
                <Historico p={paciente} />
              </>
            )}
            {janela.tipo === "servico" && (
              <VagasDoServico vagas={listaVagas.filter((v) => v.especialidade === janela.especialidade)} profissionais={listaProfissionais}
                ocupado={acoes.confirmarInteresse.isPending}
                aoConfirmar={(vagaId, interesseId) => acoes.confirmarInteresse.mutate({ vagaId, interesseId }, {
                  onSuccess: (r) => avisar(r.aviso), onError: (e) => avisar(mensagemDe(e)),
                })}
                aoPublicar={() => publicar(janela.especialidade)} />
            )}
            {janela.tipo === "publicar" && (
              <FormPublicar especialidades={especialidades} inicial={janela.especialidade} profissionais={listaProfissionais}
                ocupado={acoes.publicarVaga.isPending} erro={acoes.publicarVaga.error} aoCancelar={fechar}
                aoSalvar={(corpo) => acoes.publicarVaga.mutate(corpo, { onSuccess: () => { fechar(); avisar("Vaga publicada. Pacientes já podem demonstrar interesse."); } })} />
            )}
          </>
        )}
      </dialog>
      {aviso && <div key={aviso.n} className="d-toast-app" role="status">{aviso.texto}</div>}
    </div>
  );
}
