// Servidor MOCK em memória, com as mesmas regras do contrato que a tela depende.
// Dados de ./fixtures (cópia de docs/fixtures — rode `npm run fixtures` para atualizar).
// Tudo some ao recarregar o app: isto é só demonstração.

import clinicasJson from './fixtures/clinicas.json';
import contasJson from './fixtures/contas-demo.json';
import eventosJson from './fixtures/eventos.json';
import solicitacoesJson from './fixtures/solicitacoes.json';
import usuariosJson from './fixtures/usuarios.json';
import { ErroApi } from '../erros';
import type {
  Clinica,
  EventoSolicitacao,
  Lista,
  NovaSolicitacao,
  RespostaLogin,
  Solicitacao,
  Usuario,
} from '../tipos';

const ATRASO_MS = 350; // deixa os estados de carregamento visíveis na demo

const clinicas = clinicasJson.itens as Clinica[];
const usuarios = usuariosJson.itens as (Usuario & { ativo?: boolean })[];
let solicitacoes = [...(solicitacoesJson.itens as Solicitacao[])];
let eventos = [...(eventosJson.itens as EventoSolicitacao[])];

let usuarioAtualId: string | null = null;

export function mockDefinirUsuario(id: string | null) {
  usuarioAtualId = id;
}

const esperar = <T>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), ATRASO_MS));
const lista = <T>(itens: T[]): Lista<T> => ({ itens, total: itens.length });
const naoEncontrado = () => new ErroApi(404, 'nao_encontrado', 'Não encontramos o que você procurou.');

function exigirUsuario(): string {
  if (!usuarioAtualId) throw new ErroApi(401, 'nao_autenticado', 'Você precisa entrar para continuar.');
  return usuarioAtualId;
}

function agoraSP(): string {
  // ISO com fuso -03:00 (contrato §2)
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return d.toISOString().replace(/\.\d{3}Z$/, '-03:00');
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

const ATIVOS = ['enviada', 'em_analise', 'precisa_contato'];

export const mock = {
  async login(conta: string): Promise<RespostaLogin> {
    const c = contasJson.itens.find((x) => x.conta === conta);
    const u = c && usuarios.find((x) => x.id === c.usuario_id && x.ativo !== false);
    if (!u) throw new ErroApi(401, 'nao_autenticado', 'Conta não encontrada. Use uma conta fictícia de demonstração.');
    return esperar({
      modo: 'demo',
      token: `mock-${conta}`,
      usuario: { id: u.id, papel: u.papel, nome_exibicao: u.nome_exibicao },
    });
  },

  async clinicas(filtro: { cidade?: string; especialidade?: string }) {
    exigirUsuario();
    const itens = clinicas.filter(
      (c) =>
        (!filtro.cidade || c.cidade === filtro.cidade) &&
        (!filtro.especialidade || c.especialidades.includes(filtro.especialidade)),
    );
    return esperar(lista(itens));
  },

  async clinica(id: string) {
    exigirUsuario();
    const c = clinicas.find((x) => x.id === id);
    if (!c) throw naoEncontrado();
    return esperar(c);
  },

  async solicitacoes() {
    const eu = exigirUsuario();
    const minhas = solicitacoes
      .filter((s) => s.paciente_id === eu)
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    return esperar(lista(minhas));
  },

  async solicitacao(id: string) {
    const eu = exigirUsuario();
    const s = solicitacoes.find((x) => x.id === id && x.paciente_id === eu);
    if (!s) throw naoEncontrado(); // de outra pessoa → 404 (contrato §2)
    return esperar(s);
  },

  async eventos(id: string) {
    await mock.solicitacao(id);
    const itens = eventos
      .filter((e) => e.solicitacao_id === id)
      .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    return esperar(lista(itens));
  },

  async criarSolicitacao(dados: NovaSolicitacao): Promise<Solicitacao> {
    const eu = exigirUsuario();
    const clinica = clinicas.find((c) => c.id === dados.clinica_id);
    if (!clinica) throw naoEncontrado();
    if (!clinica.recebendo_pedidos) {
      throw new ErroApi(409, 'clinica_sem_recebimento', 'Esta clínica não está recebendo pedidos agora. Veja outras clínicas.');
    }
    const descricao = dados.descricao_administrativa.trim();
    if (!dados.especialidade || descricao.length === 0 || descricao.length > 280) {
      throw new ErroApi(422, 'validacao', 'Alguns dados estão inválidos. Confira e tente de novo.', {
        campos: ['descricao_administrativa'],
      });
    }
    if (!clinica.publico.includes(dados.publico_alvo)) {
      throw new ErroApi(422, 'validacao', 'A clínica não atende o público escolhido.', { campos: ['publico_alvo'] });
    }
    const duplicada = solicitacoes.find(
      (s) =>
        s.paciente_id === eu &&
        s.clinica_id === dados.clinica_id &&
        s.especialidade === dados.especialidade &&
        ATIVOS.includes(s.estado),
    );
    if (duplicada) {
      throw new ErroApi(
        409,
        'solicitacao_duplicada',
        'Você já tem um pedido em andamento nesta clínica para esta especialidade. Acompanhe em "Meus pedidos".',
        { solicitacao_id: duplicada.id },
      );
    }
    const agora = agoraSP();
    const nova: Solicitacao = {
      id: uuid(),
      paciente_id: eu,
      clinica_id: dados.clinica_id,
      estado: 'enviada',
      especialidade: dados.especialidade,
      publico_alvo: dados.publico_alvo,
      descricao_administrativa: descricao,
      solicitacao_origem_id: null,
      criado_em: agora,
      atualizado_em: null,
    };
    solicitacoes = [...solicitacoes, nova];
    eventos = [
      ...eventos,
      {
        id: uuid(),
        solicitacao_id: nova.id,
        tipo: 'criada',
        estado_anterior: null,
        estado_novo: 'enviada',
        autor_usuario_id: eu,
        autor_papel: 'paciente',
        motivo: null,
        criado_em: agora,
      },
    ];
    return esperar(nova);
  },
};
