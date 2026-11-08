import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Btn, BtnLink, BtnTel, Chip, LinhaSamu, Linhas, Voltar } from "../../design/Componentes";
import { Icone, type NomeIcone } from "../../design/Icone";
import { quando } from "../../design/datas";

function Carregando() {
  return <p role="status" className="d-small">Carregando…</p>;
}
function Erro({ erro, tentar }: { erro: unknown; tentar: () => void }) {
  return (
    <>
      <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(erro)}</b></div>
      <Btn onClick={tentar}>Tentar de novo</Btn>
    </>
  );
}

// ---------- hub ----------
function Item({ para, icone, titulo, texto, destaque }: { para: string; icone: NomeIcone; titulo: string; texto: string; destaque?: string }) {
  return (
    <li>
      <Link to={para} className="d-card" style={{ textDecoration: "none", color: "inherit", flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Icone nome={icone} tamanho={32} />
        <span style={{ flex: 1 }}><b className="d-h2" style={{ display: "block" }}>{titulo}</b><span className="d-small">{texto}</span></span>
        {destaque && <Chip tom="sun">{destaque}</Chip>}
      </Link>
    </li>
  );
}

/** Meu cuidado (aba): encaminhamentos, prontuário, prioridade e avisos. */
export function Cuidado() {
  const { api } = useSessao();
  const refs = useQuery({ queryKey: ["referenciamentos"], queryFn: () => api.dados(api.cliente.GET("/referenciamentos", {})) });
  const avisos = useQuery({ queryKey: ["notificacoes"], queryFn: () => api.dados(api.cliente.GET("/notificacoes", {})) });
  const pendentes = (refs.data?.itens ?? []).filter((r) => r.estado === "aguardando_paciente").length;
  return (
    <div className="d-tela">
      <main className="d-corpo">
        <h1 className="d-h1 d-h1--30">Meu cuidado</h1>
        {pendentes > 0 && (
          <div className="d-aviso" role="status"><b>Você tem um encaminhamento esperando sua resposta.</b> <Link to="/encaminhamentos" style={{ color: "inherit" }}>Ver agora</Link></div>
        )}
        <ul className="d-lista">
          <Item para="/encaminhamentos" icone="clinica" titulo="Encaminhamentos" texto="Quando outra universidade vai continuar seu tratamento"
            destaque={pendentes ? "Responder" : undefined} />
          <Item para="/receitas" icone="pedido" titulo="Receitas" texto="Remédios receitados pela clínica, com PDF" />
          <Item para="/prontuario" icone="pedido" titulo="Meu prontuário" texto="Triagem, exames e quem viu seus dados" />
          <Item para="/prioridade" icone="analise" titulo="Minha prioridade" texto="Como sua vez na fila é calculada" />
          <Item para="/avisos" icone="aviso" titulo="Avisos" texto="Mensagens sobre seus pedidos e horários"
            destaque={avisos.data?.nao_lidas ? `${avisos.data.nao_lidas} novo${avisos.data.nao_lidas > 1 ? "s" : ""}` : undefined} />
        </ul>
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}

// ---------- encaminhamentos ----------
export function Encaminhamentos() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["referenciamentos"], queryFn: () => api.dados(api.cliente.GET("/referenciamentos", {})) });
  const responder = useMutation({
    mutationFn: ({ id, aceitar }: { id: string; aceitar: boolean }) =>
      api.dados(api.cliente.POST(aceitar ? "/referenciamentos/{ref_id}/aceitar" : "/referenciamentos/{ref_id}/recusar", { params: { path: { ref_id: id } } })),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para="/cuidado">Meu cuidado</Voltar>
        <h1 className="d-h1 d-h1--30">Encaminhamentos</h1>
        {lista.isPending && <Carregando />}
        {lista.isError && <Erro erro={lista.error} tentar={() => void lista.refetch()} />}
        {lista.data && lista.data.itens.length === 0 && <p className="d-p d-p--grande">Nenhum encaminhamento. Seu tratamento segue na clínica atual.</p>}
        {responder.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(responder.error)}</b></div>}
        <ul className="d-lista">
          {lista.data?.itens.map((r) => (
            <li key={r.id}>
              <article className="d-card d-card--sel" aria-labelledby={`r-${r.id}`}>
                <div className="d-chips">
                  {r.estado === "aguardando_paciente" && <Chip tom="sun" icone="vaga">Esperando sua resposta</Chip>}
                  {r.estado === "aceito" && <Chip icone="confirmado">Confirmado</Chip>}
                  {r.estado === "recusado" && <Chip tom="neutral">Recusado</Chip>}
                </div>
                <h2 id={`r-${r.id}`} className="d-h2">{r.clinica_destino.nome}</h2>
                <p className="d-p d-p--texto"><b>Por quê?</b> {r.motivo_simples} {r.clinica_origem_nome ? `(${r.clinica_origem_nome})` : ""}</p>
                <Linhas itens={[
                  ["Universidade", r.clinica_destino.universidade ?? "—"],
                  ["Endereço", r.clinica_destino.endereco ? `${r.clinica_destino.endereco}, ${r.clinica_destino.bairro}` : r.clinica_destino.cidade],
                  ["Horário separado", r.horario_inicio ? quando(r.horario_inicio) : "A clínica liga para combinar"],
                ]} />
                <details>
                  <summary className="d-small" style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>Ver como escolhemos esta clínica</summary>
                  <ul className="d-motivos">
                    {r.candidatos.map((c) => <li key={c.nome}>{c.nome}: {c.apta ? `pode atender (${c.pontos} pontos)` : c.motivo}</li>)}
                  </ul>
                </details>
                {r.estado === "aguardando_paciente" && (
                  <>
                    <div className="d-aviso d-aviso--pequeno">Ao confirmar, você autoriza a {r.clinica_destino.nome} a ver o diagnóstico já feito. Assim você não repete exames. Só é consulta marcada quando a clínica confirmar.</div>
                    <Btn disabled={responder.isPending} onClick={() => responder.mutate({ id: r.id, aceitar: true })}>Confirmar encaminhamento</Btn>
                    <Btn variante="outline" disabled={responder.isPending} onClick={() => responder.mutate({ id: r.id, aceitar: false })}>Prefiro ficar na clínica atual</Btn>
                  </>
                )}
                {r.solicitacao_destino_id && <BtnLink variante="outline" to={`/pedidos/${r.solicitacao_destino_id}`}>Acompanhar o novo pedido</BtnLink>}
              </article>
            </li>
          ))}
        </ul>
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}

// ---------- prontuário ----------
const RISCO = { baixo: "Baixa", moderado: "Moderada", alto: "Alta", urgente: "Urgente" } as const;

export function Prontuario() {
  const { api } = useSessao();
  const registros = useQuery({ queryKey: ["prontuario"], queryFn: () => api.dados(api.cliente.GET("/prontuario", {})) });
  const acessos = useQuery({ queryKey: ["prontuario", "acessos"], enabled: registros.isSuccess, queryFn: () => api.dados(api.cliente.GET("/prontuario/acessos", {})) });
  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para="/cuidado">Meu cuidado</Voltar>
        <h1 className="d-h1 d-h1--30">Meu prontuário</h1>
        {registros.isPending && <Carregando />}
        {registros.isError && <Erro erro={registros.error} tentar={() => void registros.refetch()} />}
        {registros.data && <div className="d-aviso d-aviso--pequeno">{registros.data.aviso}</div>}
        {registros.data && registros.data.itens.length === 0 && <p className="d-p d-p--grande">Ainda não há registros. A triagem aparece aqui depois do seu primeiro atendimento.</p>}
        <ul className="d-lista">
          {registros.data?.itens.map((r) => (
            <li key={r.id}>
              <article className="d-card" aria-labelledby={`p-${r.id}`}>
                <div className="d-chips">
                  {r.validado_por_nome ? <Chip icone="confirmado">Validado</Chip> : <Chip tom="neutral">Aguardando validação</Chip>}
                  {r.risco_clinico && <Chip tom={r.risco_clinico === "urgente" || r.risco_clinico === "alto" ? "danger" : "sun"}>Gravidade: {RISCO[r.risco_clinico as keyof typeof RISCO]}</Chip>}
                </div>
                <h2 id={`p-${r.id}`} className="d-h2">{r.tipo_rotulo}</h2>
                <p className="d-small">{r.clinica_nome} · {quando(r.criado_em)}</p>
                <p className="d-p d-p--texto">{r.conteudo}</p>
                {r.especialidades.length > 0 && <p className="d-small">Tratamento indicado: {r.especialidades.map(rotuloEspecialidade).join(", ")}</p>}
                <p className="d-small">Escrito por {r.autor_nome}{r.validado_por_nome ? `, validado por ${r.validado_por_nome}` : ""}.</p>
              </article>
            </li>
          ))}
        </ul>
        {acessos.data && acessos.data.itens.length > 0 && (
          <section aria-labelledby="h-acessos" style={{ display: "grid", gap: 10 }}>
            <h2 id="h-acessos" className="d-h2">Quem viu ou escreveu</h2>
            <ol className="d-tempo">
              {acessos.data.itens.slice(0, 15).map((a) => (
                <li key={a.id} className="d-tempo-item">
                  <time dateTime={a.criado_em}>{quando(a.criado_em)}</time>
                  <span>{a.quem} {a.acao_rotulo}{a.clinica_nome ? ` (${a.clinica_nome})` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}

// ---------- prioridade ----------
export function Prioridade() {
  const { api } = useSessao();
  const s = useQuery({ queryKey: ["meu-score"], queryFn: () => api.dados(api.cliente.GET("/meu-score", {})) });
  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para="/cuidado">Meu cuidado</Voltar>
        <h1 className="d-h1 d-h1--30">Minha prioridade</h1>
        {s.isPending && <Carregando />}
        {s.isError && <Erro erro={s.error} tentar={() => void s.refetch()} />}
        {s.data && (
          <>
            <section className="d-card" aria-label="Seus pontos" style={{ alignItems: "center", textAlign: "center" }}>
              <span className="d-small">Seus pontos agora</span>
              <span className="d-score">{s.data.score.toLocaleString("pt-BR")}</span>
              {s.data.urgencia_avaliada && <Chip tom="danger" icone="naoRecebe">Urgência avaliada: você vem antes</Chip>}
            </section>
            <div className="d-aviso d-aviso--ok">{s.data.aviso}</div>
            <ul className="d-lista" aria-label="Como os pontos são somados">
              {s.data.componentes.map((c) => (
                <li key={c.nome} className="d-card" style={{ gap: 4 }}>
                  <div className="d-card-topo"><b>{c.titulo}</b><b>{c.pontos > 0 ? "+" : ""}{c.pontos.toLocaleString("pt-BR")}</b></div>
                  <span className="d-small">{c.explicacao}</span>
                </li>
              ))}
            </ul>
            <Linhas rotulo="Seu histórico" itens={[
              ["Consultas que você foi", String(s.data.comparecimentos)],
              ["Cancelou com aviso", String(s.data.cancelamentos_com_aviso)],
              ["Faltou sem avisar", String(s.data.faltas_sem_aviso)],
            ]} />
            <section aria-labelledby="h-dicas"><h2 id="h-dicas" className="d-h2">Como manter sua vez</h2>
              <ul className="d-motivos">{s.data.dicas.map((d) => <li key={d}>{d}</li>)}</ul></section>
          </>
        )}
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}

// ---------- avisos ----------
export function Avisos() {
  const { api } = useSessao();
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["notificacoes"], queryFn: () => api.dados(api.cliente.GET("/notificacoes", {})) });
  const ler = useMutation({
    mutationFn: (id: string) => api.dados(api.cliente.POST("/notificacoes/{notificacao_id}/lida", { params: { path: { notificacao_id: id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
  const atendente = useMutation({ mutationFn: () => api.dados(api.cliente.POST("/atendimento-humano", { body: {} })) });
  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para="/cuidado">Meu cuidado</Voltar>
        <h1 className="d-h1 d-h1--30">Avisos</h1>
        {lista.isPending && <Carregando />}
        {lista.isError && <Erro erro={lista.error} tentar={() => void lista.refetch()} />}
        {lista.data && lista.data.itens.length === 0 && <p className="d-p d-p--grande">Nenhum aviso por enquanto.</p>}
        <ul className="d-lista">
          {lista.data?.itens.map((n) => (
            <li key={n.id}>
              <article className={`d-card${n.lida ? "" : " d-card--sel"}`} aria-labelledby={`n-${n.id}`}>
                <h2 id={`n-${n.id}`} className="d-h2">{n.titulo}</h2>
                <p className="d-small">{quando(n.criado_em)}</p>
                <p className="d-p d-p--texto">{n.texto}</p>
                {n.referencia?.startsWith("referenciamento:") && <BtnLink compacto to="/encaminhamentos">Ver encaminhamento</BtnLink>}
                {n.referencia?.startsWith("receita:") && <BtnLink compacto to="/receitas">Ver receita</BtnLink>}
                {!n.lida && <Btn variante="outline" compacto disabled={ler.isPending} onClick={() => ler.mutate(n.id)}>Marcar como lido</Btn>}
              </article>
            </li>
          ))}
        </ul>
        <BtnLink variante="link" to="/alertas">Alertas de vaga</BtnLink>
        <section className="d-card" aria-labelledby="h-humano">
          <h2 id="h-humano" className="d-h2">Precisa falar com uma pessoa?</h2>
          {atendente.data ? (
            <>
              <p className="d-p d-p--texto" role="status">{atendente.data.mensagem}</p>
              {atendente.data.contatos.map((c) => <BtnTel key={c.telefone} numero={c.telefone}>Ligar para {c.clinica_nome}</BtnTel>)}
            </>
          ) : (
            <Btn variante="outline" disabled={atendente.isPending} onClick={() => atendente.mutate()}>Pedir para a equipe me ligar</Btn>
          )}
          {atendente.isError && <p className="d-small" role="alert">{mensagemDe(atendente.error)}</p>}
        </section>
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}

// ---------- receitas ----------
/** "1 comprimido, oral, de 8 em 8 horas, por 3 dias": a receita lida em voz simples, sem mudar nada. */
export function receitaSimples(i: { medicamento: string; dosagem: string; via: string; frequencia: string; duracao: string }): string {
  return `Use ${i.dosagem} (${i.via}), ${i.frequencia}, por ${i.duracao}.`;
}

export function Receitas() {
  const { api } = useSessao();
  const lista = useQuery({ queryKey: ["receitas"], queryFn: () => api.dados(api.cliente.GET("/receitas", {})) });
  const baixar = useMutation({
    mutationFn: async (id: string) => {
      const arquivo = (await api.dados(api.cliente.GET("/receitas/{receita_id}/pdf", { params: { path: { receita_id: id } }, parseAs: "blob" }))) as Blob;
      const url = URL.createObjectURL(arquivo);
      const a = document.createElement("a");
      a.href = url; a.download = `receita-${id.slice(0, 8)}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
  });
  return (
    <div className="d-tela">
      <main className="d-corpo">
        <Voltar para="/cuidado">Meu cuidado</Voltar>
        <h1 className="d-h1 d-h1--30">Receitas</h1>
        {lista.isPending && <Carregando />}
        {lista.isError && <Erro erro={lista.error} tentar={() => void lista.refetch()} />}
        {lista.data && <div className="d-aviso d-aviso--pequeno">{lista.data.aviso}</div>}
        {lista.data && lista.data.itens.length === 0 && <p className="d-p d-p--grande">Nenhuma receita ainda. Quando a clínica emitir, ela aparece aqui e você recebe um aviso.</p>}
        {baixar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(baixar.error)}</b></div>}
        <ul className="d-lista">
          {lista.data?.itens.map((rec) => (
            <li key={rec.id}>
              <article className="d-card" aria-labelledby={`rc-${rec.id}`}>
                <h2 id={`rc-${rec.id}`} className="d-h2">Receita de {rec.data_emissao ? quando(rec.data_emissao).split(",")[0] : ""}</h2>
                <p className="d-small">{rec.instituicao}</p>
                <ul className="d-lista" style={{ gap: 10 }}>
                  {rec.itens.map((i) => (
                    <li key={i.medicamento} className="d-painel" style={{ border: "1.5px solid var(--uh-line)" }}>
                      <b>{i.medicamento}</b>
                      <span>{receitaSimples(i)}</span>
                    </li>
                  ))}
                </ul>
                {rec.orientacoes && <p className="d-p d-p--texto"><b>Orientações:</b> {rec.orientacoes}</p>}
                <p className="d-small">Assinada por {rec.assinante_nome} ({rec.assinante_cro}).</p>
                <Btn variante="outline" compacto disabled={baixar.isPending} onClick={() => baixar.mutate(rec.id)}>Baixar PDF</Btn>
              </article>
            </li>
          ))}
        </ul>
        <p className="d-small">Não mude a dose por conta própria. Dúvidas sobre o remédio: ligue para a clínica que receitou.</p>
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}
