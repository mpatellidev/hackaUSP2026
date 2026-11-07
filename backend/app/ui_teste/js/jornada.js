import { api, contasDemo, entrar as _e } from './api.js';
import { aviso, campo, carregando, comEspera, h, json, kv, rotulo, select, textoErro } from './util.js';

const A = 'c1000000-0000-4000-8000-000000000001';
const B = 'c1000000-0000-4000-8000-000000000002';
const FUNC = { A: 'funcionario.atendimento.a', B: 'funcionario.atendimento.b' };

// Tokens da jornada ficam só na memória desta tela; não mexem na sua sessão.
const tokens = {};
async function como(conta) {
  if (!tokens[conta]) {
    const r = await api('POST', '/auth/demo/login', { corpo: { conta }, token: null, rotulo: `login ${conta}` });
    if (!r.ok) throw new Error(`Login de ${conta} falhou: ${textoErro(r)}`);
    tokens[conta] = r.data.token;
  }
  return tokens[conta];
}
const chamar = async (conta, m, p, corpo, rotulo) => api(m, p, { corpo, token: await como(conta), rotulo });
const amanha = (h0) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h0, 0, 0, 0); return d.toISOString(); };

function criarPassos(paciente) {
  return [
    { quem: paciente, t: 'Paciente busca clínicas de clínica geral em São Paulo', run: async (c) => {
      const r = await chamar(paciente, 'GET', '/clinicas?cidade=S%C3%A3o%20Paulo&especialidade=clinica_geral', undefined, 'buscar clínicas');
      return { r, ok: r.ok && r.data.itens.some((x) => x.id === A) && r.data.itens.some((x) => x.id === B), espera: 'A lista traz a Clínica A e a B' };
    } },
    { quem: paciente, t: 'Paciente envia pedido à Clínica A', run: async (c) => {
      const r = await chamar(paciente, 'POST', '/solicitacoes', { clinica_id: A, especialidade: 'clinica_geral', publico_alvo: 'adultos', descricao_administrativa: 'Consulta de rotina (jornada de teste)' }, 'pedido à A');
      if (r.ok) c.pedidoA = r.data.id;
      return { r, ok: r.ok && r.data.estado === 'enviada', espera: 'Pedido criado no estado "enviada" (não é agendamento)' };
    } },
    { quem: FUNC.A, t: 'Clínica A marca o pedido como indisponível', run: async (c) => {
      const r = await chamar(FUNC.A, 'PATCH', `/solicitacoes/${c.pedidoA}/estado`, { estado: 'indisponivel', motivo: 'Sem horários neste momento (teste)' }, 'A: indisponível');
      return { r, ok: r.ok && r.data.estado === 'indisponivel', espera: 'Estado "indisponivel"' };
    } },
    { quem: paciente, t: 'Paciente vê alternativas', run: async (c) => {
      const r = await chamar(paciente, 'GET', `/solicitacoes/${c.pedidoA}/alternativas`, undefined, 'alternativas');
      return { r, ok: r.ok && r.data.itens.some((x) => x.clinica.id === B), espera: 'A Clínica B aparece como alternativa' };
    } },
    { quem: paciente, t: 'Paciente ESCOLHE a Clínica B (encaminhar)', run: async (c) => {
      const r = await chamar(paciente, 'POST', `/solicitacoes/${c.pedidoA}/encaminhar`, { clinica_destino_id: B }, 'encaminhar para B');
      if (r.ok) c.pedidoB = r.data.solicitacao.id;
      return { r, ok: r.ok && r.data.solicitacao.clinica_id === B, espera: 'Novo pedido na B, criado só porque o paciente escolheu' };
    } },
    { quem: FUNC.B, t: 'Clínica B marca o pedido como em análise', run: async (c) => {
      const r = await chamar(FUNC.B, 'PATCH', `/solicitacoes/${c.pedidoB}/estado`, { estado: 'em_analise' }, 'B: em análise');
      return { r, ok: r.ok && r.data.estado === 'em_analise', espera: 'Estado "em_analise"' };
    } },
    { quem: FUNC.B, t: 'Clínica B publica uma vaga de clínica geral', run: async (c) => {
      const r = await chamar(FUNC.B, 'POST', '/vagas', { especialidade: 'clinica_geral', inicio: amanha(14), fim: amanha(15) }, 'B: publicar vaga');
      if (r.ok) c.vaga = r.data.id;
      return { r, ok: r.ok && r.data.estado === 'aberta', espera: 'Vaga "aberta"' };
    } },
    { quem: paciente, t: 'Paciente demonstra interesse na vaga', run: async (c) => {
      const r = await chamar(paciente, 'POST', `/vagas/${c.vaga}/interesses`, { solicitacao_id: c.pedidoB }, 'interesse');
      return { r, ok: r.ok && r.data.interesse === 'registrado', espera: 'Interesse registrado (interesse não é agendamento)' };
    } },
    { quem: FUNC.B, t: 'Clínica B lista os interessados (ordem sugerida)', run: async (c) => {
      const r = await chamar(FUNC.B, 'GET', `/vagas/${c.vaga}/interesses`, undefined, 'B: interessados');
      const meu = r.ok && r.data.itens.find((i) => i.solicitacao_id === c.pedidoB);
      if (meu) c.interesse = meu.id;
      return { r, ok: !!meu, espera: 'O interesse do paciente aparece na lista' };
    } },
    { quem: FUNC.B, t: 'Clínica B confirma o paciente', run: async (c) => {
      const r = await chamar(FUNC.B, 'POST', `/vagas/${c.vaga}/confirmar`, { interesse_id: c.interesse }, 'B: confirmar');
      return { r, ok: r.ok, espera: 'Servidor confirma uma única pessoa' };
    } },
    { quem: paciente, t: 'Paciente confere o estado do pedido (só vale o que o servidor devolve)', run: async (c) => {
      const r = await chamar(paciente, 'GET', `/solicitacoes/${c.pedidoB}`, undefined, 'conferir pedido');
      return { r, ok: r.ok && r.data.estado === 'agendada', espera: 'Estado "agendada" devolvido pelo backend' };
    } },
    { quem: paciente, t: 'Paciente consulta seus agendamentos (endpoint novo)', run: async (c) => {
      const r = await chamar(paciente, 'GET', '/agendamentos', undefined, 'meus agendamentos');
      if (r.status === 404) return { r, pulado: true, espera: 'GET /agendamentos ainda não existe nesta API' };
      return { r, ok: r.ok && r.data.itens.some((a) => a.solicitacao_id === c.pedidoB && a.estado === 'agendado'), espera: 'Agendamento "agendado" do pedido aparece' };
    } },
  ];
}

