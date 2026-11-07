import { api, q } from './api.js';
import { aviso, campo, carregando, chipEstado, comEspera, dataHora, ESPECIALIDADES, h, isoDeLocal, kv, localPadrao, mostrar, rotulo, rotuloDemo, select, textoErro, vazio } from './util.js';
import { cartaoPedido, eventosDoPedido, painelSobDemanda, viewAgendamentos } from './comum.js';
import { viewUrgenciaClinica } from './urgencia.js';
import { viewCenariosClinica } from './cenarios.js';

export const abasClinica = [
  { id: 'solicitacoes', nome: 'Solicitações', ver: viewSolicitacoes },
  { id: 'vagas', nome: 'Vagas e interessados', ver: viewVagas },
  { id: 'fila', nome: 'Fila de prioridade', ver: viewFila },
  { id: 'agendamentos', nome: 'Agendamentos', ver: viewAgendamentos },
  { id: 'urgencia', nome: 'Urgência', ver: viewUrgenciaClinica },
  { id: 'faltas', nome: 'Faltas e revisão', ver: viewFaltas },
  { id: 'cenarios', nome: 'Cenários', ver: viewCenariosClinica },
];

const cabecalho = (s) => h('p', { class: 'muted' }, `Clínica ${s.usuario.clinica_id} · função: ${s.usuario.funcao}`);

// ---------- solicitações ----------
async function viewSolicitacoes(s, ctx) {
  const filtro = select([['', 'Todos'], 'enviada', 'em_analise', 'precisa_contato', 'aguardando_confirmacao', 'agendada', 'indisponivel', 'concluida'], location.hash.includes('estado=') ? '' : '');
  const lista = h('div', { class: 'grade grade--2' });
  async function carregar() {
    lista.replaceChildren(carregando());
    const r = await api('GET', '/solicitacoes' + q({ estado: filtro.value }));
    lista.replaceChildren();
    if (!r.ok) { mostrar(lista, r); return; }
    if (!r.data.itens.length) { lista.append(vazio('Nenhum pedido neste filtro.')); return; }
    r.data.itens.forEach((p) => lista.append(cartaoPedido(p, acoesPedido(p, carregar))));
  }
  filtro.onchange = carregar; carregar();
  return h('div', { class: 'pilha pilha--lg' }, h('h2', {}, 'Solicitações da clínica'), cabecalho(s),
    aviso('A mudança de estado é humana e registrada no histórico. "Agendada" só nasce da confirmação de uma vaga.'),
    campo('Filtrar por estado', filtro), lista);
}

function acoesPedido(p, recarregar) {
  const motivo = h('input', { type: 'text', maxlength: '280', placeholder: 'Motivo administrativo (obrigatório p/ contato e indisponível)' });
  const saida = h('div', { 'aria-live': 'polite' });
  const [btnHist, painelHist] = painelSobDemanda('Histórico de eventos', () => eventosDoPedido(p.id));
  const [btnPri, painelPri] = painelSobDemanda('Decomposição do score', async () => {
    const r = await api('GET', `/solicitacoes/${p.id}/prioridade`);
    return r.ok ? itemFila(r.data) : h('div', { class: 'erro', role: 'alert' }, textoErro(r));
  });
  const botao = (estado) => h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: async (ev) => {
    const r = await comEspera(ev.currentTarget, () => api('PATCH', `/solicitacoes/${p.id}/estado`, { corpo: { estado, motivo: motivo.value.trim() || null } }));
    mostrar(saida, r, r.ok ? `Estado agora: ${rotulo(r.data.estado)}.` : null);
    if (r.ok) setTimeout(recarregar, 900);
  } }, rotulo(estado));
  return h('div', { class: 'pilha' }, campo('Motivo', motivo),
    h('div', { class: 'linha' }, ['em_analise', 'precisa_contato', 'indisponivel', 'concluida'].map(botao)), saida,
    h('div', { class: 'linha' }, btnHist, btnPri), painelHist, painelPri);
}

