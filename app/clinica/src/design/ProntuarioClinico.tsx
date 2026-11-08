import { useState, type FormEvent } from "react";
import { dataHora, mensagemDe, rotuloEspecialidade } from "@uhealth/api-client";
import {
  ACIONA_INDEXADOR, ESCREVE_PRONTUARIO, PROCEDIMENTOS, RISCOS, TIPOS_REGISTRO, VALIDA_PRONTUARIO, rotuloProcedimento,
  useAcoesProntuario, useProntuario, type NovoRegistro, type Pedido, type RegistroProntuario,
} from "./dados";
import { Icone } from "./Icone";

/* Prontuário clínico (slides "O histórico vai junto" e "Fila cheia aqui, cadeira livre ali").
   O estudante escreve, o professor valida. Triagem ou plano validado aciona o indexador da API: se esta clínica não
   ensina o procedimento no semestre ou não tem vaga, outra parceira recebe um encaminhamento, que só vale depois que
   o PACIENTE confirma. O painel não decide nada disso; só mostra e pede. */

const POR_ESPECIALIDADE = Object.entries(PROCEDIMENTOS).reduce<Record<string, string[]>>((acc, [proc, { especialidade }]) => {
  (acc[especialidade] ??= []).push(proc);
  return acc;
}, {});

function Registro({ r, podeValidar, ocupado, aoValidar }: { r: RegistroProntuario; podeValidar: boolean; ocupado: boolean; aoValidar: () => void }) {
  return (
    <li className="d-registro">
      <div className="d-registro-topo">
        <b>{r.tipo_rotulo}</b>
        {r.validado_por_nome
          ? <span className="d-badge"><Icone nome="confirmado" />Validado por {r.validado_por_nome}</span>
          : <span className="d-badge d-warning"><Icone nome="relogio" />Aguardando validação do professor</span>}
        {r.risco_clinico && <span className={`d-badge${r.risco_clinico === "alto" || r.risco_clinico === "urgente" ? " d-danger" : " d-neutral"}`}>Gravidade: {RISCOS[r.risco_clinico as keyof typeof RISCOS] ?? r.risco_clinico}</span>}
      </div>
      <p className="d-triage-observation">{r.conteudo}</p>
      {r.procedimentos.length > 0 && <p className="d-muted">Procedimentos: {r.procedimentos.map(rotuloProcedimento).join(", ")}</p>}
      <small>{r.clinica_nome} · {dataHora(r.criado_em)} · escrito por {r.autor_nome ?? "equipe"}</small>
      {!r.validado_por_nome && podeValidar && (
        <div>
          <button type="button" className="d-button d-primary" disabled={ocupado} onClick={aoValidar}>
            <Icone nome="confirmado" /> {ocupado ? "Validando…" : "Validar registro"}
          </button>
        </div>
      )}
    </li>
  );
}

