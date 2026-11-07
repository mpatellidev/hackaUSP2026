import type { components } from "./schema";

type S = components["schemas"];

export type Solicitacao = S["SolicitacaoOut"];
export type EstadoSolicitacao = Solicitacao["estado"];
export type Clinica = S["ClinicaOut"];
export type EventoSolicitacao = S["EventoOut"];
export type Vaga = S["VagaOut"];
export type Interesse = S["InteresseOut"];
export type Agendamento = S["AgendamentoOut"];
export type Profissional = S["ProfissionalOut"];
export type BlocoAgenda = S["BlocoOut"];
export type Resumo = S["ResumoOut"];
export type Alerta = S["AlertaOut"];
export type Perfil = S["PerfilOut"];
export type UsuarioSessao = S["UsuarioMe"];
export type PublicoAlvo = Solicitacao["publico_alvo"];
