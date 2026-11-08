import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoasVindas, boasVindasConcluida } from "./BoasVindas";

describe("BoasVindas", () => {
  beforeEach(() => localStorage.clear());

  it("percorre os passos, guarda a escolha neste aparelho e conclui", async () => {
    const aoConcluir = vi.fn();
    render(<BoasVindas aoConcluir={aoConcluir} />);
    expect(boasVindasConcluida()).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Começar" }));
    await userEvent.click(screen.getByRole("radio", { name: "Para outra pessoa" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("radio", { name: "Grande" }));
    await userEvent.click(screen.getByRole("button", { name: "Pronto" }));

    expect(aoConcluir).toHaveBeenCalledOnce();
    expect(boasVindasConcluida()).toBe(true);
    expect(localStorage.getItem("uh-para-quem")).toBe("outra");
    expect(localStorage.getItem("uh-scale")).toBe("lg");
  });
});
