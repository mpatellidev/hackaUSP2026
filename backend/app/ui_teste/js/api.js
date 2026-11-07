// Cliente fino da API real (/api/v1, mesma origem). Registra cada requisição no console da UI.
const BASE = '/api/v1';
export const log = [];
const ouvintes = new Set();
export const aoLogar = (fn) => ouvintes.add(fn);

const CHAVE = 'uh-teste-sessao';
export const sessao = {
  get() { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || null; } catch { return null; } },
  set(v) { try { sessionStorage.setItem(CHAVE, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  limpar() { try { sessionStorage.removeItem(CHAVE); } catch { /* idem */ } },
};

// Endpoints que o backend ainda pode não ter: 404 vira "ainda indisponível".
const NOVOS = [/^\/agendamentos/];

export async function api(metodo, caminho, { corpo, token, rotulo } = {}) {
  const tk = token === undefined ? (sessao.get() || {}).token : token;
  const url = BASE + caminho;
  const entrada = { t: new Date(), metodo, caminho, corpo: corpo ?? null, status: null, resposta: null, rotulo };
  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (tk) cabecalhos.Authorization = 'Bearer ' + tk;
  const ctl = new AbortController();
  const tempo = setTimeout(() => ctl.abort(), 20000);
  let r;
  try {
    const resp = await fetch(url, { method: metodo, headers: cabecalhos, signal: ctl.signal,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
    let data = null;
    if (resp.status !== 204) { try { data = await resp.json(); } catch { data = null; } }
    r = { ok: resp.ok, status: resp.status, data };
    if (resp.status === 404 && NOVOS.some((re) => re.test(caminho))) r.indisponivel = true;
  } catch (e) {
    r = { ok: false, status: 0, data: { erro: { mensagem: 'Falha de rede ou tempo esgotado.' } } };
  } finally { clearTimeout(tempo); }
  entrada.status = r.status; entrada.resposta = r.data;
  log.push(entrada); if (log.length > 150) log.shift();
  ouvintes.forEach((fn) => fn(entrada));
  return r;
}

export const q = (obj) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? '?' + s : '';
};

export async function contasDemo() {
  try { const r = await fetch('dados/contas-demo.json'); return (await r.json()).itens; } catch { return []; }
}

export async function entrar(conta) {
  const r = await api('POST', '/auth/demo/login', { corpo: { conta }, token: null });
  if (!r.ok) return r;
  const me = await api('GET', '/auth/me', { token: r.data.token });
  if (!me.ok) return me;
  sessao.set({ token: r.data.token, conta, expira_em: r.data.expira_em, usuario: me.data.usuario, modo: me.data.modo });
  return { ok: true, status: 200, data: me.data };
}

export async function sair() {
  const s = sessao.get();
  if (s) await api('POST', '/auth/logout');
  sessao.limpar();
}
