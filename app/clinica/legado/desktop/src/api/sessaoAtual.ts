import type { Usuario } from "./tipos";

// Usuário da sessão atual; o mock usa isto para escopar por clínica (na API quem escopa é o servidor).
let atual: Usuario | null = null;
export const sessaoAtual = () => atual;
export const definirSessaoAtual = (u: Usuario | null) => { atual = u; };
