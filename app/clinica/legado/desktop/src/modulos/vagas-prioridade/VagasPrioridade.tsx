import { FormEvent, useEffect, useState } from "react";
import { useSessao } from "../../sessao";
import { apiVagasPrioridade, type Interesse, type ItemFila, type Vaga } from "./api";

const mensagem = (e: unknown, padrao: string) => (e instanceof Error ? e.message : padrao);
const ROTULO_INTERESSE: Record<Interesse["estado"], string> = {
  registrado: "Aguardando decisão", confirmado: "Confirmado", nao_selecionado: "Não selecionado", retirado: "Retirado",
};

export default function VagasPrioridade() {
  const { usuario } = useSessao();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [interesses, setInteresses] = useState<Record<string, Interesse[]>>({});
  const [erro, setErro] = useState("");
  const [especialidade, setEspecialidade] = useState("clinica_geral");
  const [inicio, setInicio] = useState("2026-11-12T14:00");

  const carregar = async () => {
    try {
      setErro("");
      const [v, f] = await Promise.all([
        apiVagasPrioridade.listarVagas(),
        usuario?.clinica_id ? apiVagasPrioridade.fila(usuario.clinica_id) : Promise.resolve([]),
      ]);
      setVagas(v); setFila(f);
      const abertas = v.filter((x) => x.estado === "aberta");
      const lista = await Promise.all(abertas.map((x) => apiVagasPrioridade.interesses(x.id)));
      setInteresses(Object.fromEntries(abertas.map((x, i) => [x.id, lista[i]])));
    } catch (e) { setErro(mensagem(e, "Não foi possível atualizar.")); }
  };
  useEffect(() => { void carregar(); }, [usuario?.clinica_id]);

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const ini = new Date(inicio);
      await apiVagasPrioridade.criarVaga(especialidade, ini.toISOString(), new Date(ini.getTime() + 30 * 60_000).toISOString());
      await carregar();
    } catch (x) { setErro(mensagem(x, "Não foi possível criar a vaga.")); }
  };

  const confirmar = async (vagaId: string, interesseId: string) => {
    try { await apiVagasPrioridade.confirmar(vagaId, interesseId); await carregar(); }
    catch (e) { setErro(mensagem(e, "Vaga ocupada.")); await carregar(); }
  };

  return (
    <section className="stack">
      <header><h1>Vagas e prioridade</h1><p>Dados fictícios. A ordem é apoio explicável; a decisão de atendimento é sempre humana.</p></header>
      {erro && <p className="notice notice--danger" role="alert">{erro}</p>}
      <form className="card stack" onSubmit={criar}>
        <h2>Publicar vaga demonstrativa</h2>
        <label className="field">Especialidade<input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} required /></label>
        <label className="field">Data e hora fictícias (30 minutos)<input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label>
        <button className="btn btn--primary">Publicar vaga</button>
      </form>
      <section className="stack">
        <h2>Vagas</h2>
        {vagas.length === 0 ? <p className="card">Nenhuma vaga informada.</p> : vagas.map((v) => (
          <article className="card stack" key={v.id}>
            <strong>{v.especialidade}</strong>
            <span>{new Date(v.inicio).toLocaleString("pt-BR")} · {v.estado}</span>
            <p>Interesse não é agendamento. Escolha uma pessoa da lista, depois da avaliação humana.</p>
            {v.estado === "aberta" && (interesses[v.id]?.length ? (
              <ol className="stack" aria-label="Interessados na ordem sugerida">
                {interesses[v.id].map((i) => (
                  <li key={i.id} className="card stack">
                    <strong>{i.posicao_sugerida}º sugerido · {i.paciente_nome_exibicao} · score {i.score}</strong>
                    <span>{i.urgencia_avaliada ? "Urgência avaliada por profissional" : "Sem urgência avaliada"} · {ROTULO_INTERESSE[i.estado]}</span>
                    {i.sinalizacoes.map((s) => <small key={s}>{s}</small>)}
                    <button className="btn btn--outline" disabled={i.estado !== "registrado"} onClick={() => void confirmar(v.id, i.id)}>
                      Confirmar {i.paciente_nome_exibicao}
                    </button>
                  </li>
                ))}
              </ol>
            ) : <p className="nota">Ainda ninguém demonstrou interesse nesta vaga.</p>)}
          </article>
        ))}
      </section>
      <section className="stack">
        <h2>Fila explicável</h2>
        <p>Urgência avaliada vem antes da pontuação. Relato de urgência não confirmado não gera punição.</p>
        {fila.map((i) => (
          <article className="card stack" key={i.solicitacao_id}>
            <strong>{i.paciente_nome_exibicao} · score {i.score}</strong>
            <span>{i.urgencia_avaliada ? "Urgência avaliada — prioridade absoluta" : "Sem prioridade de urgência avaliada"}</span>
            <ul>{i.componentes.map((c) => <li key={c.nome}>{c.nome}: {c.valor ?? "desconhecido"} (fonte: {c.fonte})</li>)}</ul>
            {i.sinalizacoes.map((s) => <p key={s}>{s}</p>)}
          </article>
        ))}
      </section>
      <button className="btn btn--outline" onClick={() => void carregar()}>Atualizar manualmente</button>
    </section>
  );
}
