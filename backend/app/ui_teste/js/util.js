// Utilitários de DOM e formatação. Sem dependências.
export function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  adicionar(el, filhos);
  return el;
}
function adicionar(el, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

export const ESPECIALIDADES = ['clinica_geral', 'pediatria', 'ginecologia_obstetricia', 'cardiologia', 'dermatologia',
  'ortopedia', 'oftalmologia', 'saude_mental', 'odontologia', 'fisioterapia', 'nutricao'];
export const PUBLICOS = ['adultos', 'criancas', 'gestantes', 'idosos'];

const ROTULOS = {
  enviada: 'Enviada', em_analise: 'Em análise', precisa_contato: 'Precisa de contato', indisponivel: 'Indisponível',
  aguardando_confirmacao: 'Aguardando confirmação', agendada: 'Agendada', concluida: 'Concluída',
  aberta: 'Aberta', preenchida: 'Preenchida', cancelada: 'Cancelada', agendado: 'Agendado',
  registrado: 'Interesse registrado', confirmado: 'Confirmado', nao_selecionado: 'Não selecionado', retirado: 'Retirado',
  aguardando_avaliacao: 'Aguardando avaliação', avaliada: 'Avaliada', ativo: 'Ativo', pausado: 'Pausado',
  clinica_geral: 'Clínica geral', pediatria: 'Pediatria', ginecologia_obstetricia: 'Ginecologia/obstetrícia',
  cardiologia: 'Cardiologia', dermatologia: 'Dermatologia', ortopedia: 'Ortopedia', oftalmologia: 'Oftalmologia',
  saude_mental: 'Saúde mental', odontologia: 'Odontologia', fisioterapia: 'Fisioterapia', nutricao: 'Nutrição',
  adultos: 'Adultos', criancas: 'Crianças', gestantes: 'Gestantes', idosos: 'Idosos',
  gratuito: 'Gratuito', a_confirmar: 'Custo a confirmar', urgencia_confirmada: 'Urgência confirmada', sem_urgencia: 'Sem urgência',
  confirmada: 'Confirmada', revertida: 'Revertida', pendente: 'Pendente', falta_registrada: 'Falta registrada',
};
export const rotulo = (v) => ROTULOS[v] || String(v ?? '—');

export function chip(texto, tipo) { return h('span', { class: 'chip' + (tipo ? ' chip--' + tipo : '') }, texto); }
const ICONE = { concluida: '✓', agendada: '✓', agendado: '✓', confirmado: '✓', indisponivel: '✗', cancelada: '✗',
  aguardando_confirmacao: '…', aberta: '●', preenchida: '■' };
export function chipEstado(estado) {
  const tipo = ['indisponivel', 'cancelada', 'precisa_contato'].includes(estado) ? 'warn' : '';
  return chip(`${ICONE[estado] || '•'} ${rotulo(estado)}`, tipo);
}
export const rotuloDemo = (t) => chip(t, 'mock');

export function dataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
}

export function json(obj) { return h('pre', { class: 'json' }, JSON.stringify(obj, null, 2)); }
export const aviso = (t) => h('p', { class: 'aviso', role: 'note' }, t);
export const vazio = (t) => h('div', { class: 'vazio' }, t);
export const carregando = (t = 'Carregando…') => h('div', { class: 'carregando', role: 'status' }, t);

export function kv(pares) {
  const dl = h('dl', { class: 'kv' });
  for (const [k, v] of pares) if (v !== undefined) dl.append(h('dt', {}, k), h('dd', {}, v ?? '—'));
  return dl;
}

let seq = 0;
export function campo(rotuloTxt, controle, dica) {
  const id = 'c' + (++seq);
  controle.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, rotuloTxt), controle, dica ? h('span', { class: 'hint' }, dica) : null);
}
export function select(opcoes, atual) {
  const s = h('select');
  for (const o of opcoes) {
    const [v, t] = Array.isArray(o) ? o : [o, rotulo(o)];
    s.append(h('option', { value: v, selected: v === atual }, t));
  }
  return s;
}

// Mostra o resultado de uma chamada num elemento (erro em pt-BR simples ou sucesso).
export function mostrar(alvo, r, okTexto) {
  alvo.replaceChildren();
  if (!r) return;
  if (r.ok) { if (okTexto) alvo.append(h('div', { class: 'sucesso', role: 'status' }, okTexto)); }
  else alvo.append(h('div', { class: 'erro', role: 'alert' }, textoErro(r)));
}

export function textoErro(r) {
  if (r.status === 0) return 'Não foi possível falar com a API. Verifique se ela está no ar e a sua rede.';
  const e = r.data && r.data.erro;
  let t = (e && e.mensagem) || `Algo deu errado (código ${r.status}).`;
  if (e && e.detalhes && Array.isArray(e.detalhes.campos) && e.detalhes.campos.length) t += ` Campos: ${e.detalhes.campos.join(', ')}.`;
  if (r.indisponivel) t = 'Esta função ainda indisponível nesta versão da API (endpoint não encontrado). ' + t;
  return t;
}

// Executa fn desabilitando o botão e mostrando "Aguarde…" enquanto espera.
export async function comEspera(btn, fn) {
  const antes = btn.textContent;
  btn.disabled = true; btn.textContent = 'Aguarde…';
  try { return await fn(); } finally { btn.disabled = false; btn.textContent = antes; }
}

// ISO 8601 com fuso a partir de <input type="datetime-local">.
export function isoDeLocal(valor) { return new Date(valor).toISOString(); }
export function localPadrao(diasAFrente, hora) {
  const d = new Date(); d.setDate(d.getDate() + diasAFrente); d.setHours(hora, 0, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
