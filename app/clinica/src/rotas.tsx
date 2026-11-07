// REGISTRO ÚNICO dos módulos do app das clínicas: uma linha por módulo, em ordem alfabética.
import type { RotaModulo } from "./modulos/tipos";
import { rotas as agendamentos } from "./modulos/agendamentos/rotas";
import { rotas as fila } from "./modulos/fila/rotas";
import { rotas as pedidos } from "./modulos/pedidos/rotas";
import { rotas as profissionais } from "./modulos/profissionais/rotas";
import { rotas as urgencias } from "./modulos/urgencias/rotas";
import { rotas as vagas } from "./modulos/vagas/rotas";

export const ROTAS: RotaModulo[] = [...agendamentos, ...fila, ...pedidos, ...profissionais, ...urgencias, ...vagas];

const ORDEM_MENU = ["/pedidos", "/fila", "/vagas", "/agendamentos", "/urgencias", "/profissionais"];
export const MENU = ORDEM_MENU.map((c) => ROTAS.find((r) => r.aba?.caminho === c)?.aba).filter((a) => a !== undefined);
