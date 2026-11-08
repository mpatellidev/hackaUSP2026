import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ProvedorUHealth } from "@uhealth/api-client";
import { afterEach, expect, it, vi } from "vitest";
import { Urgencia } from "./Urgencia";

afterEach(() => vi.unstubAllGlobals());

it("mostra os sinais graves e o SAMU 192 mesmo sem rede", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  render(
    <ProvedorUHealth app="paciente" papelEsperado="paciente">
      <MemoryRouter><Urgencia /></MemoryRouter>
    </ProvedorUHealth>,
  );
  expect(screen.getByText(/Vá a um pronto-socorro ou ligue 192/)).toBeVisible();
  expect(screen.getByRole("link", { name: /Ligar 192 \(SAMU\)/ })).toHaveAttribute("href", "tel:192");
  expect(await screen.findByText(/Não foi possível conectar/)).toBeVisible();
});

const CLINICA = { id: "c1", nome: "Clínica-Escola de Odontologia Bela Vista", cidade: "São Paulo", uf: "SP", endereco: "Rua X, 1", bairro: "Bela Vista",
  telefone: "(11) 1011-2201", latitude: -23.56, longitude: -46.65, publico: [], especialidades: [], custo_informado: "gratuito", recebendo_pedidos: true };

vi.mock("@uhealth/api-client", async (original) => {
  const real = await original<typeof import("@uhealth/api-client")>();
  return { ...real, useSessao: () => (globalThis as { __sessao?: unknown }).__sessao ?? real.useSessao() };
});

it("mostra a clínica aberta mais perto com Ligar e Como chegar, sem criar agendamento", async () => {
  (globalThis as { __sessao?: unknown }).__sessao = {
    api: {
      dados: (p: Promise<{ data: unknown }>) => p.then((r) => r.data),
      cliente: { GET: async () => ({ data: { principal: { clinica: CLINICA, distancia_km: 1.2, aberta_ate: "24 horas" }, alternativas: [],
        usou_localizacao: true, sinais_graves: ["Febre alta"], orientacao_grave: "", samu: "192", aviso: "Isto não marca consulta." } }) },
    },
  };
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Urgencia /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByRole("heading", { name: CLINICA.nome })).toBeVisible();
  expect(screen.getByRole("link", { name: /^Ligar$/ })).toHaveAttribute("href", "tel:(11)10112201".replace(/[()]/g, ""));
  expect(screen.getByRole("link", { name: /Como chegar/ }).getAttribute("href")).toContain("destination=-23.56,-46.65");
  expect(screen.getByText(/aberta 24 horas/)).toBeVisible();
  delete (globalThis as { __sessao?: unknown }).__sessao;
});
