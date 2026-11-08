import { useNavigate } from "react-router-dom";
import type { RotaModulo } from "../tipos";
import { CompletarCadastro } from "./CompletarCadastro";

function EditarEndereco() {
  const navegar = useNavigate();
  return <CompletarCadastro voltar="/perfil" aoTerminar={() => navegar("/perfil")} />;
}

export const rotas: RotaModulo[] = [{ caminho: "/perfil/endereco", elemento: <EditarEndereco /> }];
