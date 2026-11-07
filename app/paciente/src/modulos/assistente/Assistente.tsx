import { useSessao, useUsuario } from "@uhealth/api-client";
import { ChatApp } from "./chat";

export function Assistente() {
  const { api } = useSessao();
  const usuario = useUsuario();
  return <ChatApp key={usuario.id} user={{ nome: usuario.nome_exibicao }} api={api} />;
}
