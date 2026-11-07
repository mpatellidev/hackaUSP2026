// API pública do módulo de chat. Quem hospeda o chat (o site) importa só daqui;
// o resto da pasta chat/ é interno e pode mudar à vontade.
//
// Uso:
//   import { ChatApp } from "./chat";
//   <ChatApp user={{ nome, foto_url }} getToken={() => token} onUnauthorized={sair} onLogout={sair} />
//
// O chat depende apenas do backend: GET/PUT /me/profile, POST /chat e os arquivos de áudio.
import "./styles/tokens.css";
import "./styles/chat.css";

export { ChatApp, type ChatAppProps } from "./ChatApp";
export type { ChatUser } from "./api/client";
export type { ChatConfig } from "./config";
/** logo provisória do app (o site pode reaproveitar, ex.: na tela de login) */
export { default as chatLogoUrl } from "./assets/logo.svg";
