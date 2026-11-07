import { api, q } from './api.js';
import { aviso, campo, carregando, chip, chipEstado, comEspera, dataHora, ESPECIALIDADES, h, json, kv, mostrar, PUBLICOS, rotulo, rotuloDemo, select, textoErro, vazio } from './util.js';
import { cartaoClinica, cartaoPedido, eventosDoPedido, painelSobDemanda, viewAgendamentos } from './comum.js';
import { viewUrgenciaPaciente } from './urgencia.js';
import { viewCenariosPaciente } from './cenarios.js';
import { viewAssistente } from './assistente.js';

export const abasPaciente = [
  { id: 'clinicas', nome: 'Buscar clínicas', ver: viewClinicas },
  { id: 'pedidos', nome: 'Meus pedidos', ver: viewPedidos },
  { id: 'vagas', nome: 'Vagas', ver: viewVagas },
  { id: 'agendamentos', nome: 'Agendamentos', ver: viewAgendamentos },
  { id: 'urgencia', nome: 'Urgência', ver: viewUrgenciaPaciente },
  { id: 'cenarios', nome: 'Cenários acadêmicos', ver: viewCenariosPaciente },
  { id: 'assistente', nome: 'Assistente (chat)', ver: viewAssistente },
];

// ---------- clínicas + novo pedido ----------
async function viewClinicas() {
  const cidade = h('input', { type: 'text', value: 'São Paulo', placeholder: 'Ex.: São Paulo' });
  const esp = select([['', 'Qualquer'], ...ESPECIALIDADES.map((e) => [e, rotulo(e)])], '');
  const lista = h('div', { class: 'grade grade--2', 'aria-live': 'polite' });
  async function buscar(ev) {
    if (ev) ev.preventDefault();
    lista.replaceChildren(carregando());
    const r = await api('GET', '/clinicas' + q({ cidade: cidade.value.trim(), especialidade: esp.value }));
    lista.replaceChildren();
    if (!r.ok) { mostrar(lista, r); return; }
    if (!r.data.itens.length) { lista.append(vazio('Nenhuma clínica encontrada com esses filtros. Tente outra cidade ou especialidade.')); return; }
    r.data.itens.forEach((c) => lista.append(cartaoClinica(c, formPedido(c))));
  }
  buscar();
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Buscar clínicas-escola'),
    aviso('Pedido não é agendamento. A clínica analisa e não há garantia de vaga, custo ou prazo.'),
    h('form', { class: 'card', onsubmit: buscar },
      campo('Cidade (escolhida manualmente)', cidade), campo('Especialidade', esp),
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Buscar')),
    lista);
}

