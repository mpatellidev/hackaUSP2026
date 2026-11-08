import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ErroApi } from "@uhealth/api-client";
import { PainelClinica } from "./PainelClinica";

/* API simulada em memória: mesmas rotas e formato de resposta do openapi-fetch. Dados fictícios. */
const CLINICA = "c1000000-0000-4000-8000-000000000001";
const DIA = 864e5;
const atras = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();
type Chamada = { metodo: string; caminho: string; corpo?: unknown };

let chamadas: Chamada[];
let funcao: string;
let falharPedidos: boolean;
let db: ReturnType<typeof dadosIniciais>;

function dadosIniciais() {
  const pedido = (id: string, nome: string, estado: string, especialidade: string, dias: number) => ({
    id, paciente_id: `p-${id}`, clinica_id: CLINICA, estado, especialidade, publico_alvo: "adultos", descricao_administrativa: `Motivo de ${nome}`,
    solicitacao_origem_id: null, criado_em: atras(dias), atualizado_em: null, para_quem: "mim", nome_paciente: null, telefone_contato: "(11) 90000-0000", trilha: null,
    paciente_nome_exibicao: nome,
  });
  return {
    clinica: {
      id: CLINICA, nome: "Clínica-Escola Teste", cidade: "São Paulo", uf: "SP", publico: ["adultos"], especialidades: ["triagem", "endodontia"],
      custo_informado: "gratuito", recebendo_pedidos: true, telefone: "(11) 1000-0001", endereco: "Rua Fictícia, 1", bairro: "Centro",
      universidade: "Universidade Fictícia", turnos: [], transportes: [], horarios_funcionamento: {}, atende_urgencia: false, horario_urgencia: {},
    },
    pedidos: [
      pedido("aaaa1111-0000", "Ana Teste", "enviada", "triagem", 3),
      pedido("bbbb2222-0000", "Bruno Teste", "em_analise", "endodontia", 20),
      pedido("cccc3333-0000", "Carla Teste", "agendada", "triagem", 8),
    ],
    vagas: [{ id: "v1", clinica_id: CLINICA, especialidade: "triagem", inicio: atras(-2), fim: atras(-2), estado: "aberta", profissional_id: null, criado_em: atras(1), interesses_registrados: 0 }],
  };
}

const NA_FILA = ["enviada", "em_analise", "precisa_contato", "aguardando_confirmacao"];
const rotas: Record<string, (c: Chamada & { params?: { path?: Record<string, string> } }) => unknown> = {
  "GET /clinicas/{clinica_id}": () => db.clinica,
  "GET /painel-clinica/pedidos": () => {
    if (falharPedidos) throw new ErroApi(500, "erro_interno", "Servidor indisponível (teste).");
    return { itens: db.pedidos, total: db.pedidos.length };
  },
  "GET /clinicas/{clinica_id}/fila": () => {
    const itens = db.pedidos.filter((p) => NA_FILA.includes(p.estado)).map((p, i) => ({
      posicao: i + 1, solicitacao_id: p.id, clinica_id: CLINICA, paciente_nome_exibicao: p.paciente_nome_exibicao, estado: p.estado,
      especialidade: p.especialidade, criado_em: p.criado_em, urgencia_avaliada: false, score: 1, versao_pesos: "v1", componentes: [], sinalizacoes: [],
    }));
    return { itens, total: itens.length, versao_pesos: "v1", ordenacao: "urgência avaliada primeiro", fontes_demo: true, aviso: "Sugestão; a decisão é humana." };
  },
  "GET /vagas": () => ({ itens: db.vagas, total: db.vagas.length }),
  "GET /profissionais": () => ({ itens: [], total: 0 }),
  "GET /solicitacoes/{solicitacao_id}/eventos": () => ({ itens: [], total: 0 }),
  "PATCH /solicitacoes/{solicitacao_id}/estado": (c) => {
    const p = db.pedidos.find((x) => x.id === c.params?.path?.solicitacao_id)!;
    p.estado = (c.corpo as { estado: string }).estado;
    return p;
  },
  "POST /vagas": (c) => ({ ...db.vagas[0], ...(c.corpo as object), id: "v2" }),
  "PATCH /clinicas/{clinica_id}": (c) => (db.clinica = { ...db.clinica, ...(c.corpo as object) }),
};

function metodo(nome: string) {
  return (caminho: string, opcoes: { body?: unknown; params?: { path?: Record<string, string> } } = {}) => {
    const chamada = { metodo: nome, caminho, corpo: opcoes.body };
    chamadas.push(chamada);
    try {
      return Promise.resolve({ data: rotas[`${nome} ${caminho}`]({ ...chamada, params: opcoes.params }), response: { ok: true, status: 200 } });
    } catch (e) {
      return Promise.resolve({ error: e, response: { ok: false, status: 500 } });
    }
  };
}
const api = {
  cliente: { GET: metodo("GET"), POST: metodo("POST"), PATCH: metodo("PATCH") },
  dados: async (p: Promise<{ data?: unknown; error?: unknown; response: { ok: boolean } }>) => {
    const r = await p;
    if (!r.response.ok) throw r.error;
    return r.data;
  },
};
const sair = vi.fn();

vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({ api, sair }),
  useUsuario: () => ({ id: "u1", papel: "funcionario", nome_exibicao: "Gabriela Nunes", clinica_id: CLINICA, funcao }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(() => {
  chamadas = [];
  funcao = "atendimento";
  falharPedidos = false;
  db = dadosIniciais();
  history.replaceState(null, "", "/");
});

function abrir() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><PainelClinica /></MemoryRouter></QueryClientProvider>);
}
const q = <T extends Element = HTMLElement>(seletor: string) => {
  const el = document.querySelector<T>(seletor);
  if (!el) throw new Error(`não encontrado: ${seletor}`);
  return el;
};
const resumo = () => q(".d-profile:not(.d-is-full)");
const linhaDe = (nome: string) => screen.getByRole("button", { name: `Ver perfil de ${nome}` }).closest("tr")!;
const ultima = (metodo: string, caminho: string) => chamadas.filter((c) => c.metodo === metodo && c.caminho === caminho).at(-1);

test("Lista os pedidos da API com nome, e o painel acompanha a busca", async () => {
  abrir();
  expect(await screen.findByRole("button", { name: "Ver perfil de Ana Teste" })).toBeInTheDocument();
  expect(q("tbody").querySelectorAll("tr")).toHaveLength(3);
  expect(q(".d-clinic-name").textContent).toBe("Clínica-Escola Teste");
  fireEvent.change(screen.getByLabelText("Buscar paciente ou protocolo"), { target: { value: "Bruno" } });
  expect(q("tbody").querySelectorAll("tr")).toHaveLength(1);
  expect(within(resumo()).getByRole("heading", { level: 2 }).textContent).toBe("Bruno Teste");
  expect(linhaDe("Bruno Teste")).toHaveClass("d-selected");
});

test("Iniciar triagem marca em análise e o registro envia o novo estado com motivo", async () => {
  abrir();
  await screen.findByRole("button", { name: "Ver perfil de Ana Teste" });
  fireEvent.click(within(resumo()).getByRole("button", { name: /Iniciar triagem/ }));
  await waitFor(() => expect(ultima("PATCH", "/solicitacoes/{solicitacao_id}/estado")?.corpo).toEqual({ estado: "em_analise", motivo: null }));
  expect(await screen.findByRole("heading", { name: "Triagem de Ana Teste" })).toBeInTheDocument();
  fireEvent.change(q('[name="resultado"]'), { target: { value: "indisponivel" } });
  expect(q('[name="motivo"]')).toBeRequired();
  fireEvent.change(q('[name="motivo"]'), { target: { value: "Sem cadeira disponível neste mês." } });
  fireEvent.submit(q(".d-form-panel"));
  await waitFor(() => expect(ultima("PATCH", "/solicitacoes/{solicitacao_id}/estado")?.corpo).toEqual({ estado: "indisponivel", motivo: "Sem cadeira disponível neste mês." }));
  expect(await screen.findByRole("heading", { level: 1, name: "Solicitações" })).toBeInTheDocument();
  expect(screen.getByRole("status").textContent).toMatch(/Triagem registrada/);
});

test("Pedido agendado só pode ser concluído (agendamento vem da vaga)", async () => {
  abrir();
  fireEvent.click(await screen.findByRole("button", { name: "Ver perfil de Carla Teste" }));
  fireEvent.click(within(resumo()).getByRole("button", { name: /Registrar conclusão/ }));
  await waitFor(() => expect(ultima("PATCH", "/solicitacoes/{solicitacao_id}/estado")?.corpo).toEqual({ estado: "concluida", motivo: null }));
});

test("Publicar vaga envia especialidade e horários para a API", async () => {
  abrir();
  await screen.findByRole("button", { name: "Ver perfil de Ana Teste" });
  fireEvent.click(screen.getByRole("button", { name: "Publicar vaga" }));
  const janela = q("dialog");
  fireEvent.change(within(janela).getByLabelText("Serviço"), { target: { value: "endodontia" } });
  fireEvent.change(within(janela).getByLabelText("Início"), { target: { value: "2026-12-01T09:00" } });
  fireEvent.change(within(janela).getByLabelText("Fim"), { target: { value: "2026-12-01T10:00" } });
  fireEvent.submit(janela.querySelector("form")!);
  await waitFor(() => expect(ultima("POST", "/vagas")?.corpo).toEqual({
    especialidade: "endodontia", inicio: new Date("2026-12-01T09:00").toISOString(), fim: new Date("2026-12-01T10:00").toISOString(), profissional_id: null,
  }));
});

test("Configurações salvam na API e ficam só leitura para quem não pode editar", async () => {
  abrir();
  fireEvent.click(await screen.findByRole("link", { name: "Configurações" }));
  fireEvent.change(await screen.findByLabelText("Telefone"), { target: { value: "(11) 1000-9999" } });
  fireEvent.click(q('[name="recebendo_pedidos"]'));
  fireEvent.submit(q(".d-form-panel"));
  await waitFor(() => expect(ultima("PATCH", "/clinicas/{clinica_id}")?.corpo).toMatchObject({ telefone: "(11) 1000-9999", recebendo_pedidos: false }));
  expect(await screen.findByText("Novos pedidos pausados")).toBeInTheDocument();
});

test("Profissional vê as configurações sem poder alterar", async () => {
  funcao = "profissional";
  history.replaceState(null, "", `/#/clinicas/${CLINICA}/configuracoes`);
  abrir();
  expect(await screen.findByText("Somente leitura")).toBeInTheDocument();
  expect(q("fieldset")).toBeDisabled();
});

test("Rota da página abre diretamente e erro da API oferece tentar de novo", async () => {
  falharPedidos = true;
  history.replaceState(null, "", `/#/clinicas/${CLINICA}/servicos`);
  abrir();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Serviços e vagas");
  expect(await screen.findByText("Servidor indisponível (teste).")).toBeInTheDocument();
  falharPedidos = false;
  fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(await screen.findAllByRole("button", { name: /Gerenciar serviço/ })).toHaveLength(2);
});
