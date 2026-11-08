import { useState } from "react";
import { useSessao, useUsuario } from "@uhealth/api-client";
import { Btn } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { NOME_MODO, salvarModo, type ModoAtendimento } from "../../modoAtendimento";

const DESCRICAO: Record<ModoAtendimento, string> = {
  conversa: "A assistente conversa com você e faz tudo junto: encontra a clínica, marca, remarca e acompanha.",
  telas: "Você vê as clínicas, escolhe o horário e preenche os dados sozinho.",
};

/** Logo depois de entrar: só duas opções grandes. A assistente é a recomendada. Dá para trocar depois. */
export function EscolhaAtendimento() {
  const usuario = useUsuario();
  const { api } = useSessao();
  const [modo, setModo] = useState<ModoAtendimento>("conversa");
  const primeiroNome = usuario.nome_exibicao.split(" ")[0];

  return (
    <div className="d-casca">
      <div className="d-tela">
        <main className="d-corpo d-corpo--24" style={{ gap: 16 }}>
          <p className="d-small">Olá, {primeiroNome}!</p>
          <h1 className="d-h1" style={{ lineHeight: 1.2 }}>Como você quer seguir?</h1>
          <fieldset className="d-campos">
            <legend className="sr-only">Modo de uso</legend>
            {(["conversa", "telas"] as ModoAtendimento[]).map((m) => (
              <label key={m} className={`d-op d-escolha${modo === m ? " d-op--on" : ""}${m === "conversa" ? " d-escolha--rec" : ""}`}>
                {m === "conversa" && <span className="d-selo">Recomendado</span>}
                <span className="d-escolha-linha">
                  <input type="radio" name="modo" value={m} checked={modo === m} onChange={() => setModo(m)} />
                  <Icone nome={m === "conversa" ? "conversa" : "buscar"} tamanho={32} />
                  {NOME_MODO[m]}
                </span>
                <span className="d-small" style={{ fontWeight: 400 }}>{DESCRICAO[m]}</span>
              </label>
            ))}
          </fieldset>
          <p className="d-p">Você pode trocar quando quiser pelo botão na página inicial ou no seu perfil.</p>
          <div className="d-fim">
            <Btn onClick={() => salvarModo(api, modo)}>Continuar</Btn>
          </div>
        </main>
      </div>
    </div>
  );
}
