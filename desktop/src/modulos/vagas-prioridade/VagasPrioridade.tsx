import { FormEvent, useEffect, useState } from "react";
import { useSessao } from "../../sessao";
import { apiVagasPrioridade, type ItemFila, type Vaga } from "./api";

export default function VagasPrioridade() {
  const { usuario } = useSessao();
  const [vagas, setVagas] = useState<Vaga[]>([]); const [fila, setFila] = useState<ItemFila[]>([]);
  const [erro, setErro] = useState(""); const [especialidade, setEspecialidade] = useState("clinica_geral"); const [inicio, setInicio] = useState("2026-11-12T14:00");
  const carregar = async () => { try { setErro(""); const [v, f] = await Promise.all([apiVagasPrioridade.listarVagas(), usuario?.clinica_id ? apiVagasPrioridade.fila(usuario.clinica_id) : Promise.resolve([])]); setVagas(v); setFila(f); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível atualizar."); } };
  useEffect(() => { void carregar(); }, [usuario?.clinica_id]);
  const criar = async (e: FormEvent) => { e.preventDefault(); try { await apiVagasPrioridade.criarVaga(especialidade, new Date(inicio).toISOString()); await carregar(); } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível criar a vaga."); } };
  return <section className="stack"><header><h1>Vagas e prioridade</h1><p>Dados fictícios. A ordem é apoio explicável; a decisão de atendimento é sempre humana.</p></header>
    {erro && <p className="notice notice--danger" role="alert">{erro}</p>}
    <form className="card stack" onSubmit={criar}><h2>Publicar vaga demonstrativa</h2><label className="field">Especialidade<input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} required /></label><label className="field">Data e hora fictícias<input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label><button className="btn btn--primary">Publicar vaga</button></form>
    <section className="stack"><h2>Vagas</h2>{vagas.length === 0 ? <p className="card">Nenhuma vaga informada.</p> : vagas.map((v) => <article className="card stack" key={v.id}><strong>{v.especialidade}</strong><span>{new Date(v.inicio).toLocaleString("pt-BR")} · {v.estado}</span><p>Interesse não é agendamento. Só confirme após avaliação humana.</p><button className="btn btn--outline" disabled={v.estado !== "aberta"} onClick={async () => { try { await apiVagasPrioridade.confirmar(v.id, "interesse-demo"); await carregar(); } catch (e) { setErro(e instanceof Error ? e.message : "Vaga ocupada."); } }}>Confirmar pessoa selecionada</button></article>)}</section>
    <section className="stack"><h2>Fila explicável</h2><p>Urgência avaliada vem antes da pontuação. Relato de urgência não confirmado não gera punição.</p>{fila.map((i) => <article className="card stack" key={i.solicitacao_id}><strong>{i.paciente_nome_exibicao} · score {i.score}</strong><span>{i.urgencia_avaliada ? "Urgência avaliada — prioridade absoluta" : "Sem prioridade de urgência avaliada"}</span><ul>{i.componentes.map((c) => <li key={c.nome}>{c.nome}: {c.valor ?? "desconhecido"} (fonte: {c.fonte})</li>)}</ul>{i.sinalizacoes.map((s) => <p key={s}>{s}</p>)}</article>)}</section>
    <button className="btn btn--outline" onClick={() => void carregar()}>Atualizar manualmente</button>
  </section>;
}