// ---------- vagas ----------
async function viewVagas(s, ctx) {
  const esp = select(ESPECIALIDADES.map((e) => [e, rotulo(e)]), 'clinica_geral');
  const ini = h('input', { type: 'datetime-local', value: localPadrao(1, 14), required: true });
  const fim = h('input', { type: 'datetime-local', value: localPadrao(1, 15), required: true });
  const saidaNova = h('div', { 'aria-live': 'polite' });
  const r = await api('GET', '/vagas');
  const lista = h('div', { class: 'grade grade--2' });
  if (!r.ok) lista.append(h('div', { class: 'erro', role: 'alert' }, textoErro(r)));
  else if (!r.data.itens.length) lista.append(vazio('Nenhuma vaga publicada.'));
  else r.data.itens.forEach((v) => lista.append(cartaoVaga(v, ctx)));
  return h('div', { class: 'pilha pilha--lg' }, h('h2', {}, 'Vagas ociosas e interessados'), cabecalho(s),
    aviso((r.ok && r.data.aviso) || 'Vaga não é agendamento: a clínica confirma uma única pessoa.'),
    h('form', { class: 'card', onsubmit: async (ev) => {
      ev.preventDefault();
      const x = await comEspera(ev.submitter, () => api('POST', '/vagas', { corpo: { especialidade: esp.value, inicio: isoDeLocal(ini.value), fim: isoDeLocal(fim.value) } }));
      mostrar(saidaNova, x, 'Vaga publicada (aberta). Pacientes só veem se tiverem pedido ativo nesta clínica.');
      if (x.ok) setTimeout(ctx.recarregar, 900);
    } }, h('h3', {}, 'Publicar vaga'), campo('Especialidade', esp), campo('Início', ini), campo('Fim', fim),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Publicar vaga'), saidaNova),
    lista);
}

function cartaoVaga(v, ctx) {
  const interessados = h('div', { class: 'card card--sub', hidden: true });
  const saida = h('div', { 'aria-live': 'polite' });
  async function abrir() {
    interessados.hidden = false; interessados.replaceChildren(carregando());
    const x = await api('GET', `/vagas/${v.id}/interesses`);
    if (!x.ok) { interessados.replaceChildren(h('div', { class: 'erro', role: 'alert' }, textoErro(x))); return; }
    interessados.replaceChildren(aviso(x.data.aviso), x.data.itens.length ? h('div', { class: 'pilha' }, x.data.itens.map((i) => h('div', { class: 'card' },
      h('h3', {}, `#${i.posicao_sugerida} ${i.paciente_nome_exibicao}`),
      h('div', { class: 'chips' }, chipEstado(i.estado), i.urgencia_avaliada ? h('span', { class: 'chip chip--warn' }, 'Urgência avaliada') : null, h('span', { class: 'chip' }, `Score ${i.score}`)),
      kv([['Pedido', rotulo(i.pedido_estado)], ['Sinalizações', (i.sinalizacoes || []).join('; ') || 'Nenhuma']]),
      i.estado === 'registrado' && v.estado === 'aberta' ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: async (ev) => {
        const c = await comEspera(ev.currentTarget, () => api('POST', `/vagas/${v.id}/confirmar`, { corpo: { interesse_id: i.id } }));
        mostrar(saida, c, c.ok ? 'Confirmado pelo servidor: agendamento criado e pedido agendado.' : null);
        if (c.ok) setTimeout(ctx.recarregar, 1200);
      } }, 'Confirmar esta pessoa') : null))) : vazio('Ninguém demonstrou interesse ainda.'));
  }
  return h('article', { class: 'card' },
    h('h3', {}, `${rotulo(v.especialidade)} · ${dataHora(v.inicio)}`),
    h('div', { class: 'chips' }, chipEstado(v.estado), h('span', { class: 'chip' }, `${v.interesses_registrados ?? 0} interesse(s)`)),
    kv([['Fim', dataHora(v.fim)], ['Vaga', v.id]]),
    h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: abrir }, 'Ver interessados (ordem sugerida)'),
    saida, interessados);
}

// ---------- fila explicável ----------
function itemFila(i) {
  return h('div', { class: 'pilha' },
    h('div', { class: 'chips' }, i.urgencia_avaliada ? h('span', { class: 'chip chip--warn' }, '⚠ Urgência avaliada (vem primeiro)') : null, h('span', { class: 'chip' }, `Score ${i.score}`), h('span', { class: 'chip' }, `Pesos ${i.versao_pesos}`)),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ['Componente', 'Valor', 'Peso', 'Fonte'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, i.componentes.map((c) => h('tr', {}, h('td', {}, c.nome), h('td', {}, c.valor ?? '—'), h('td', {}, c.peso), h('td', {}, c.fonte)))))),
    i.sinalizacoes && i.sinalizacoes.length ? h('p', { class: 'muted' }, 'Sinalizações: ' + i.sinalizacoes.join('; ')) : null);
}

