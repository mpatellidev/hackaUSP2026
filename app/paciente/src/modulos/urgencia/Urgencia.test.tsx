import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProvedorUHealth } from "@uhealth/api-client";
import { afterEach, expect, it, vi } from "vitest";
import { Urgencia } from "./Urgencia";

afterEach(() => vi.unstubAllGlobals());

it("mostra a orientação de emergência (SAMU 192) mesmo sem rede", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  render(
    <ProvedorUHealth app="paciente" papelEsperado="paciente">
      <MemoryRouter><Urgencia /></MemoryRouter>
    </ProvedorUHealth>,
  );
  expect(screen.getByText(/Ligue 192 \(SAMU\)/)).toBeVisible();
  expect(screen.getByRole("link", { name: /Ligar 192 \(SAMU\)/ })).toHaveAttribute("href", "tel:192");
  expect(await screen.findByText(/Não foi possível conectar/)).toBeVisible();
});

it("sem pedido escolhido não envia relato que nenhuma clínica veria", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  render(
    <ProvedorUHealth app="paciente" papelEsperado="paciente">
      <MemoryRouter initialEntries={["/urgencia"]}><Urgencia /></MemoryRouter>
    </ProvedorUHealth>,
  );
  expect(screen.getByRole("link", { name: /Ligar 192 \(SAMU\)/ })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: /Dor forte/ }));
  expect(screen.getByRole("button", { name: /Enviar pedido urgente/ })).toBeDisabled();
});
