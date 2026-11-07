import { afterEach, describe, expect, it, vi } from "vitest";
import { criarApi } from "./cliente";
import { ErroApi } from "./erro";

function responder(status: number, corpo: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } }));
}

afterEach(() => vi.unstubAllGlobals());

describe("criarApi", () => {
  it("envia o token como Bearer e devolve os dados tipados", async () => {
    const fetchMock = responder(200, { itens: [], total: 0 });
    vi.stubGlobal("fetch", fetchMock);
    const api = criarApi({ baseUrl: "http://localhost/api/v1", obterToken: () => "abc" });
    const r = await api.dados(api.cliente.GET("/solicitacoes", {}));
    expect(r.total).toBe(0);
    const requisicao = fetchMock.mock.calls[0][0] as Request;
    expect(requisicao.headers.get("Authorization")).toBe("Bearer abc");
    expect(new URL(requisicao.url).pathname).toBe("/api/v1/solicitacoes");
  });

  it("transforma o erro padrão da API em ErroApi com a mensagem pronta para a pessoa", async () => {
    vi.stubGlobal("fetch", responder(409, { erro: { codigo: "vaga_ja_preenchida", mensagem: "Esta vaga já foi preenchida.", detalhes: { vaga_id: "v1" } } }));
    const api = criarApi({ baseUrl: "http://localhost/api/v1", obterToken: () => null });
    const erro = await api.dados(api.cliente.GET("/vagas", {})).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 409, codigo: "vaga_ja_preenchida", message: "Esta vaga já foi preenchida." });
  });

  it("avisa quando a sessão não vale mais (401)", async () => {
    vi.stubGlobal("fetch", responder(401, { erro: { codigo: "nao_autenticado", mensagem: "Você precisa entrar para continuar." } }));
    const aoNaoAutenticado = vi.fn();
    const api = criarApi({ baseUrl: "http://localhost/api/v1", obterToken: () => "vencido", aoNaoAutenticado });
    await expect(api.dados(api.cliente.GET("/auth/me", {}))).rejects.toMatchObject({ codigo: "nao_autenticado" });
    expect(aoNaoAutenticado).toHaveBeenCalledOnce();
  });

  it("sem conexão vira ErroApi legível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const api = criarApi({ baseUrl: "http://localhost/api/v1", obterToken: () => null });
    await expect(api.dados(api.cliente.GET("/clinicas", {}))).rejects.toMatchObject({ status: 0, codigo: "sem_conexao" });
  });
});