function NovoRegistroForm({ p, ocupado, erro, aoSalvar }: { p: Pedido; ocupado: boolean; erro: unknown; aoSalvar: (r: NovoRegistro, limpar: () => void) => void }) {
  const [procedimentos, setProcedimentos] = useState<string[]>([]);
  function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const risco = String(f.get("risco") || "");
    aoSalvar({
      solicitacao_id: p.id,
      tipo: String(f.get("tipo")) as NovoRegistro["tipo"],
      conteudo: String(f.get("conteudo") ?? "").trim(),
      risco_clinico: (risco || null) as NovoRegistro["risco_clinico"],
      procedimentos,
      especialidades: [...new Set(procedimentos.map((x) => PROCEDIMENTOS[x].especialidade))],
    }, () => { form.reset(); setProcedimentos([]); });
  }
  const alternar = (proc: string) => setProcedimentos((l) => (l.includes(proc) ? l.filter((x) => x !== proc) : [...l, proc]));
  return (
    <form onSubmit={salvar} className="d-registro-form">
      <h3>Escrever no prontuário</h3>
      <div className="d-form-grid">
        <label className="d-field">Tipo de registro
          <select name="tipo" defaultValue="triagem">
            {Object.entries(TIPOS_REGISTRO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
        <label className="d-field">Gravidade (avaliação profissional)
          <select name="risco" defaultValue="">
            <option value="">Não se aplica</option>
            {Object.entries(RISCOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
        <fieldset className="d-field d-full d-procedimentos">
          <legend>Procedimentos necessários</legend>
          <p className="d-muted">O Sorriu+ confere se esta clínica ensina cada procedimento neste semestre e se tem vaga.</p>
          <div className="d-procedimentos-grade">
            {Object.entries(POR_ESPECIALIDADE).map(([esp, procs]) => (
              <div key={esp} role="group" aria-label={rotuloEspecialidade(esp)}>
                <small>{rotuloEspecialidade(esp)}</small>
                {procs.map((proc) => (
                  <label key={proc} className="d-checkbox">
                    <input type="checkbox" checked={procedimentos.includes(proc)} onChange={() => alternar(proc)} />{rotuloProcedimento(proc)}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>
        <label className="d-field d-full">Registro clínico
          <textarea name="conteudo" required minLength={3} maxLength={4000} placeholder="Queixa, exame, hipótese e conduta. Dados fictícios na demonstração." />
        </label>
      </div>
      {!!erro && <div className="d-notice" role="alert"><strong>Não foi possível salvar</strong>{mensagemDe(erro)}</div>}
      <div className="d-modal-actions">
        <button className="d-button d-primary" disabled={ocupado}><Icone nome="mais" /> {ocupado ? "Salvando…" : "Salvar no prontuário"}</button>
      </div>
    </form>
  );
}

export function ProntuarioClinico({ p, funcao, aoAvisar }: { p: Pedido; funcao: string; aoAvisar: (texto: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const prontuario = useProntuario(p.paciente_id, aberto);
  const acoes = useAcoesProntuario();
  const podeEscrever = ESCREVE_PRONTUARIO.includes(funcao);
  const podeValidar = VALIDA_PRONTUARIO.includes(funcao);

  function validar(r: RegistroProntuario) {
    acoes.validar.mutate(r.id, {
      onSuccess: () => aoAvisar(ACIONA_INDEXADOR.includes(r.tipo)
        ? "Registro validado. Se esta clínica não puder fazer o tratamento, o Sorriu+ procura outra parceira. O paciente confirma antes de ir."
        : "Registro validado."),
      onError: (e) => aoAvisar(mensagemDe(e)),
    });
  }

  return (
    <section className="d-prontuario" aria-labelledby={`pr-${p.id}`}>
      <div className="d-prioridade-topo">
        <span id={`pr-${p.id}`} className="d-eyebrow">Prontuário de {p.paciente_nome_exibicao}</span>
        <span className="d-muted"><Icone nome="escudo" /> Cada acesso fica registrado</span>
      </div>
      {!aberto ? (
        <>
          <p className="d-muted">Triagem, exames e diagnóstico seguem com o paciente entre as clínicas parceiras. Outra clínica só vê depois que ele confirma um encaminhamento.</p>
          <div><button type="button" className="d-button" onClick={() => setAberto(true)}><Icone nome="arquivo" /> Abrir prontuário</button></div>
        </>
      ) : prontuario.isPending ? <p className="d-muted" role="status">Carregando…</p>
        : prontuario.isError ? <p className="d-muted" role="alert">{mensagemDe(prontuario.error)}</p>
        : (
          <>
            <p className="d-profile-footer">Guardado com criptografia. Este acesso foi registrado e o paciente vê no app quem abriu e quando.</p>
            {prontuario.data.itens.length === 0
              ? <p className="d-muted">Ainda não há registros. Comece pela triagem.</p>
              : (
                <ul className="d-registros">
                  {prontuario.data.itens.map((r) => (
                    <Registro key={r.id} r={r} podeValidar={podeValidar} ocupado={acoes.validar.isPending && acoes.validar.variables === r.id} aoValidar={() => validar(r)} />
                  ))}
                </ul>
              )}
            {podeEscrever
              ? <NovoRegistroForm p={p} ocupado={acoes.escrever.isPending} erro={acoes.escrever.error}
                  aoSalvar={(corpo, limpar) => acoes.escrever.mutate(corpo, { onSuccess: () => { limpar(); aoAvisar("Registro salvo. Falta a validação do professor."); } })} />
              : <div className="d-notice"><strong>Somente leitura</strong>Só estudante ou professor escreve no prontuário, e só o professor valida.</div>}
          </>
        )}
    </section>
  );
}
