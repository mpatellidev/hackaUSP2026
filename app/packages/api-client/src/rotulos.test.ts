import { describe, expect, it } from "vitest";
import { ESTADO_PEDIDO, data, dataHora, rotuloEspecialidade } from "./rotulos";

describe("rótulos", () => {
  it("todo estado de pedido tem rótulo e explicação em pt-BR", () => {
    for (const estado of ["enviada", "em_analise", "precisa_contato", "indisponivel", "aguardando_confirmacao", "agendada", "concluida"] as const) {
      expect(ESTADO_PEDIDO[estado].rotulo.length).toBeGreaterThan(2);
      expect(ESTADO_PEDIDO[estado].explica.endsWith(".")).toBe(true);
    }
  });
  it("especialidade desconhecida ainda vira texto legível", () => {
    expect(rotuloEspecialidade("clinica_geral")).toBe("Clínica geral");
    expect(rotuloEspecialidade("medicina_do_esporte")).toBe("medicina do esporte");
  });
  it("datas saem no fuso de São Paulo", () => {
    expect(data("2026-11-12T14:00:00-03:00")).toBe("12/11/2026");
    expect(dataHora("2026-11-12T17:00:00+00:00")).toContain("14:00");
  });
});
