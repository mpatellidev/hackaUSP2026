import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CUSTO, PUBLICO, mensagemDe, rotuloEspecialidade, useSessao, type PublicoAlvo } from "@uhealth/api-client";
import { BotaoAudio } from "../../design/Preferencias";
import { Btn, BtnLink, Linhas, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";

type Passo = "quem" | "atendimento" | "publico" | "motivo" | "revisao" | "enviado";
const AJUDA: Record<string, string> = {
  quem: "Se você vai pedir por uma criança, uma pessoa idosa ou outra pessoa da família, escolha \"Para outra pessoa\". Se é para você mesmo, escolha \"Para mim\".",
  atendimento: "É o tipo de atendimento que você procura. A clínica mostra só o que ela oferece.",
  publico: "Diz quem vai ser atendido. A clínica usa isso para saber se pode atender.",
  motivo: "Escreva só o que você precisa, como \"consulta de rotina\". Não conte dados de saúde: a clínica pergunta o resto depois.",
};

/** Pedir atendimento (design C1): conversa curta, revisão e envio. Nada é enviado sem o toque em "Enviar pedido". */
export function PedirAtendimento() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const clinica = useQuery({ queryKey: ["clinica", id], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: id } } })) });

  const [passo, setPasso] = useState<Passo>("quem");
  const [paraQuem, setParaQuem] = useState<"mim" | "outra" | null>(null);
  const [especialidade, setEspecialidade] = useState<string | null>(null);
  const [publico, setPublico] = useState<PublicoAlvo | null>(null);
  const [motivo, setMotivo] = useState("");
  const [texto, setTexto] = useState("");
  const [ajudas, setAjudas] = useState<string[]>([]);
  const [autorizo, setAutorizo] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { fim.current?.scrollIntoView?.({ block: "end" }); }, [passo, ajudas]);

  const enviar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/solicitacoes", {
      body: { clinica_id: id, especialidade: especialidade!, publico_alvo: publico!, descricao_administrativa: motivo },
    })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["solicitacoes"] }); setPasso("enviado"); },
  });
  const criado = enviar.data;

  if (clinica.isPending) return <div className="d-tela"><main className="d-corpo"><p role="status" className="d-small">Carregando…</p></main></div>;
  if (clinica.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para="/clinicas" />
        <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(clinica.error)}</b></div>
        <Btn onClick={() => void clinica.refetch()}>Tentar de novo</Btn>
      </main></div>
    );
  }
  const c = clinica.data;

  if (!c.recebendo_pedidos) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para="/clinicas" />
        <div className="d-aviso d-aviso--perigo" role="status"><Icone nome="naoRecebe" tamanho={24} /><b>{c.nome} não pode receber agora.</b></div>
        <p className="d-p d-p--texto">Volte e escolha outra clínica.</p>
      </main></div>
    );
  }

  // Quando só há uma opção, a pergunta é pulada (nada a escolher).
  const proxima = (atual: Passo, esp = especialidade, pub = publico): Passo => {
    if (atual === "quem" && c.especialidades.length > 1 && !esp) return "atendimento";
    if ((atual === "quem" || atual === "atendimento") && c.publico.length > 1 && !pub) return "publico";
    return "motivo";
  };
  const escolherQuem = (v: "mim" | "outra") => {
    const esp = c.especialidades.length === 1 ? c.especialidades[0] : null;
    const pub = c.publico.length === 1 ? c.publico[0] : null;
    setParaQuem(v); setEspecialidade(esp); setPublico(pub); setPasso(proxima("quem", esp, pub));
  };
  const escolherEsp = (e: string) => { setEspecialidade(e); setPasso(proxima("atendimento", e, publico)); };
  const escolherPub = (p: PublicoAlvo) => { setPublico(p); setPasso("motivo"); };
  const aoEnviarTexto = (e: FormEvent) => { e.preventDefault(); if (texto.trim().length >= 3) { setMotivo(texto.trim()); setPasso("revisao"); } };
  const outroJeito = (chave: string) => setAjudas((a) => (a.includes(chave) ? a : [...a, chave]));

  if (passo === "enviado") {
    return (
      <div className="d-tela">
        <main className="d-corpo d-corpo--24 d-corpo--centro">
          <Ilustracao nome="enviado" texto="Um envelope com marca de confirmação" />
          <h1 className="d-h1 d-h1--30">Pedido enviado</h1>
          <p className="d-p d-p--grande">A clínica vai analisar o seu pedido. Você acompanha cada etapa por aqui.</p>
          <div className="d-aviso d-aviso--14">Ainda não é consulta marcada.</div>
          <div className="d-fim">
            <BtnLink to={criado ? `/pedidos/${criado.id}` : "/pedidos"}>Acompanhar pedido</BtnLink>
            <BtnLink variante="outline" to="/clinicas">Voltar ao início</BtnLink>
          </div>
        </main>
      </div>
    );
  }

  if (passo === "revisao") {
    return (
      <div className="d-tela">
        <main className="d-corpo" style={{ gap: 14 }}>
          <p className="d-small">Último passo</p>
          <h1 className="d-h1">Revise antes de enviar</h1>
          <Linhas rotulo="Resumo do pedido" itens={[
            ["Clínica", c.nome],
            ["Para", paraQuem === "outra" ? "Outra pessoa" : "Você"],
            ["Atendimento", rotuloEspecialidade(especialidade!)],
            ["Quem será atendido", PUBLICO[publico!]],
            ["Motivo", motivo],
            ["Custo", `${CUSTO[c.custo_informado]}, a confirmar`],
          ]} />
          <label className="d-consent">
            <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
            Autorizo a {c.nome} a ver estas informações para analisar meu pedido.
          </label>
          <p className="d-small">Enviar não garante vaga. Ainda não é consulta marcada.</p>
          {enviar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(enviar.error)}</b></div>}
          <div className="d-fim">
            <Btn disabled={!autorizo || enviar.isPending} onClick={() => enviar.mutate()}>{enviar.isPending ? "Enviando…" : "Enviar pedido"}</Btn>
            <Btn variante="outline" onClick={() => setPasso("motivo")}>Corrigir algo</Btn>
          </div>
        </main>
      </div>
    );
  }

  const ordem: Passo[] = ["quem", "atendimento", "publico", "motivo"];
  const ate = ordem.indexOf(passo);
  const pergunta: Record<string, string> = {
    quem: "Oi! Vou te ajudar a pedir atendimento. É para você ou para outra pessoa?",
    atendimento: "Qual atendimento você procura?",
    publico: "Quem vai ser atendido?",
    motivo: "Em poucas palavras, qual é o motivo do pedido? Não escreva dados de saúde.",
  };
  const resposta: Record<string, string | null> = {
    quem: paraQuem ? (paraQuem === "mim" ? "Para mim" : "Para outra pessoa") : null,
    atendimento: especialidade ? rotuloEspecialidade(especialidade) : null,
    publico: publico ? PUBLICO[publico] : null,
    motivo: null,
  };
  const pulado = (p: Passo) => (p === "atendimento" && c.especialidades.length === 1) || (p === "publico" && c.publico.length === 1);

  return (
    <div className="d-tela">
      <div className="d-chat-topo">
        <a className="d-quad" href={`/clinicas`} onClick={(e) => { e.preventDefault(); navegar("/clinicas"); }} aria-label="Voltar"><Icone nome="voltar" /></a>
        <h1>Pedir atendimento</h1>
        <BotaoAudio aoOuvir={() => document.querySelector("[role=log]")?.textContent ?? ""} />
      </div>
      <div className="d-chat" role="log" aria-label="Conversa">
        <p className="sr-only">Pedido para {c.nome}</p>
        {ordem.slice(0, ate + 1).filter((p) => !pulado(p)).map((p) => (
          <div key={p} style={{ display: "contents" }}>
            <div className="d-bolha">{pergunta[p]}</div>
            {ajudas.includes(p) && <div className="d-bolha">{AJUDA[p]}</div>}
            {resposta[p] && <div className="d-bolha d-bolha--eu">{resposta[p]}</div>}
          </div>
        ))}
        {passo !== "motivo" && (
          <div className="d-respostas">
            {passo === "quem" && (<>
              <button type="button" className="d-resposta" onClick={() => escolherQuem("mim")}>Para mim</button>
              <button type="button" className="d-resposta" onClick={() => escolherQuem("outra")}>Para outra pessoa</button>
            </>)}
            {passo === "atendimento" && c.especialidades.map((e) => <button key={e} type="button" className="d-resposta" onClick={() => escolherEsp(e)}>{rotuloEspecialidade(e)}</button>)}
            {passo === "publico" && c.publico.map((p) => <button key={p} type="button" className="d-resposta" onClick={() => escolherPub(p)}>{PUBLICO[p]}</button>)}
            <button type="button" className="d-resposta" onClick={() => outroJeito(passo)}>Explique de outro jeito</button>
          </div>
        )}
        {passo === "motivo" && <div className="d-respostas"><button type="button" className="d-resposta" onClick={() => outroJeito("motivo")}>Explique de outro jeito</button></div>}
        <div ref={fim} />
      </div>
      <form className="d-compositor" onSubmit={aoEnviarTexto}>
        <label className="sr-only" htmlFor="msg">Sua mensagem</label>
        <input id="msg" type="text" placeholder="Escreva aqui" value={texto} maxLength={280} disabled={passo !== "motivo"}
          onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
        {passo === "motivo" && texto.trim().length >= 3 ? (
          <button type="submit" aria-label="Enviar mensagem">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : (
          <Ditar ativo={passo === "motivo"} aoOuvir={(t) => setTexto(t.slice(0, 280))} />
        )}
      </form>
    </div>
  );
}

type Reconhecimento = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start(): void; stop(): void };

/** "Falar em vez de escrever": ditado do aparelho (Web Speech). Some se o aparelho não tiver reconhecimento de voz. */
function Ditar({ ativo, aoOuvir }: { ativo: boolean; aoOuvir: (texto: string) => void }) {
  const [ouvindo, setOuvindo] = useState(false);
  const Classe = (window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => Reconhecimento }).webkitSpeechRecognition;
  if (!Classe) return null;
  const falar = () => {
    const r = new Classe();
    r.lang = "pt-BR"; r.interimResults = false;
    r.onresult = (e) => aoOuvir(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setOuvindo(false);
    setOuvindo(true); r.start();
  };
  return <button type="button" aria-label="Falar em vez de escrever" aria-pressed={ouvindo} disabled={!ativo || ouvindo} onClick={falar}><Icone nome="microfone" /></button>;
}
