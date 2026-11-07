import { api } from './api.js';
import { aviso, campo, comEspera, h, mostrar, rotuloDemo, select, textoErro } from './util.js';

let conversa = null; // conversation_id em memória (só nesta aba)
const historico = [];

export async function viewAssistente() {
  const rp = await api('GET', '/acessibilidade/chat/perfil');
  const chat = h('div', { class: 'chat', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversa com o assistente' });
  const respostas = h('div', { class: 'linha' });
  const saida = h('div', { 'aria-live': 'polite' });
  const meta = h('div', { class: 'chips' });
  const texto = h('input', { type: 'text', maxlength: '4000', required: true, autocomplete: 'off' });

  function pintar() {
    chat.replaceChildren(...(historico.length ? historico.map((m) => h('div', { class: 'bolha bolha--' + m.de }, m.texto))
      : [h('p', { class: 'muted' }, 'Diga "oi" ou use um botão de resposta rápida.')]));
    chat.scrollTop = chat.scrollHeight;
  }
  async function enviar(msg) {
    historico.push({ de: 'eu', texto: msg }); pintar();
    const r = await api('POST', '/acessibilidade/chat', { corpo: { message: msg, conversation_id: conversa } });
    saida.replaceChildren();
    if (!r.ok) { mostrar(saida, r); return; }
    conversa = r.data.conversation_id;
    r.data.messages.forEach((m) => historico.push({ de: 'bot', texto: m.text }));
    meta.replaceChildren(rotuloDemo(`${r.data.modo} · fonte: ${r.data.fonte}`), h('span', { class: 'muted' }, r.data.aviso));
    respostas.replaceChildren(...r.data.quick_replies.map((qr) => h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: () => enviar(qr.value) }, qr.label)));
    pintar();
  }
  pintar();
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Assistente acessível (chat)'),
    aviso('Assistente de demonstração, resposta simulada (mock) por padrão. Não diagnostica, não prescreve, não garante vaga. Emergência: 192.'),
    meta, chat, respostas,
    h('form', { class: 'card', onsubmit: async (ev) => {
      ev.preventDefault();
      const m = texto.value.trim(); if (!m) return;
      texto.value = '';
      await comEspera(ev.submitter, () => enviar(m));
    } }, campo('Sua mensagem', texto), h('button', { class: 'btn btn--primary', type: 'submit' }, 'Enviar')),
    saida,
    perfilForm(rp));
}

const ESCOL = [['prefiro_nao_dizer', 'Prefiro não dizer'], ['fundamental_incompleto', 'Fundamental incompleto'], ['fundamental_completo', 'Fundamental completo'],
  ['medio_completo', 'Médio completo'], ['superior_completo', 'Superior completo'], ['pos_graduacao', 'Pós-graduação']];
const FAIXA = [['prefiro_nao_dizer', 'Prefiro não dizer'], ['ate_17', 'Até 17'], ['18_29', '18 a 29'], ['30_59', '30 a 59'], ['60_mais', '60 ou mais']];
const DEF = [['visual', 'Visual'], ['auditiva', 'Auditiva'], ['motora', 'Motora'], ['intelectual', 'Intelectual'], ['tea', 'TEA'], ['nenhuma', 'Nenhuma'], ['prefiro_nao_dizer', 'Prefiro não dizer']];

function perfilForm(rp) {
  const p = rp.ok ? rp.data : { escolaridade: 'prefiro_nao_dizer', faixa_etaria: 'prefiro_nao_dizer', deficiencias: [], prefere_audio: false };
  const esc = select(ESCOL, p.escolaridade), fx = select(FAIXA, p.faixa_etaria);
  const audio = h('input', { type: 'checkbox', checked: !!p.prefere_audio });
  audio.checked = !!p.prefere_audio;
  const defs = DEF.map(([v, t]) => { const i = h('input', { type: 'checkbox', value: v }); i.checked = p.deficiencias.includes(v); return [i, t]; });
  const saida = h('div', { 'aria-live': 'polite' });
  return h('details', { class: 'card', open: !rp.ok ? true : null }, h('summary', {}, 'Perfil de acessibilidade do chat'),
    rp.status === 404 ? h('p', { class: 'muted' }, 'Você ainda não salvou um perfil. Preencha e salve se quiser adaptar as respostas.') : null,
    !rp.ok && rp.status !== 404 ? h('div', { class: 'erro', role: 'alert' }, textoErro(rp)) : null,
    p.resumo ? h('p', { class: 'muted' }, p.resumo) : null,
    h('form', { onsubmit: async (ev) => {
      ev.preventDefault();
      const r = await comEspera(ev.submitter, () => api('PUT', '/acessibilidade/chat/perfil', { corpo: {
        escolaridade: esc.value, faixa_etaria: fx.value, prefere_audio: audio.checked, deficiencias: defs.filter(([i]) => i.checked).map(([i]) => i.value) } }));
      mostrar(saida, r, 'Perfil salvo.');
    } }, campo('Escolaridade', esc), campo('Faixa etária', fx),
    h('fieldset', {}, h('legend', {}, 'Deficiências (opcional)'), defs.map(([i, t], n) => h('div', { class: 'check' }, (i.id = 'def' + n, i), h('label', { for: 'def' + n }, t)))),
    h('div', { class: 'check' }, (audio.id = 'prefaudio', audio), h('label', { for: 'prefaudio' }, 'Prefiro áudio')),
    h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Salvar perfil'), saida));
}
