import { api } from './api.js';
import { aviso, campo, carregando, chip, comEspera, dataHora, h, kv, mostrar, rotulo, rotuloDemo, select, textoErro, vazio } from './util.js';

const SAMU_ESTATICO = 'Em emergência, ligue 192 (SAMU) ou vá ao pronto-socorro. Este relato NÃO é atendimento nem garante contato imediato.';

function cartaoRelato(r, extra) {
  return h('article', { class: 'card' },
    h('h3', {}, 'Relato de urgência'),
    h('div', { class: 'chips' }, h('span', { class: 'chip' + (r.estado === 'avaliada' ? '' : ' chip--warn') }, `${r.estado === 'avaliada' ? '✓' : '…'} ${r.rotulo}`), rotuloDemo(r.modo || 'demo')),
    kv([['Registrado em', dataHora(r.criado_em)], ['Pedido ligado', r.solicitacao_id],
      ['Avaliação', r.avaliacao ? `${rotulo(r.avaliacao.classificacao)}${r.avaliacao.observacao_administrativa ? ' · ' + r.avaliacao.observacao_administrativa : ''}` : undefined],
      ['Relato', r.id]]),
    r.aviso ? h('p', { class: 'muted' }, r.aviso) : null, extra || null);
}

export async function viewUrgenciaPaciente() {
  const [rl, rp] = await Promise.all([api('GET', '/urgencias'), api('GET', '/solicitacoes')]);
  const pedidos = rp.ok ? rp.data.itens : [];
  const ped = select([['', 'Sem ligar a um pedido'], ...pedidos.map((p) => [p.id, `${rotulo(p.especialidade)} · ${rotulo(p.estado)}`])], '');
  const saida = h('div', { 'aria-live': 'polite' });
  const lista = h('div', { class: 'grade grade--2' });
  const pintar = (r) => { lista.replaceChildren(); if (!r.ok) mostrar(lista, r); else if (!r.data.itens.length) lista.append(vazio('Nenhum relato feito.')); else r.data.itens.forEach((x) => lista.append(cartaoRelato(x))); };
  pintar(rl);
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Relato de urgência'),
    h('p', { class: 'erro', role: 'alert' }, SAMU_ESTATICO),
    aviso('Relatar urgência nunca gera punição. Um profissional da clínica vai avaliar; isso pode levar tempo. Não diagnostica.'),
    h('form', { class: 'card', onsubmit: async (ev) => {
      ev.preventDefault();
      const r = await comEspera(ev.submitter, () => api('POST', '/urgencias', { corpo: ped.value ? { solicitacao_id: ped.value } : {} }));
      mostrar(saida, r, r.ok ? 'Relato registrado. Estado: aguardando avaliação. Se for grave, ligue 192.' : null);
      if (r.ok) pintar(await api('GET', '/urgencias'));
    } }, campo('Ligar a um pedido (opcional)', ped), h('button', { class: 'btn btn--primary', type: 'submit' }, 'Registrar relato de urgência'), saida),
    h('h3', {}, 'Meus relatos'), lista);
}

export async function viewUrgenciaClinica(s) {
  const r = await api('GET', '/urgencias');
  const lista = h('div', { class: 'grade grade--2' });
  const profissional = s.usuario.funcao === 'profissional';
  function pintar(res) {
    lista.replaceChildren();
    if (!res.ok) { mostrar(lista, res); return; }
    if (!res.data.itens.length) { lista.append(vazio('Nenhum relato de urgência na sua clínica.')); return; }
    res.data.itens.forEach((x) => lista.append(cartaoRelato(x, x.estado === 'aguardando_avaliacao' ? formAvaliar(x, async () => pintar(await api('GET', '/urgencias'))) : null)));
  }
  pintar(r);
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Relatos de urgência'),
    aviso(profissional ? 'Você é profissional: pode avaliar. A avaliação é administrativa, sem diagnóstico.' : `Sua função é "${s.usuario.funcao}": só profissional avalia (a API deve negar com 403).`),
    lista);
}

function formAvaliar(relato, depois) {
  const cls = select([['urgencia_confirmada', 'Urgência confirmada'], ['sem_urgencia', 'Sem urgência']]);
  const obs = h('input', { type: 'text', maxlength: '500', placeholder: 'Sem dados clínicos' });
  const saida = h('div', { 'aria-live': 'polite' });
  return h('form', { onsubmit: async (ev) => {
    ev.preventDefault();
    const r = await comEspera(ev.submitter, () => api('POST', `/urgencias/${relato.id}/avaliacao`, { corpo: { classificacao: cls.value, observacao_administrativa: obs.value.trim() || null } }));
    mostrar(saida, r, 'Avaliação registrada.');
    if (r.ok) depois();
  } }, campo('Classificação', cls), campo('Observação administrativa', obs),
  h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Avaliar urgência'), saida);
}
