import { chamar } from './cliente';
import { mock } from './mock/servidor';
import type { Clinica, Lista } from './tipos';

export const apiClinicas = {
  listar: (filtro: { cidade?: string; especialidade?: string } = {}) => {
    const q = new URLSearchParams();
    if (filtro.cidade) q.set('cidade', filtro.cidade);
    if (filtro.especialidade) q.set('especialidade', filtro.especialidade);
    const qs = q.toString();
    return chamar<Lista<Clinica>>(`/clinicas${qs ? `?${qs}` : ''}`, { mock: () => mock.clinicas(filtro) });
  },
  obter: (id: string) => chamar<Clinica>(`/clinicas/${id}`, { mock: () => mock.clinica(id) }),
};
