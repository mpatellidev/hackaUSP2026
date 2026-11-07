import { chamar } from './cliente';
import { mock } from './mock/servidor';
import type { RespostaLogin } from './tipos';

export const apiAuth = {
  // Login DEMO, sem senha (contrato §3). Papel vem da resposta do servidor, nunca do app.
  login: (conta: string) =>
    chamar<RespostaLogin>('/auth/demo/login', { metodo: 'POST', corpo: { conta }, mock: () => mock.login(conta) }),
  logout: () => chamar<void>('/auth/logout', { metodo: 'POST', mock: () => undefined }),
};