async function viewFila(s) {
  const r = await api('GET', `/clinicas/${s.usuario.clinica_id}/fila`);
  const cab = [h('h2', {}, 'Fila de prioridade explicável'), cabecalho(s)];
  if (!r.ok) return h('div', { class: 'pilha' }, cab, h('div', { class: 'erro', role: 'alert' }, textoErro(r)));
  return h('div', { class: 'pilha pilha--lg' }, cab, aviso(r.data.aviso),
    h('div', { class: 'chips' }, r.data.fontes_demo ? rotuloDemo('fontes de dados: demo') : null, h('span', { class: 'chip' }, 'Ordenação: ' + r.data.ordenacao)),
    r.data.itens.length ? h('div', { class: 'pilha' }, r.data.itens.map((i) => h('article', { class: 'card' },
      h('h3', {}, `#${i.posicao} ${i.paciente_nome_exibicao} · ${rotulo(i.especialidade)}`),
      h('div', { class: 'chips' }, chipEstado(i.estado)), itemFila(i)))) : vazio('Fila vazia: nenhum pedido ativo.'));
}

// ---------- faltas ----------
async function viewFaltas(s, ctx) {
  const [rf, ra] = await Promise.all([api('GET', '/faltas'), api('GET', '/agendamentos' + q({ estado: 'agendado' }))]);
  const ags = ra.ok ? ra.data.itens : [];
  const ag = ags.length ? select(ags.map((a) => [a.id, `${dataHora(a.confirmado_em)} · ${a.id.slice(0, 8)}`])) : h('input', { type: 'text', placeholder: 'ID do agendamento', required: true });
  const just = h('input', { type: 'text', minlength: '5', maxlength: '280', required: true, value: 'Não compareceu no horário combinado' });
  const saida = h('div', { 'aria-live': 'polite' });
  const lista = h('div', { class: 'grade grade--2' });
  if (!rf.ok) lista.append(h('div', { class: 'erro', role: 'alert' }, textoErro(rf)));
  else if (!rf.data.itens.length) lista.append(vazio('Nenhuma falta registrada.'));
  else rf.data.itens.forEach((f) => lista.append(cartaoFalta(f, ctx)));
  return h('div', { class: 'pilha pilha--lg' }, h('h2', {}, 'Faltas e revisão'), cabecalho(s),
    aviso('Só falta verificada por humano entra no score, com justificativa e revisão possível. Nunca passa à frente de urgência avaliada. Registrar: só profissional. Revisar: profissional ou coordenação.'),
    ra.indisponivel ? aviso('Lista de agendamentos ainda indisponível nesta API: informe o ID manualmente.') : null,
    h('form', { class: 'card', onsubmit: async (ev) => {
      ev.preventDefault();
      const r = await comEspera(ev.submitter, () => api('POST', '/faltas', { corpo: { agendamento_id: ag.value, justificativa: just.value.trim() } }));
      mostrar(saida, r, 'Falta registrada.'); if (r.ok) setTimeout(ctx.recarregar, 900);
    } }, h('h3', {}, 'Registrar falta'), campo('Agendamento', ag), campo('Justificativa', just),
    h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Registrar falta'), saida),
    lista);
}

function cartaoFalta(f, ctx) {
  const motivo = h('input', { type: 'text', minlength: '5', maxlength: '280', value: 'Revisão do caso' });
  const saida = h('div', { 'aria-live': 'polite' });
  const rev = (acao) => h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: async (ev) => {
    const r = await comEspera(ev.currentTarget, () => api('POST', `/faltas/${f.id}/revisao`, { corpo: { acao, motivo: motivo.value.trim() } }));
    mostrar(saida, r, 'Revisão registrada.'); if (r.ok) setTimeout(ctx.recarregar, 900);
  } }, acao === 'reverter' ? 'Reverter falta' : 'Manter falta');
  return h('article', { class: 'card' }, h('h3', {}, 'Falta'),
    h('div', { class: 'chips' }, h('span', { class: 'chip' }, rotulo(f.estado))),
    kv([['Justificativa', f.justificativa], ['Registrada em', dataHora(f.criado_em)], ['Agendamento', f.agendamento_id],
      ['Revisões', f.revisoes.length ? f.revisoes.map((r) => `${r.acao}: ${r.motivo}`).join(' | ') : 'Nenhuma']]),
    campo('Motivo da revisão', motivo), h('div', { class: 'linha' }, rev('reverter'), rev('manter')), saida);
}
