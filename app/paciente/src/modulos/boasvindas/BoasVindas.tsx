import { useState } from "react";
import { Botao, Cartao, FaixaDemo } from "@uhealth/ui";
import { Simbolo } from "../../design/Icone";

const CHAVE = "uh-boasvindas";
type Escala = "" | "lg" | "xl";
type Detalhe = "simples" | "detalhado";

export function boasVindasConcluida(): boolean {
  try { return localStorage.getItem(CHAVE) === "1"; } catch { return true; }
}

function guardar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: só não lembra */ }
}

function Opcoes<T extends string>({ nome, legenda, valor, opcoes, aoMudar }: {
  nome: string; legenda: string; valor: T; opcoes: { valor: T; rotulo: string; apoio?: string }[]; aoMudar: (v: T) => void;
}) {
  return (
    <fieldset className="opcoes">
      <legend>{legenda}</legend>
      {opcoes.map((o) => (
        <label key={o.valor} className={`opcao${valor === o.valor ? " opcao--marcada" : ""}`}>
          <input type="radio" name={nome} value={o.valor} checked={valor === o.valor} onChange={() => aoMudar(o.valor)} />
          <span><strong>{o.rotulo}</strong>{o.apoio && <small>{o.apoio}</small>}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Primeira abertura (design C3): boas-vindas e 2 passos. As escolhas ficam só neste aparelho. */
export function BoasVindas({ aoConcluir }: { aoConcluir: () => void }) {
  const [passo, setPasso] = useState(0);
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
    <div className="tela-celular">
      <FaixaDemo />
      <main className="conteudo pilha" id="conteudo">
        {passo === 0 && (
          <>
            <div className="boas-vindas-marca" style={{ color: "var(--uh-link)" }}><Simbolo tamanho={96} /></div>
            <h1>UHealth</h1>
            <p>Atendimento em clínicas-escola perto de você.</p>
            <p>Encontre clínicas-escola, peça atendimento e acompanhe cada passo.</p>
            <Botao bloco onClick={() => setPasso(1)}>Começar</Botao>
          </>
        )}
        {passo === 1 && (
          <>
            <p className="hint" aria-live="polite">Passo 1 de 2</p>
            <h1>Você procura atendimento para quem?</h1>
            <Opcoes nome="para-quem" legenda="Para quem é o atendimento" valor={paraQuem} aoMudar={setParaQuem}
              opcoes={[{ valor: "mim", rotulo: "Para mim" }, { valor: "outra", rotulo: "Para outra pessoa" }]} />
            <p className="hint">Se for para uma criança ou uma pessoa idosa, você pode pedir por ela.</p>
            <Botao bloco onClick={() => setPasso(2)}>Continuar</Botao>
            <Botao bloco variante="outline" onClick={() => setPasso(0)}>Voltar</Botao>
          </>
        )}
        {passo === 2 && (
          <>
            <p className="hint" aria-live="polite">Passo 2 de 2</p>
            <h1>Como você prefere receber as informações?</h1>
            <Opcoes nome="detalhe" legenda="Nível de detalhe" valor={detalhe} aoMudar={setDetalhe}
              opcoes={[{ valor: "simples", rotulo: "Texto", apoio: "Simples e curto" }, { valor: "detalhado", rotulo: "Detalhado" }]} />
            <Opcoes nome="escala" legenda="Tamanho das letras" valor={escala} aoMudar={mudarEscala}
              opcoes={[{ valor: "", rotulo: "Normal" }, { valor: "lg", rotulo: "Grande" }, { valor: "xl", rotulo: "Extra" }]} />
            <Cartao><p className="hint">Para ouvir qualquer tela, use o botão de áudio no topo.</p></Cartao>
            <Botao bloco onClick={concluir}>Pronto</Botao>
            <Botao bloco variante="outline" onClick={() => setPasso(1)}>Voltar</Botao>
          </>
        )}
      </main>
    </div>
  );
}
