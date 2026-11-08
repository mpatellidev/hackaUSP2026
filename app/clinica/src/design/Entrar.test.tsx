import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErroApi } from "@uhealth/api-client";
import { Entrar } from "./Entrar";

const entrarComEmail = vi.fn(async (_login: string, _senha: string) => undefined);
vi.mock("@uhealth/api-client", async (original) => ({
  ...(await original<typeof import("@uhealth/api-client")>()),
  useSessao: () => ({ entrarComEmail }),
}));

beforeEach(() => { entrarComEmail.mockReset(); entrarComEmail.mockResolvedValue(undefined); });

test("entra com e-mail e senha; CPF ganha máscara", async () => {
  render(<Entrar />);
  await userEvent.type(screen.getByLabelText("CPF ou e-mail"), "00000000191");
  expect(screen.getByLabelText("CPF ou e-mail")).toHaveValue("000.000.001-91");
  await userEvent.clear(screen.getByLabelText("CPF ou e-mail"));
  await userEvent.type(screen.getByLabelText("CPF ou e-mail"), "gabriela.nunes@example.com");
  await userEvent.type(screen.getByLabelText("Senha"), "demo1234");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(entrarComEmail).toHaveBeenCalledWith("gabriela.nunes@example.com", "demo1234");
  expect(screen.queryByRole("button", { name: "Criar conta" })).toBeNull();
});

test("login inválido mostra o erro e não envia", async () => {
  render(<Entrar />);
  await userEvent.type(screen.getByLabelText("CPF ou e-mail"), "gabriela");
  await userEvent.type(screen.getByLabelText("Senha"), "demo1234");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByText("Digite seu CPF (11 números) ou seu e-mail.")).toBeVisible();
  expect(entrarComEmail).not.toHaveBeenCalled();
});

test("erro da API (conta de paciente) aparece na tela", async () => {
  entrarComEmail.mockRejectedValue(new ErroApi(403, "papel_errado", "Esta conta é de paciente. Use o app do paciente."));
  render(<Entrar />);
  await userEvent.type(screen.getByLabelText("CPF ou e-mail"), "ana.martins@example.com");
  await userEvent.type(screen.getByLabelText("Senha"), "demo1234");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Esta conta é de paciente. Use o app do paciente.");
});