function formPedido(c) {
  const esp = select(c.especialidades.map((e) => [e, rotulo(e)]));
  const pub = select(PUBLICOS.map((p) => [p, rotulo(p)]), c.publico[0]);
  const desc = h('textarea', { maxlength: '280', required: true }, 'Consulta de rotina');
  const saida = h('div', { 'aria-live': 'polite' });
  return h('details', {}, h('summary', {}, 'Enviar pedido a esta clínica'),
    h('form', { onsubmit: async (ev) => {
      ev.preventDefault();
      const r = await comEspera(ev.submitter, () => api('POST', '/solicitacoes', { corpo: {
        clinica_id: c.id, especialidade: esp.value, publico_alvo: pub.value, descricao_administrativa: desc.value.trim() } }));
      mostrar(saida, r, r.ok ? `Pedido enviado. Estado devolvido pelo servidor: ${rotulo(r.data.estado)}. Isso não é agendamento.` : null);
    } },
    campo('Especialidade', esp), campo('Público-alvo', pub),
    campo('Descrição administrativa (sem dados clínicos)', desc, 'Não escreva sintomas nem diagnósticos.'),
    h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Enviar pedido'), saida));
}

// ---------- pedidos, detalhe, alternativas ----------
async function viewPedidos(s, ctx) {
  const r = await api('GET', '/solicitacoes');
  if (!r.ok) return h('div', { class: 'erro', role: 'alert' }, textoErro(r));
  const clinicas = await api('GET', '/clinicas');
  const nomes = Object.fromEntries((clinicas.ok ? clinicas.data.itens : []).map((c) => [c.id, c.nome]));
  const itens = r.data.itens;
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Meus pedidos'),
    aviso('O estado vem do servidor. "Agendada" só aparece depois que a clínica confirmou uma vaga.'),
    itens.length ? h('div', { class: 'grade grade--2' }, itens.map((p) => pedidoComAcoes(p, nomes, ctx)))
      : vazio('Você ainda não enviou pedidos. Use "Buscar clínicas".'));
}

function pedidoComAcoes(p, nomes, ctx) {
  const [btnHist, painelHist] = painelSobDemanda('Ver histórico de eventos', () => eventosDoPedido(p.id));
  const partes = [kv([['Clínica', nomes[p.clinica_id] || p.clinica_id]]), h('div', { class: 'linha' }, btnHist), painelHist];
  if (p.estado === 'indisponivel') {
    const [btnAlt, painelAlt] = painelSobDemanda('Ver alternativas', () => alternativas(p, ctx));
    partes.push(h('div', { class: 'linha' }, btnAlt), painelAlt);
  }
  return cartaoPedido(p, h('div', { class: 'pilha' }, partes));
}

async function alternativas(p, ctx) {
  const r = await api('GET', `/solicitacoes/${p.id}/alternativas`);
  if (!r.ok) return h('div', { class: 'erro', role: 'alert' }, textoErro(r));
  const saida = h('div', { 'aria-live': 'polite' });
  return h('div', { class: 'pilha' },
    aviso(r.data.aviso || 'Você escolhe: nada é enviado sem a sua escolha.'),
    h('p', { class: 'muted' }, 'Critérios: ' + (r.data.criterios || []).join(', ')),
    r.data.itens.length ? r.data.itens.map(({ clinica }) => cartaoClinica(clinica,
      h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: async (ev) => {
        const e = await comEspera(ev.currentTarget, () => api('POST', `/solicitacoes/${p.id}/encaminhar`, { corpo: { clinica_destino_id: clinica.id } }));
        mostrar(saida, e, e.ok ? `Novo pedido criado em ${clinica.nome} (estado: ${rotulo(e.data.solicitacao.estado)}). ${e.data.aviso}` : null);
        if (e.ok) setTimeout(ctx.recarregar, 1200);
      } }, `Escolher ${clinica.nome}`))) : vazio('Nenhuma clínica alternativa no momento.'),
    saida);
}

// ---------- vagas e interesse ----------
async function viewVagas(s, ctx) {
  const [rv, rp] = await Promise.all([api('GET', '/vagas'), api('GET', '/solicitacoes')]);
  const pedidos = rp.ok ? rp.data.itens : [];
  const cab = [h('h2', {}, 'Vagas informadas'),
    aviso((rv.ok && rv.data.aviso) || 'Vaga não é agendamento. Demonstrar interesse não reserva horário.')];
  if (!rv.ok) return h('div', { class: 'pilha' }, cab, h('div', { class: 'erro', role: 'alert' }, textoErro(rv)));
  if (!rv.data.itens.length) return h('div', { class: 'pilha' }, cab,
    vazio('Nenhuma vaga nas clínicas onde você tem pedido ativo. Vagas só aparecem quando a clínica publica uma.'));
  return h('div', { class: 'pilha pilha--lg' }, cab,
    h('div', { class: 'grade grade--2' }, rv.data.itens.map((v) => {
      const saida = h('div', { 'aria-live': 'polite' });
      const meu = pedidos.find((p) => p.clinica_id === v.clinica_id && p.especialidade === v.especialidade
        && !['indisponivel', 'concluida', 'agendada'].includes(p.estado));
      return h('article', { class: 'card' },
        h('h3', {}, `${rotulo(v.especialidade)} · ${dataHora(v.inicio)}`),
        h('div', { class: 'chips' }, chipEstado(v.estado), v.interesse ? h('span', { class: 'chip' }, rotulo(v.interesse)) : null),
        kv([['Fim', dataHora(v.fim)], ['Clínica', v.clinica_id]]),
        v.estado === 'aberta' && !v.interesse ? (meu
          ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: async (ev) => {
            const r = await comEspera(ev.currentTarget, () => api('POST', `/vagas/${v.id}/interesses`, { corpo: { solicitacao_id: meu.id } }));
            mostrar(saida, r, r.ok ? `${r.data.aviso} Pedido agora: ${rotulo(r.data.solicitacao_estado)}.` : null);
            if (r.ok) setTimeout(ctx.recarregar, 1200);
          } }, 'Demonstrar interesse')
          : h('p', { class: 'muted' }, 'Você não tem pedido ativo desta especialidade nesta clínica.')) : null,
        saida);
    })));
}
