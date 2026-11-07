/** Erro padrão da API (contrato §2): `{"erro": {"codigo", "mensagem", "detalhes"?}}`. A mensagem é pt-BR e já serve para a pessoa. */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly detalhes?: Record<string, unknown>,
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

export function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Algo deu errado. Tente de novo.";
}

export async function erroDaResposta(resposta: Response, corpo?: unknown): Promise<ErroApi> {
  let dados = corpo as { erro?: { codigo?: string; mensagem?: string; detalhes?: Record<string, unknown> } } | undefined;
  if (dados === undefined) {
    try { dados = await resposta.clone().json(); } catch { dados = undefined; }
  }
  const e = dados?.erro;
  return new ErroApi(resposta.status, e?.codigo ?? "erro", e?.mensagem ?? "Não foi possível concluir. Tente de novo.", e?.detalhes);
}
