import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { Avaliar } from "./Avaliar";

let estado = "concluida";
const post = vi.fn();

// Sem rede: o pedido, a lista de clínicas e as minhas avaliações vêm daqui.
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({
    api: {
      dados: (chamada: Promise<{ data: unknown }>) => chamada.then((r) => r.data),
      cliente: {
        GET: async (caminho: string) => {
          if (caminho === "/avaliacoes") return { data: { itens: [], total: 0 } };
          if (caminho === "/clinicas") return { data: { itens: [{ id: "c1", nome: "Clínica-Escola A" }], total: 1 } };
          return { data: { id: "p1", clinica_id: "c1", estado } };
        },
        POST: async (...args: unknown[]) => { post(...args); return { data: { id: "a1" } }; },
      },
    },
  }),
}));

function abrir() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/pedidos/p1/avaliar"]}>
        <Routes><Route path="/pedidos/:id/avaliar" element={<Avaliar />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => { estado = "concluida"; post.mockClear(); });

it("só libera o envio depois de escolher a nota e envia para POST /avaliacoes", async () => {
  abrir();
  const enviar = await screen.findByRole("button", { name: "Enviar avaliação" });
  expect(enviar).toBeDisabled();
  await userEvent.click(screen.getByRole("radio", { name: "4 · Bom" }));
  expect(enviar).toBeEnabled();
  await userEvent.click(enviar);
  expect(await screen.findByText("Obrigado pela avaliação.")).toBeVisible();
  expect(post).toHaveBeenCalledWith("/avaliacoes", { body: { solicitacao_id: "p1", nota: 4, comentario: null } });
});

it("não mostra o formulário antes do atendimento ser concluído", async () => {
  estado = "em_analise";
  abrir();
  expect(await screen.findByText("Você poderá avaliar depois que o atendimento for concluído.")).toBeVisible();
  expect(screen.queryByRole("radio")).toBeNull();
});
