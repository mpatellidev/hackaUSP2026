import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { AgendarClinica } from "./AgendarClinica";

const CLINICA = {
  id: "c1", nome: "Clínica Odontológica Vila Mariana", universidade: "Centro Universitário Vila Mariana", tipo_instituicao: "privada",
  cidade: "São Paulo", uf: "SP", endereco: "Rua X, 255", bairro: "Vila Mariana", publico: ["adultos"], especialidades: ["triagem", "clinica_integrada"],
  custo_informado: "a_confirmar", valor_consulta: 60, recebendo_pedidos: true, telefone: "(11) 1011-2202", latitude: -23.58, longitude: -46.63,
  acessibilidade_info: "Rampa na entrada.", como_chegar: "Metrô Vila Mariana.", horarios_funcionamento: { seg: ["08:00", "21:00"], dom: null },
  atende_urgencia: true, horario_urgencia: {},
};
// horário livre amanhã às 9h30 (aparece no calendário das próximas semanas)
const amanha = new Date(Date.now() + 864e5);
const INICIO = `${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(amanha)}T09:30:00-03:00`;
const escritas: unknown[][] = [];

vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useUsuario: () => ({ id: "u1", papel: "paciente", nome_exibicao: "Ana Martins" }),
  useSessao: () => ({
    api: {
      dados: (p: Promise<{ data: unknown }>) => p.then((r) => r.data),
      cliente: {
        GET: async (caminho: string) => caminho.endsWith("/horarios")
          ? { data: { clinica_id: "c1", total: 1, aviso: "", itens: [{ vaga_id: "v1", especialidade: "clinica_integrada", inicio: INICIO, fim: INICIO }] } }
          : { data: CLINICA },
        POST: async (...args: unknown[]) => { escritas.push(args); return { data: { id: "p1234567890" } }; },
      },
    },
  }),
}));

it("clínica → especialidade → dia e horário → dados → revisão → comprovante; nada é enviado antes de confirmar", async () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/clinicas/c1"]}><Routes><Route path="/clinicas/:id" element={<AgendarClinica />} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("heading", { name: CLINICA.nome })).toBeVisible();
  expect(screen.getByText("R$ 60,00")).toBeVisible();
  expect(screen.getByRole("link", { name: /Como chegar/ })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Agendar nesta clínica" }));

  await userEvent.click(screen.getByRole("radio", { name: /Clínica integrada/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

  const diaLivre = await screen.findByRole("gridcell", { name: /1 horário livre/ });
  await userEvent.click(diaLivre);
  await userEvent.click(screen.getByRole("radio", { name: "09:30" }));
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
  expect(await screen.findByText("Digite o telefone com DDD.")).toBeVisible();
  await userEvent.type(screen.getByLabelText("Telefone para contato (com DDD)"), "11912345678");
  await userEvent.type(screen.getByLabelText(/do que você precisa/), "dor ao mastigar");
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

  expect(await screen.findByRole("heading", { name: "Revise antes de confirmar" })).toBeVisible();
  const confirmar = screen.getByRole("button", { name: "Confirmar agendamento" });
  expect(confirmar).toBeDisabled();
  expect(escritas).toHaveLength(0);
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(confirmar);

  expect(await screen.findByText(/protocolo P1234567/)).toBeVisible();
  expect(screen.getByText("Aguardando confirmação da clínica")).toBeVisible();
  expect(escritas.map((e) => e[0])).toEqual(["/solicitacoes", "/vagas/{vaga_id}/interesses"]);
});

it("dia sem horário livre também é clicável: avisa e deixa pedir para a clínica ligar", async () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/clinicas/c1"]}><Routes><Route path="/clinicas/:id" element={<AgendarClinica />} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole("button", { name: "Agendar nesta clínica" }));
  await userEvent.click(screen.getByRole("radio", { name: /Clínica integrada/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

  await screen.findByRole("gridcell", { name: /1 horário livre/ });
  const semHorario = screen.getAllByRole("gridcell", { name: /sem horário/ })[0];
  expect(semHorario).toBeEnabled();
  await userEvent.click(semHorario);
  expect(screen.getByText(/Nenhum horário livre em/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  await userEvent.click(screen.getByRole("radio", { name: /a clínica me liga/ }));
  expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
});
