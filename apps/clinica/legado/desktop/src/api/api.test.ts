import { afterEach, describe, expect, it, vi } from "vitest";
import { entrar } from "./auth";
import { aoNaoAutenticado, ApiErro, http } from "./cliente";
import { usuarioDe } from "./mock/dados";
import { criarMockSolicitacoes } from "./mock/solicitacoes";

const A = usuarioDe("funcionario.atendimento.a")!;
const B = usuarioDe("funcionario.atendimento.b")!;
const ENVIADA_A = "b1000000-0000-4000-8000-000000000003"; // Bruno, clínica A, enviada
const PEDIDO_B = "b1000000-0000-4000-8000-000000000002";  // Ana, clínica B

const mockDe = (u: typeof A | null) => criarMockSolicitacoes(() => u, 0);

describe("mock de solicitações", () => {
  it("lista só os pedidos da própria clínica", async () => {
    const itens = await mockDe(A).listar();
    expect(itens.length).toBeGreaterThan(0);
    expect(itens.every((s) => s.clinica_id === A.clinica_id)).toBe(true);
    expect(itens.some((s) => s.id === PEDIDO_B)).toBe(false);
  });

  it("pedido de outra clínica é 404, nunca dados", async () => {
    await expect(mockDe(A).obter(PEDIDO_B)).rejects.toMatchObject({ status: 404, codigo: "nao_encontrado" });
    await expect(mockDe(A).eventos(PEDIDO_B)).rejects.toMatchObject({ status: 404 });
    await expect(mockDe(A).transicionar(PEDIDO_B, "em_analise")).rejects.toMatchObject({ status: 404 });
  });

  it("sem sessão: 401; paciente: 403", async () => {
    await expect(mockDe(null).listar()).rejects.toMatchObject({ status: 401 });
    await expect(mockDe(usuarioDe("paciente.ana")).listar()).rejects.toMatchObject({ status: 403 });
  });

  it("transição válida muda o estado e grava evento com autor e motivo", async () => {
    const api = mockDe(A);
    const s = await api.transicionar(ENVIADA_A, "em_analise");
    expect(s.estado).toBe("em_analise");
    const ev = (await api.eventos(ENVIADA_A)).at(-1)!;
    expect(ev).toMatchObject({ tipo: "transicao", estado_anterior: "enviada", estado_novo: "em_analise", autor_usuario_id: A.id });
    const fim = await api.transicionar(ENVIADA_A, "indisponivel", "Sem agenda neste período.");
    expect(fim.estado).toBe("indisponivel");
    expect((await api.eventos(ENVIADA_A)).at(-1)!.motivo).toBe("Sem agenda neste período.");
  });

  it("motivo é obrigatório para indisponível e precisa de contato", async () => {
    await expect(mockDe(A).transicionar(ENVIADA_A, "indisponivel")).rejects.toMatchObject({ status: 422, codigo: "validacao" });
    await expect(mockDe(A).transicionar(ENVIADA_A, "indisponivel", "   ")).rejects.toMatchObject({ status: 422 });
  });

  it("transição inválida é 409 e não altera nada", async () => {
    const api = mockDe(A);
    await expect(api.transicionar(ENVIADA_A, "agendada" as any)).rejects.toMatchObject({ status: 409, codigo: "transicao_invalida" });
    expect((await api.obter(ENVIADA_A)).estado).toBe("enviada");
    // estado terminal não sai de indisponível
    const indisponivel = (await api.listar("indisponivel"))[0];
    await expect(api.transicionar(indisponivel.id, "em_analise")).rejects.toMatchObject({ status: 409 });
  });

  it("isolamento vale também para a clínica B", async () => {
    const itens = await mockDe(B).listar();
    expect(itens.every((s) => s.clinica_id === B.clinica_id)).toBe(true);
    await expect(mockDe(B).obter(ENVIADA_A)).rejects.toMatchObject({ status: 404 });
  });
});

describe("login", () => {
  it("recusa conta de paciente neste painel", async () => {
    await expect(entrar("paciente.ana")).rejects.toMatchObject({ status: 403, codigo: "acesso_negado" });
  });
  it("recusa conta inexistente", async () => {
    await expect(entrar("ninguem")).rejects.toMatchObject({ status: 401 });
  });
  it("aceita funcionário e traz clínica e função", async () => {
    expect(await entrar("funcionario.profissional.b")).toMatchObject({ papel: "funcionario", funcao: "profissional", clinica_id: B.clinica_id });
  });
});

describe("cliente HTTP", () => {
  afterEach(() => vi.unstubAllGlobals());
  const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });

  it("erro do servidor vira ApiErro com a mensagem pt-BR, nunca sucesso", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(409, { erro: { codigo: "transicao_invalida", mensagem: "Não permitido." } })));
    await expect(http("POST", "/x")).rejects.toMatchObject({ status: 409, codigo: "transicao_invalida", message: "Não permitido." });
  });

  it("401 avisa a sessão para voltar ao login", async () => {
    const aviso = vi.fn();
    aoNaoAutenticado(aviso);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401, { erro: { codigo: "nao_autenticado", mensagem: "Entre de novo." } })));
    await expect(http("GET", "/x")).rejects.toBeInstanceOf(ApiErro);
    expect(aviso).toHaveBeenCalledOnce();
  });

  it("falha de rede vira mensagem clara", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    await expect(http("GET", "/x")).rejects.toMatchObject({ codigo: "sem_conexao" });
  });
});
