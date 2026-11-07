import { api, aoLogar, contasDemo, entrar, log, sair, sessao } from './api.js';
import { aviso, carregando, chip, comEspera, h, json, kv, mostrar } from './util.js';
import { abasPaciente } from './paciente.js';
import { abasClinica } from './clinica.js';
import { viewJornada } from './jornada.js';

const $ = (id) => document.getElementById(id);
const view = $('view');
let contas = [];

// ---------- aparência (tema e escala), guardada no aparelho ----------
const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const aplicar = (attr, v) => (v ? document.documentElement.setAttribute(attr, v) : document.documentElement.removeAttribute(attr));
const ciclo = (lista, atual) => lista[(lista.indexOf(atual) + 1) % lista.length];
aplicar('data-theme', ler('uh-theme')); aplicar('data-scale', ler('uh-scale'));
$('theme').onclick = () => { const v = ciclo(['', 'dark', 'hc'], document.documentElement.getAttribute('data-theme') || ''); aplicar('data-theme', v); gravar('uh-theme', v); };
$('scale').onclick = () => { const v = ciclo(['', 'lg', 'xl'], document.documentElement.getAttribute('data-scale') || ''); aplicar('data-scale', v); gravar('uh-scale', v); };

// ---------- emergência: texto estático, sem rede ----------
const dlg = $('dlg-emergencia');
$('btn-emergencia').onclick = () => (dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''));
$('dlg-fechar').onclick = () => (dlg.close ? dlg.close() : dlg.removeAttribute('open'));

// ---------- console de requisições ----------
function itemLog(e) {
  const ok = e.status >= 200 && e.status < 400;
  return h('li', {}, h('details', { class: 'req' },
    h('summary', {}, h('span', { class: 'm' }, e.metodo), ' ', e.caminho, ' → ',
      h('span', { class: ok ? 's-ok' : 's-ruim' }, e.status === 0 ? 'sem resposta' : e.status), e.rotulo ? ` · ${e.rotulo}` : ''),
    e.corpo != null ? h('div', {}, 'Corpo enviado:', json(e.corpo)) : null,
    h('div', {}, 'Resposta:', json(e.resposta))));
}
aoLogar((e) => {
  $('console-lista').prepend(itemLog(e));
  while ($('console-lista').children.length > 100) $('console-lista').lastChild.remove();
  $('console-n').textContent = log.length;
});
$('console-limpar').onclick = () => { log.length = 0; $('console-lista').replaceChildren(); $('console-n').textContent = '0'; };

// ---------- abas e rotas ----------
function abasDoPapel(s) {
  if (!s) return [];
  return s.usuario.papel === 'paciente' ? abasPaciente : abasClinica;
}
const ABAS_FIXAS = [{ id: 'jornada', nome: 'Jornada guiada de teste', ver: viewJornada }];

function rotaAtual() { return (location.hash.replace(/^#\/?/, '') || '').split('?')[0]; }

function desenharNav(s, rota) {
  const nav = $('nav');
  nav.replaceChildren();
  const todas = [...abasDoPapel(s), ...ABAS_FIXAS];
  if (!s) nav.append(h('a', { href: '#/entrar', 'aria-current': rota === 'entrar' ? 'page' : null }, 'Entrar'));
  for (const a of todas) nav.append(h('a', { href: '#/' + a.id, 'aria-current': a.id === rota ? 'page' : null }, a.nome));
}

let geracao = 0;
async function rotear() {
  const s = sessao.get();
  const abas = [...abasDoPapel(s), ...ABAS_FIXAS];
  let rota = rotaAtual();
  if (!s && rota !== 'jornada') rota = 'entrar';
  if (s && rota !== 'entrar' && !abas.some((a) => a.id === rota)) rota = abas[0].id;
  if (location.hash !== '#/' + rota) { history.replaceState(null, '', '#/' + rota); }
  atualizarTopo(s);
  desenharNav(s, rota);
  if (s) document.getElementById('nav').prepend(h('a', { href: '#/entrar', 'aria-current': rota === 'entrar' ? 'page' : null }, 'Trocar conta'));
  const minha = ++geracao;
  view.setAttribute('aria-busy', 'true');
  view.replaceChildren(carregando());
  let conteudo;
  try {
    if (rota === 'entrar') conteudo = await viewEntrar();
    else conteudo = await abas.find((a) => a.id === rota).ver(s, { recarregar: rotear });
  } catch (e) {
    conteudo = h('div', { class: 'erro', role: 'alert' }, 'Erro inesperado na tela: ' + (e && e.message ? e.message : e));
  }
  if (minha !== geracao) return;
  view.replaceChildren(conteudo);
  view.setAttribute('aria-busy', 'false');
}
window.addEventListener('hashchange', rotear);

function atualizarTopo(s) {
  const info = $('conta-info');
  if (!s) { info.textContent = 'Sem login'; }
  else {
    const u = s.usuario;
    info.textContent = `${u.nome_exibicao} · ${u.papel}` + (u.clinica_id ? ` · função ${u.funcao}` : '') + ` · conta ${s.conta}`;
  }
  $('btn-sair').hidden = !s;
}
$('btn-sair').onclick = async () => { await sair(); location.hash = '#/entrar'; rotear(); };

// ---------- login demo ----------
async function viewEntrar() {
  if (!contas.length) contas = await contasDemo();
  const s = sessao.get();
  const saida = h('div', { 'aria-live': 'polite' });
  const grupo = (titulo, itens) => h('fieldset', {}, h('legend', {}, titulo),
    h('div', { class: 'linha' }, itens.map((c) => h('button', {
      class: 'btn btn--outline btn--sm', type: 'button',
      'aria-pressed': s && s.conta === c.conta ? 'true' : 'false',
      onclick: async (ev) => {
        const r = await comEspera(ev.currentTarget, () => entrar(c.conta));
        mostrar(saida, r);
        if (r.ok) { location.hash = '#/'; await rotear(); }
      } }, c.conta))));
  const clinicas = contas.filter((c) => c.papel === 'funcionario');
  return h('div', { class: 'pilha pilha--lg' },
    h('h2', {}, 'Entrar com uma conta fictícia'),
    aviso('Login DEMO sem senha: quem sabe o nome da conta entra. Não é seguro e não deve ir para produção. Papel e clínica vêm do servidor.'),
    s ? h('p', {}, 'Conta atual: ', h('strong', {}, s.conta), ' (', s.usuario.papel, '). Escolha outra para trocar.') : null,
    grupo('Pacientes', contas.filter((c) => c.papel === 'paciente')),
    grupo('Funcionários de clínica', clinicas),
    h('p', { class: 'muted' }, 'Clínica A: atendimento.a e profissional.a. Clínica B: atendimento.b e profissional.b. Coordenação: coordenacao.c (Clínica C).'),
    saida,
    s ? h('details', {}, h('summary', {}, 'Resposta de /auth/me'), json({ usuario: s.usuario, expira_em: s.expira_em })) : null);
}

// ---------- início ----------
(async function iniciar() {
  contas = await contasDemo();
  const s = sessao.get();
  if (s) { // confere o token no servidor: sessões da API são em banco, podem ter expirado
    const me = await api('GET', '/auth/me');
    if (!me.ok) sessao.limpar(); else sessao.set({ ...s, usuario: me.data.usuario });
  }
  await rotear();
})();
