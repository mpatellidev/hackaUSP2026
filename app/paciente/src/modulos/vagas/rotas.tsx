import type { RotaModulo } from "../tipos";
import { VagasDoPedido } from "./VagasDoPedido";

export const rotas: RotaModulo[] = [{ caminho: "/pedidos/:id/vagas", elemento: <VagasDoPedido /> }];
