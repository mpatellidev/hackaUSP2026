import { api, contasDemo, q } from './api.js';
import { aviso, campo, carregando, chip, comEspera, ESPECIALIDADES, h, kv, mostrar, PUBLICOS, rotulo, rotuloDemo, select, textoErro, vazio } from './util.js';

function cartaoCenario(c, extra) {
  return h('article', { class: 'card' },
    h('h3', {}, c.titulo),
    h('div', { class: 'chips' }, h('span', { class: 'chip' }, rotulo(c.estado)), h('span', { class: 'chip' }, rotulo(c.especialidade)), h('span', { class: 'chip' }, `${c.cidade}/${c.uf}`),
      c.meu_interesse ? h('span', { class: 'chip chip--ok' }, '✓ Seu interesse: ' + rotulo(c.meu_interesse)) : null),
    h('p', {}, c.descricao_leiga),
    kv([['Público', c.publico ? rotulo(c.publico) : 'Qualquer'], ['Requisitos', c.requisitos.length ? c.requisitos.join('; ') : 'Nenhum'], ['Cenário', c.id]]),
    extra || null);
}

export async function viewCenariosPaciente(s, ctx) {
  const r = await api('GET', '/cenarios');
  const cab = [h('h2', {}, 'Cenários acadêmicos'), rotuloDemo('demo · dados na memória da API')];
  if (!r.ok) return h('div', { class: 'pilha' }, cab, h('div', { class: 'erro', role: 'alert' }, textoErro(r)));
  return h('div', { class: 'pilha pilha--lg' }, cab, aviso(r.data.aviso),
    r.data.itens.length ? h('div', { class: 'grade grade--2' }, r.data.itens.map((c) => {
      const saida = h('div', { 'aria-live': 'polite' });
      const ativo = c.meu_interesse === 'registrado';
      return cartaoCenario(c, h('div', {}, h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: async (ev) => {
        const x = await comEspera(ev.currentTarget, () => api(ativo ? 'DELETE' : 'POST', `/cenarios/${c.id}/interesses`));
        mostrar(saida, x, x.ok ? (ativo ? 'Interesse retirado.' : 'Interesse registrado. Não é confirmação nem agendamento.') : null);
        if (x.ok) setTimeout(ctx.recarregar, 1000);
      } }, ativo ? 'Retirar interesse' : 'Tenho interesse'), saida));
    })) : vazio(r.data.mensagem_vazia || 'Nenhum cenário ativo.'));
}

export async function viewCenariosClinica(s, ctx) {
  const r = await api('GET', '/cenarios');
  const cab = [h('h2', {}, 'Cenários acadêmicos da clínica'), rotuloDemo('demo · dados na memória da API')];
  if (!r.ok) return h('div', { class: 'pilha' }, cab, h('div', { class: 'erro', role: 'alert' }, textoErro(r)));
  const t = campo('Título', h('input', { type: 'text', minlength: '3', maxlength: '120', required: true, value: 'Atendimento supervisionado de teste' }));
  const d = campo('Descrição em linguagem simples', h('textarea', { minlength: '10', maxlength: '600', required: true }, 'Atividade supervisionada com estudantes, para teste.'));
  const esp = campo('Especialidade', select(ESPECIALIDADES.map((e) => [e, rotulo(e)]), 'clinica_geral'));
  const pub = campo('Público', select([['', 'Qualquer'], ...PUBLICOS.map((p) => [p, rotulo(p)])], ''));
  const cid = campo('Cidade', h('input', { type: 'text', value: 'São Paulo', required: true }));
  const uf = campo('UF', h('input', { type: 'text', value: 'SP', maxlength: '2', required: true }));
  const saidaNovo = h('div', { 'aria-live': 'polite' });
  const val = (c) => c.querySelector('input,select,textarea').value;
  return h('div', { class: 'pilha pilha--lg' }, cab, aviso(r.data.aviso),
    r.data.itens.length ? h('div', { class: 'grade grade--2' }, r.data.itens.map((c) => {
      const saida = h('div', { 'aria-live': 'polite' });
      const alvo = c.estado === 'ativo' ? 'pausado' : 'ativo';
      const lista = h('div', { class: 'card card--sub', hidden: true });
      return cartaoCenario(c, h('div', { class: 'pilha' },
        h('div', { class: 'linha' },
          h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: async (ev) => {
            const x = await comEspera(ev.currentTarget, () => api('PATCH', `/cenarios/${c.id}`, { corpo: { estado: alvo } }));
            mostrar(saida, x, 'Cenário atualizado.'); if (x.ok) setTimeout(ctx.recarregar, 800);
          } }, alvo === 'pausado' ? 'Pausar' : 'Reativar'),
          h('button', { class: 'btn btn--outline btn--sm', type: 'button', onclick: async () => {
            lista.hidden = false; lista.replaceChildren(carregando());
            const x = await api('GET', `/cenarios/${c.id}/interesses`);
            lista.replaceChildren(!x.ok ? h('div', { class: 'erro', role: 'alert' }, textoErro(x))
              : x.data.itens.length ? h('ul', {}, x.data.itens.map((i) => h('li', {}, `Paciente ${i.paciente_id.slice(-2)} · ${rotulo(i.estado)}`))) : vazio('Ninguém demonstrou interesse.'));
          } }, 'Ver interessados')),
        saida, lista));
    })) : vazio(r.data.mensagem_vazia || 'Nenhum cenário.'),
    h('form', { class: 'card', onsubmit: async (ev) => {
      ev.preventDefault();
      const corpo = { titulo: val(t), descricao_leiga: val(d), especialidade: val(esp), publico: val(pub) || null, cidade: val(cid), uf: val(uf), requisitos: [] };
      const x = await comEspera(ev.submitter, () => api('POST', '/cenarios', { corpo }));
      mostrar(saidaNovo, x, 'Cenário criado.'); if (x.ok) setTimeout(ctx.recarregar, 800);
    } }, h('h3', {}, 'Criar cenário (só coordenação; outras funções devem receber 403)'), t, d, esp, pub, cid, uf,
    h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Criar cenário'), saidaNovo),
    await blocoCompatibilidade());
}

async function blocoCompatibilidade() {
  const contas = (await contasDemo()).filter((c) => c.papel === 'paciente');
  const pac = select(contas.map((c) => [c.usuario_id, c.conta]));
  const esp = select([['', 'Qualquer'], ...ESPECIALIDADES.map((e) => [e, rotulo(e)])], '');
  const saida = h('div', { 'aria-live': 'polite' });
  return h('form', { class: 'card', onsubmit: async (ev) => {
    ev.preventDefault();
    const x = await comEspera(ev.submitter, () => api('GET', '/cenarios/compatibilidade' + q({ paciente_id: pac.value, especialidade: esp.value })));
    saida.replaceChildren();
    if (!x.ok) { mostrar(saida, x); return; }
    saida.append(h('div', { class: 'sucesso', role: 'status' }, x.data.correspondente ? '✓ Há cenário correspondente (sinal para a fila; não é prioridade clínica).' : 'Sem cenário correspondente.'), kv(Object.entries(x.data).filter(([k]) => k !== 'correspondente')));
  } }, h('h3', {}, 'Compatibilidade acadêmica'), campo('Paciente (conta fictícia)', pac), campo('Especialidade', esp),
  h('button', { class: 'btn btn--outline btn--sm', type: 'submit' }, 'Verificar'), saida);
}
