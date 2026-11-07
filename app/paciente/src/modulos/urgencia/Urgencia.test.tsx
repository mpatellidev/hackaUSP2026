import { render, screen } from "@testing-library/react";
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
  expect(screen.getByRole("link", { name: /Ligar para o SAMU 192/ })).toHaveAttribute("href", "tel:192");
  expect(await screen.findByText(/Não foi possível conectar/)).toBeVisible();
});
