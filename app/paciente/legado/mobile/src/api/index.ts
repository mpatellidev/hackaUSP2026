// Adaptador de API do app. Módulos de outras frentes criam seu próprio arquivo aqui
// (ex.: api/urgencias.ts) usando `chamar` + um mock em modulos/<m>/mock/.
export { chamar, definirToken } from './cliente';
export { ErroApi, mensagemDeErro } from './erros';
export { ouvirOrigem, origemAtual, type OrigemDados } from './origem';
export { MODO_CONFIGURADO, API_URL } from './config';
export { apiAuth } from './auth';
export { apiClinicas } from './clinicas';
export { apiSolicitacoes } from './solicitacoes';
export * from './tipos';
