import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Agendamentos } from "./Agendamentos";

/* API simulada: só o que a tela usa. Dados fictícios. */
const CLINICA = "c1000000-0000-4000-8000-000000000001";
const agendamento = (id: string, inicio: string) => ({
  id, solicitacao_id: `s-${id}`, clinica_id: CLINICA, estado: "agendado", desfecho: "pendente", paciente_nome_exibicao: `Paciente ${id}`,
  vaga: { id: `v-${id}`, clinica_id: CLINICA, especialidade: "triagem", inicio, fim: inicio, estado: "preenchida", profissional_id: null, criado_em: inicio },
});
let funcao: string;
let chamadas: { metodo: string; caminho: string; corpo?: unknown }[];
const api = {
  cliente: {
    GET: (caminho: string) => Promise.resolve({ data: caminho === "/agendamentos" ? { itens: [
      agendamento("passado", new Date(Date.now() - 3 * 36e5).toISOString()),
      agendamento("futuro", new Date(Date.now() + 48 * 36e5).toISOString()),
    ], total: 2 } : null, response: { ok: true } }),
    POST: (caminho: string, o: { body?: unknown } = {}) => { chamadas.push({ metodo: "POST", caminho, corpo: o.body }); return Promise.resolve({ data: {}, response: { ok: true } }); },
    PATCH: (caminho: string, o: { body?: unknown } = {}) => { chamadas.push({ metodo: "PATCH", caminho, corpo: o.body }); return Promise.resolve({ data: {}, response: { ok: true } }); },
  },
  dados: async (p: Promise<{ data?: unknown }>) => (await p).data,
};
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({ api }),
  useUsuario: () => ({ id: "u1", papel: "funcionario", nome_exibicao: "Hugo", clinica_id: CLINICA, funcao }),
}));

beforeEach(() => { chamadas = []; funcao = "profissional"; });
const abrir = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Agendamentos /></QueryClientProvider>);

test("Profissional registra falta só depois do horário, com justificativa (entra no comparecimento do score)", async () => {
  abrir();
  const botoes = await screen.findAllByRole("button", { name: "Registrar falta" });
  expect(botoes).toHaveLength(1); // o agendamento futuro não oferece falta
  fireEvent.click(botoes[0]);
  fireEvent.change(screen.getByLabelText(/Justificativa da falta/), { target: { value: "Não veio e não avisou (fictício)." } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar falta" }));
  await waitFor(() => expect(chamadas.at(-1)).toEqual({ metodo: "POST", caminho: "/faltas", corpo: { agendamento_id: "passado", justificativa: "Não veio e não avisou (fictício)." } }));
});

test("Recepção não registra falta", async () => {
  funcao = "atendimento";
  abrir();
  expect(await screen.findAllByRole("button", { name: "Concluir" })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Registrar falta" })).not.toBeInTheDocument();
});
