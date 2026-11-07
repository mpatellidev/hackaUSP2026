import { describe, expect, it } from "vitest";
import { MENU, ROTAS } from "./rotas";

describe("registro de rotas da clínica", () => {
  it("não repete caminho e todo item do menu tem rota", () => {
    const caminhos = ROTAS.map((r) => r.caminho);
    expect(new Set(caminhos).size).toBe(caminhos.length);
    for (const m of MENU) expect(caminhos).toContain(m.caminho);
  });
  it("cobre os módulos P0 da clínica", () => {
    for (const c of ["/pedidos", "/fila", "/vagas", "/agendamentos", "/urgencias", "/profissionais"]) expect(MENU.some((m) => m.caminho === c)).toBe(true);
  });
});
