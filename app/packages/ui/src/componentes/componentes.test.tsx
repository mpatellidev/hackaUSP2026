import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Abas, Aviso, Botao, FaixaDemo, Selo, TEXTO_EMERGENCIA } from "../index";

describe("componentes base", () => {
  it("botão usa as classes do design system e não envia formulário por engano", () => {
    render(<Botao variante="outline">Sair</Botao>);
    const b = screen.getByRole("button", { name: "Sair" });
    expect(b).toHaveClass("btn", "btn--outline");
    expect(b).toHaveAttribute("type", "button");
  });

  it("selo mostra texto (estado nunca só por cor) e aviso de erro é anunciado", () => {
    render(<><Selo tom="aviso">Indisponível</Selo><Aviso tom="perigo">Algo deu errado</Aviso></>);
    expect(screen.getByText("Indisponível")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Algo deu errado");
  });

  it("faixa de demonstração rotula os dados como fictícios", () => {
    render(<FaixaDemo />);
    expect(screen.getByRole("note")).toHaveTextContent(/fictícios/);
  });

  it("texto de emergência é estático e cita o SAMU 192", () => {
    expect(TEXTO_EMERGENCIA).toMatch(/192/);
    expect(TEXTO_EMERGENCIA).toMatch(/SAMU/);
  });

  it("abas marcam a página atual", () => {
    render(<MemoryRouter initialEntries={["/pedidos"]}><Abas itens={[{ caminho: "/", rotulo: "Início", fim: true }, { caminho: "/pedidos", rotulo: "Pedidos" }]} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Pedidos/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Início/ })).not.toHaveAttribute("aria-current");
  });
});
