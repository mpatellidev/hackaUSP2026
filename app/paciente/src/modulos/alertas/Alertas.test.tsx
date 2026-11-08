import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { Alertas } from "./Alertas";

const ALERTA = {
  id: "al1", vaga_id: "v1", clinica_id: "c1", clinica_nome: "Clínica-Escola B", especialidade: "clinica_geral",
  inicio: "2026-11-10T14:00:00-03:00", evento_origem: "vaga_criada", lido: false, criado_em: "2026-11-07T10:00:00-03:00",
};
const post = vi.fn();
const put = vi.fn();

// Sem rede: um alerta não lido, preferência desligada e um pedido ativo na mesma clínica e especialidade.
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({
    api: {
      dados: (chamada: Promise<{ data: unknown }>) => chamada.then((r) => r.data),
      cliente: {
        GET: async (caminho: string) => {
          if (caminho === "/alertas") return { data: { itens: [ALERTA], total: 1, nao_lidos: 1, aviso: "Alerta não é reserva." } };
          if (caminho === "/alertas/preferencia") return { data: { receber: false, ligacao: false, aviso: "" } };
          return { data: { itens: [{ id: "p9", clinica_id: "c1", especialidade: "clinica_geral", estado: "em_analise" }], total: 1 } };
        },
        PUT: async (...args: unknown[]) => { put(...args); return { data: { receber: true, ligacao: false, aviso: "" } }; },
        POST: async (...args: unknown[]) => { post(...args); return { data: { ...ALERTA, lido: true } }; },
      },
    },
  }),
}));

it("mostra o alerta como não reserva, leva às vagas do pedido certo e salva a preferência", async () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Alertas /></MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("heading", { name: "Clínica B" })).toBeVisible();
  expect(screen.getByText("Ainda não é reserva. A clínica confirma.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Ver vaga" })).toHaveAttribute("href", "/pedidos/p9/vagas");

  await userEvent.click(screen.getByRole("checkbox", { name: "Avisar aqui no app quando abrir vaga" }));
  expect(put).toHaveBeenCalledWith("/alertas/preferencia", { body: { receber: true, ligacao: false } });

  await userEvent.click(screen.getByRole("button", { name: "Marcar como lido" }));
  expect(post).toHaveBeenCalledWith("/alertas/{alerta_id}/lido", { params: { path: { alerta_id: "al1" } } });
});
