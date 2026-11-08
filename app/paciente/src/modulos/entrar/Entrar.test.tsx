import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { Entrar } from "./Entrar";

const entrarComEmail = vi.fn(async () => undefined);
const cadastrar = vi.fn(async () => undefined);
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({ entrarComEmail, cadastrar }),
}));

beforeEach(() => { entrarComEmail.mockClear(); cadastrar.mockClear(); });

it("entra com CPF (com máscara) ou e-mail e senha", async () => {
  render(<Entrar />);
  await userEvent.type(screen.getByLabelText("CPF ou e-mail"), "00000000191");
  expect(screen.getByLabelText("CPF ou e-mail")).toHaveValue("000.000.001-91");
  await userEvent.clear(screen.getByLabelText("CPF ou e-mail"));
  await userEvent.type(screen.getByLabelText("CPF ou e-mail"), "ana.martins@example.com");
  await userEvent.type(screen.getByLabelText("Senha"), "minha-senha");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(entrarComEmail).toHaveBeenCalledWith("ana.martins@example.com", "minha-senha");
});

it("valida o cadastro antes de enviar (senha curta e senhas diferentes)", async () => {
  render(<Entrar />);
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  await userEvent.type(screen.getByLabelText("Nome completo"), "Marina Rocha");
  await userEvent.type(screen.getByLabelText("CPF"), "52998224726");
  await userEvent.type(screen.getByLabelText("E-mail"), "marina@example.com");
  await userEvent.type(screen.getByLabelText("Senha"), "123");
  await userEvent.type(screen.getByLabelText("Repita a senha"), "123");
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  expect(await screen.findByText("CPF inválido. Confira os 11 números.")).toBeVisible();
  await userEvent.clear(screen.getByLabelText("CPF"));
  await userEvent.type(screen.getByLabelText("CPF"), "52998224725");
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  expect(await screen.findByText("A senha precisa ter pelo menos 8 caracteres.")).toBeVisible();
  expect(cadastrar).not.toHaveBeenCalled();

  await userEvent.clear(screen.getByLabelText("Senha"));
  await userEvent.type(screen.getByLabelText("Senha"), "senha-forte-1");
  await userEvent.clear(screen.getByLabelText("Repita a senha"));
  await userEvent.type(screen.getByLabelText("Repita a senha"), "senha-forte-1");
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
  expect(cadastrar).toHaveBeenCalledWith("Marina Rocha", "529.982.247-25", "marina@example.com", "senha-forte-1");
});
