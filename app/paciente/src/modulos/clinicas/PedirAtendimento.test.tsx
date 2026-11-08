import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { PedirAtendimento } from "./PedirAtendimento";

const CLINICA = {
  id: "c1", nome: "Clínica-Escola A", cidade: "São Paulo", uf: "SP", publico: ["adultos"], especialidades: ["clinica_geral"],
  custo_informado: "gratuito", recebendo_pedidos: true, telefone: "(11) 0000-0001",
};
const post = vi.fn();

// Sem rede: a sessão devolve a clínica e registra qualquer envio.
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({
    api: {
      dados: (chamada: Promise<{ data: unknown }>) => chamada.then((r) => r.data),
      cliente: { GET: async () => ({ data: CLINICA }), POST: async (...args: unknown[]) => { post(...args); return { data: { id: "p1" } }; } },
    },
  }),
}));

it("conduz a conversa até a revisão e só libera o envio com o consentimento marcado", async () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/clinicas/c1"]}>
        <Routes><Route path="/clinicas/:id" element={<PedirAtendimento />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  await userEvent.click(await screen.findByRole("button", { name: "Para mim" }));
  // só há uma especialidade e um público: as perguntas são puladas e vai direto ao motivo
  await userEvent.type(screen.getByLabelText("Sua mensagem"), "consulta de rotina");
  await userEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));

  expect(await screen.findByRole("heading", { name: "Revise antes de enviar" })).toBeVisible();
  expect(screen.getByText("consulta de rotina")).toBeVisible();
  const enviar = screen.getByRole("button", { name: "Enviar pedido" });
  expect(enviar).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox"));
  expect(enviar).toBeEnabled();
  expect(post).not.toHaveBeenCalled(); // nada foi enviado ainda
});
