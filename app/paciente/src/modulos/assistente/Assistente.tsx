import { useQueryClient } from "@tanstack/react-query";
import { useSessao, useUsuario } from "@uhealth/api-client";
import { TROCAR_PARA, salvarModo, useModoAtendimento } from "../../modoAtendimento";
import { ChatApp } from "./chat";

/** Assistente: tela única no modo assistente; aba "Ajuda" no painel. */
export function Assistente() {
  const { api, sair } = useSessao();
  const usuario = useUsuario();
  const qc = useQueryClient();
  const modo = useModoAtendimento();
  const destino = modo === "conversa" ? "telas" : "conversa";
  return (
    <ChatApp
      key={usuario.id}
      user={{ nome: usuario.nome_exibicao }}
      api={api}
      modo={modo ?? "telas"}
      trocarModo={{ rotulo: TROCAR_PARA[destino], acao: () => salvarModo(api, destino) }}
      onLogout={() => void sair()}
      // a conversa mudou algo no backend: as telas buscam de novo ao abrir
      aoMudarDados={() => void qc.invalidateQueries()}
    />
  );
}
