import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { lerModo } from "../../modoAtendimento";
import { EscolhaAtendimento } from "./EscolhaAtendimento";

const put = vi.fn(async () => ({ data: {} }));
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useUsuario: () => ({ id: "u1", papel: "paciente", nome_exibicao: "Ana Martins" }),
  useSessao: () => ({ api: { dados: (p: Promise<{ data: unknown }>) => p.then((r) => r.data), cliente: { PUT: put } } }),
}));

beforeEach(() => { localStorage.clear(); put.mockClear(); });

it("mostra só duas opções, a assistente vem recomendada e a escolha fica salva no perfil", async () => {
  render(<EscolhaAtendimento />);
  expect(lerModo()).toBeNull();
  expect(screen.getByText("Olá, Ana!")).toBeVisible();
  expect(screen.getAllByRole("radio")).toHaveLength(2);
  expect(screen.getByText("Recomendado")).toBeVisible();
  expect(screen.getByRole("radio", { name: /Quero ajuda da assistente/ })).toBeChecked();
  await userEvent.click(screen.getByRole("radio", { name: /Prefiro fazer sozinho/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
  expect(lerModo()).toBe("telas");
  expect(put).toHaveBeenCalledWith("/perfil/modo", { body: { modo: "telas" } });
});