export async function viewJornada() {
  const contas = (await contasDemo()).filter((c) => c.papel === 'paciente');
  const pac = select(contas.map((c) => [c.conta, c.conta]), 'paciente.diego');
  const lista = h('ol', { class: 'passos' });
  const geral = h('div', { 'aria-live': 'polite' });
  let passos = [], ctx = {}, prox = 0, rodando = false;

  function desenhar() {
    lista.replaceChildren(...passos.map((p, n) => h('li', { class: 'passo', 'data-s': p.s || 'pendente' },
      h('div', { class: 'passo__t' },
        h('span', { class: 'marca', 'aria-label': { ok: 'passou', erro: 'falhou', pulado: 'pulado' }[p.s] || 'pendente' }, { ok: '✓', erro: '✗', pulado: '↷' }[p.s] || (n === prox ? '▶' : '○')),
        h('strong', {}, `${n + 1}. ${p.t}`), h('span', { class: 'chip' }, p.quem)),
      p.det ? h('details', { open: p.s === 'erro' ? true : null }, h('summary', {}, `Esperado: ${p.det.espera} · resposta ${p.det.r.status}`),
        p.det.r.ok ? null : h('div', { class: 'erro' }, textoErro(p.det.r)), json(p.det.r.data)) : null)));
  }
  function reiniciar() {
    passos = criarPassos(pac.value).map((p) => ({ ...p })); ctx = {}; prox = 0; geral.replaceChildren(); desenhar();
  }
  async function executarUm() {
    const p = passos[prox];
    try {
      const d = await p.run(ctx);
      p.det = d; p.s = d.pulado ? 'pulado' : d.ok ? 'ok' : 'erro';
    } catch (e) {
      p.s = 'erro'; p.det = { r: { ok: false, status: 0, data: { erro: { mensagem: e.message } } }, espera: 'sem exceção' };
    }
    const falhou = p.s === 'erro';
    if (!falhou) prox++;
    desenhar();
    return !falhou;
  }
  async function rodar(todos, btn) {
    if (rodando || prox >= passos.length) return;
    rodando = true;
    await comEspera(btn, async () => { do { if (!(await executarUm())) break; } while (todos && prox < passos.length); });
    rodando = false;
    const erro = passos.find((p) => p.s === 'erro');
    geral.replaceChildren(erro ? h('div', { class: 'erro', role: 'alert' }, `Parou no passo "${erro.t}". Veja a resposta acima. Para repetir a jornada use "Reiniciar" (se o pedido ficou duplicado, escolha outro paciente).`)
      : prox >= passos.length ? h('div', { class: 'sucesso', role: 'status' }, 'Jornada completa: cada ✓ foi confirmado por uma resposta do backend.') : null);
  }
  pac.onchange = reiniciar;
  reiniciar();
  const bProx = h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: (e) => rodar(false, e.currentTarget) }, 'Executar próximo passo');
  const bTodos = h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: (e) => rodar(true, e.currentTarget) }, 'Executar tudo');
  const bReset = h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: reiniciar }, 'Reiniciar');
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Jornada guiada de teste'),
    aviso('Percorre a jornada P0 trocando de conta sozinha (sem mexer na sua sessão): pedido à Clínica A, indisponível, escolha da B, vaga, interesse, confirmação. Cada requisição aparece no console de baixo. Os dados são gravados de verdade no banco de teste da API.'),
    h('div', { class: 'card' }, campo('Paciente da jornada', pac, 'Use um paciente sem pedido ativo de clínica geral na Clínica A (padrão: paciente.diego). Repetir com o mesmo paciente gera "pedido duplicado".'),
      h('div', { class: 'linha' }, bProx, bTodos, bReset)),
    geral, lista);
}
