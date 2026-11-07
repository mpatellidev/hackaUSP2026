// Erro no formato único do contrato §2: {"erro": {"codigo", "mensagem", "detalhes"?}}.

export class ErroApi extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
    public detalhes?: Record<string, unknown>,
  ) {
    super(mensagem);
  }
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroApi) return e.message;
  return 'Não foi possível carregar agora. Verifique sua internet e tente de novo.';
}
