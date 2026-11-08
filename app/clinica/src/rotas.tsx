// REGISTRO ÚNICO dos módulos do app das clínicas: uma linha por módulo, em ordem alfabética.
import type { RotaModulo } from "./modulos/tipos";
import { rotas as admin } from "./modulos/admin/rotas";
import { rotas as agendamentos } from "./modulos/agendamentos/rotas";
import { rotas as fila } from "./modulos/fila/rotas";
import { rotas as pedidos } from "./modulos/pedidos/rotas";
import { rotas as profissionais } from "./modulos/profissionais/rotas";
import { rotas as urgencias } from "./modulos/urgencias/rotas";
import { rotas as vagas } from "./modulos/vagas/rotas";

export const ROTAS: RotaModulo[] = [...admin, ...agendamentos, ...fila, ...pedidos, ...profissionais, ...urgencias, ...vagas];

/** Tela que abre logo depois do login. */
export const INICIO = "/admin";

const ORDEM_MENU = ["/admin", "/pedidos", "/fila", "/vagas", "/agendamentos", "/urgencias", "/profissionais"];
export const MENU = ORDEM_MENU.map((c) => ROTAS.find((r) => r.aba?.caminho === c)?.aba).filter((a) => a !== undefined);
