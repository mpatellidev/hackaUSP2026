import { describe, expect, it } from "vitest";
import { ABAS, ROTAS } from "./rotas";

describe("registro de rotas do paciente", () => {
  it("não repete caminho", () => {
    const caminhos = ROTAS.map((r) => r.caminho);
    expect(new Set(caminhos).size).toBe(caminhos.length);
  });
  it("tem de 3 a 5 abas (celular) e todas apontam para rotas existentes", () => {
    expect(ABAS.length).toBeGreaterThanOrEqual(3);
    expect(ABAS.length).toBeLessThanOrEqual(5);
    for (const a of ABAS) expect(ROTAS.some((r) => r.caminho === a.caminho)).toBe(true);
  });
  it("urgência está sempre acessível por rota própria", () => {
    expect(ROTAS.some((r) => r.caminho === "/urgencia")).toBe(true);
  });
});
