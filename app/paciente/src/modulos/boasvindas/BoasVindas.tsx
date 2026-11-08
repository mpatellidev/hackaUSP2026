import { useState } from "react";
import { Btn, Progresso } from "../../design/Componentes";
import { Simbolo } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { BotaoOuvir } from "../../design/Preferencias";
import { useTopoAoMudar } from "../../design/rolagem";
import { Marca } from "@uhealth/ui";

const CHAVE = "uh-boasvindas";
type Escala = "" | "lg" | "xl";
type Detalhe = "simples" | "detalhado";

export function boasVindasConcluida(): boolean {
  try { return localStorage.getItem(CHAVE) === "1"; } catch { return true; }
}

function guardar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: só não lembra */ }
}

function Opcao<T extends string>({ nome, valor, atual, rotulo, aoMudar, tamanho, estilo }: {
  nome: string; valor: T; atual: T; rotulo: string; aoMudar: (v: T) => void; tamanho?: "m"; estilo?: React.CSSProperties;
}) {
  return (
    <label className={`d-op${tamanho ? " d-op--m" : ""}${atual === valor ? " d-op--on" : ""}`} style={estilo}>
      <input type="radio" name={nome} value={valor} checked={atual === valor} onChange={() => aoMudar(valor)} />
      {rotulo}
    </label>
  );
}

/** Primeira abertura (design C3): boas-vindas e 2 passos. As escolhas ficam só neste aparelho. */
export function BoasVindas({ aoConcluir }: { aoConcluir: () => void }) {
  const [passo, setPasso] = useState(0);
  useTopoAoMudar(passo);
  const [paraQuem, setParaQuem] = useState<"mim" | "outra">("mim");
  const [detalhe, setDetalhe] = useState<Detalhe>("simples");
  const [escala, setEscala] = useState<Escala>(() => {
    try { return (localStorage.getItem("uh-scale") ?? "") as Escala; } catch { return ""; }
  });

  const mudarEscala = (v: Escala) => {
    setEscala(v);
    guardar("uh-scale", v);
    if (v) document.documentElement.setAttribute("data-scale", v); else document.documentElement.removeAttribute("data-scale");
  };
  const concluir = () => {
    guardar("uh-para-quem", paraQuem);
    guardar("uh-detalhe", detalhe);
    guardar(CHAVE, "1");
    aoConcluir();
  };

  return (
    <div className="d-casca">
      {passo === 0 && (
        <div className="d-tela d-tela--teal">
          <main className="d-corpo d-corpo--24">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Simbolo tamanho={34} escuro /><Marca className="d-marca d-marca--24" /></div>
            <div style={{ alignSelf: "center" }}><Ilustracao nome="boasVindas" texto="Duas portas em arco, uma aberta com luz amarela" /></div>
            <h1 className="d-h1 d-h1--32">Atendimento em clínicas-escola perto de você</h1>
            <p className="d-p d-p--grande" style={{ color: "inherit", fontSize: "calc(18px * var(--d-s))" }}>Encontre clínicas-escola, peça atendimento e acompanhe cada passo.</p>
            <div className="d-fim">
              <Btn variante="escuro" onClick={() => setPasso(1)}>Começar</Btn>
              <BotaoOuvir variante="fantasma" />
            </div>
          </main>
        </div>
      )}
      {passo === 1 && (
        <div className="d-tela">
          <main className="d-corpo d-corpo--24">
            <Progresso atual={1} total={2} />
            <h1 className="d-h1" style={{ lineHeight: 1.2 }}>Você procura atendimento para quem?</h1>
            <fieldset className="d-campos">
              <legend className="sr-only">Para quem é o atendimento</legend>
              <Opcao nome="quem" valor="mim" atual={paraQuem} rotulo="Para mim" aoMudar={setParaQuem} />
              <Opcao nome="quem" valor="outra" atual={paraQuem} rotulo="Para outra pessoa" aoMudar={setParaQuem} />
            </fieldset>
            <p className="d-p">Se for para uma criança ou uma pessoa idosa, você pode pedir por ela.</p>
            <div className="d-fim">
              <Btn onClick={() => setPasso(2)}>Continuar</Btn>
              <Btn variante="link" onClick={() => setPasso(0)}>Voltar</Btn>
            </div>
          </main>
        </div>
      )}
      {passo === 2 && (
        <div className="d-tela">
          <main className="d-corpo d-corpo--24" style={{ gap: 16 }}>
            <Progresso atual={2} total={2} />
            <h1 className="d-h1" style={{ lineHeight: 1.2 }}>Como você prefere receber as informações?</h1>
            <fieldset className="d-campos" style={{ gap: 10 }}>
              <legend>Texto</legend>
              <Opcao tamanho="m" nome="detalhe" valor="simples" atual={detalhe} rotulo="Simples e curto" aoMudar={setDetalhe} />
              <Opcao tamanho="m" nome="detalhe" valor="detalhado" atual={detalhe} rotulo="Detalhado" aoMudar={setDetalhe} />
            </fieldset>
            <fieldset className="d-campos" style={{ gap: 8 }}>
              <legend>Tamanho das letras</legend>
              <div className="d-segs d-segs--3">
                <Opcao tamanho="m" nome="escala" valor="" atual={escala} rotulo="Normal" aoMudar={mudarEscala} />
                <Opcao tamanho="m" nome="escala" valor="lg" atual={escala} rotulo="Grande" aoMudar={mudarEscala} estilo={{ fontSize: 20 }} />
                <Opcao tamanho="m" nome="escala" valor="xl" atual={escala} rotulo="Extra" aoMudar={mudarEscala} estilo={{ fontSize: 24 }} />
              </div>
            </fieldset>
            <div className="d-fim">
              <Btn onClick={concluir}>Pronto</Btn>
              <Btn variante="link" onClick={() => setPasso(1)}>Voltar</Btn>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
