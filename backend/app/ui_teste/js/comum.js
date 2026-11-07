// Telas e blocos usados por paciente e clínica.
import { api, q } from './api.js';
import { aviso, campo, carregando, chipEstado, comEspera, dataHora, h, json, kv, mostrar, rotulo, select, textoErro, vazio } from './util.js';

export function cartaoClinica(c, extra) {
  return h('article', { class: 'card' },
    h('h3', {}, c.nome),
    h('div', { class: 'chips' },
      h('span', { class: 'chip' }, `${c.cidade}/${c.uf}`),
      h('span', { class: 'chip' }, rotulo(c.custo_informado)),
      h('span', { class: 'chip' + (c.recebendo_pedidos ? ' chip--ok' : ' chip--warn') }, c.recebendo_pedidos ? '✓ Recebendo pedidos' : '✗ Sem receber pedidos agora')),
    kv([['Especialidades', c.especialidades.map(rotulo).join(', ')], ['Públicos', c.publico.map(rotulo).join(', ')],
      ['Telefone', h('a', { href: 'tel:' + c.telefone.replace(/[^\d+]/g, '') }, c.telefone)]]),
    extra || null);
}

export function cartaoPedido(p, extra) {
  return h('article', { class: 'card' },
    h('h3', {}, `${rotulo(p.especialidade)} · ${rotulo(p.publico_alvo)}`),
    h('div', { class: 'chips' }, chipEstado(p.estado)),
    kv([['Descrição', p.descricao_administrativa], ['Criado em', dataHora(p.criado_em)],
      ['Origem', p.solicitacao_origem_id ? 'Encaminhado pelo paciente' : undefined], ['Pedido', p.id]]),
    extra || null);
}

export async function eventosDoPedido(id) {
  const r = await api('GET', `/solicitacoes/${id}/eventos`);
  if (!r.ok) return h('div', { class: 'erro', role: 'alert' }, textoErro(r));
  if (!r.data.itens.length) return vazio('Sem eventos.');
  return h('ol', { class: 'timeline' }, r.data.itens.map((e) => h('li', {},
    h('time', {}, dataHora(e.criado_em)),
    h('strong', {}, e.tipo.replaceAll('_', ' ')), e.estado_novo ? ` → ${rotulo(e.estado_novo)}` : '',
    ` (${e.autor_papel})`, e.motivo ? h('div', { class: 'muted' }, e.motivo) : null)));
}

// Botão que abre/fecha um painel carregado sob demanda.
export function painelSobDemanda(texto, carregar) {
  const alvo = h('div', { class: 'card card--sub', hidden: true });
  const btn = h('button', { class: 'btn btn--outline btn--sm', type: 'button', 'aria-expanded': 'false', onclick: async () => {
    if (!alvo.hidden) { alvo.hidden = true; btn.setAttribute('aria-expanded', 'false'); return; }
    alvo.hidden = false; btn.setAttribute('aria-expanded', 'true');
    alvo.replaceChildren(carregando());
    alvo.replaceChildren(await carregar());
  } }, texto);
  return [btn, alvo];
}

export function cartaoAgendamento(a, s, recarregar) {
  const saida = h('div');
  const motivo = h('input', { type: 'text', maxlength: '280', placeholder: 'Motivo (opcional)' });
  const cancelavel = a.estado === 'agendado';
  return h('article', { class: 'card' },
    h('h3', {}, 'Agendamento'),
    h('div', { class: 'chips' }, chipEstado(a.estado), h('span', { class: 'chip' }, 'Desfecho: ' + rotulo(a.desfecho))),
    kv([['Confirmado em', dataHora(a.confirmado_em)], ['Vaga', a.vaga_id], ['Pedido', a.solicitacao_id], ['Agendamento', a.id],
      ['Motivo do cancelamento', a.motivo_cancelamento]]),
    cancelavel ? h('div', {}, campo('Motivo do cancelamento', motivo),
      h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: async (ev) => {
        const r = await comEspera(ev.currentTarget, () => api('POST', `/agendamentos/${a.id}/cancelar`, { corpo: { motivo: motivo.value.trim() || null } }));
        mostrar(saida, r, 'Agendamento cancelado.');
        if (r.ok) recarregar();
      } }, 'Cancelar agendamento')) : null,
    saida);
}

export async function viewAgendamentos(s, ctx) {
  const filtro = select([['', 'Todos'], ['agendado', 'Agendado'], ['cancelado', 'Cancelado'], ['concluido', 'Concluído']], '');
  const lista = h('div', { class: 'grade grade--2' });
  async function carregar() {
    lista.replaceChildren(carregando());
    const r = await api('GET', '/agendamentos' + q({ estado: filtro.value }));
    lista.replaceChildren();
    if (!r.ok) { mostrar(lista, r); return; }
    if (!r.data.itens.length) { lista.append(vazio('Nenhum agendamento por aqui.')); return; }
    r.data.itens.forEach((a) => lista.append(cartaoAgendamento(a, s, carregar)));
  }
  filtro.onchange = carregar;
  carregar();
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Agendamentos'),
    aviso('Só aparece "agendado" o que o servidor confirmou. Vaga e interesse não são agendamento.'),
    campo('Filtrar por estado', filtro), lista);
}

export function viewRespostaBruta(titulo, r) {
  return h('details', {}, h('summary', {}, titulo), json(r.data));
}
