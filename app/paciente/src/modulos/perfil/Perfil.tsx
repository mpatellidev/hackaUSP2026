import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { mensagemDe, useSessao, type Perfil as PerfilApi } from "@uhealth/api-client";
import { Btn, LinhaSamu, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";
import { NOME_MODO, salvarModo, useModoAtendimento } from "../../modoAtendimento";
import { corpoPerfil } from "../cadastro/CompletarCadastro";

type Faixa = NonNullable<PerfilApi["socioeconomico"]["faixa_renda_familiar"]>;
type Renda = Faixa | "prefiro_nao" | "";
type Acess = PerfilApi["acessibilidade"];

const RENDAS: [Renda, string][] = [
  ["ate_1_salario_minimo", "Até 1 salário mínimo"],
  ["1_a_2_salarios_minimos", "De 1 a 2 salários mínimos"],
  ["2_a_3_salarios_minimos", "De 2 a 3 salários mínimos"],
  ["acima_de_3_salarios_minimos", "Mais de 3 salários mínimos"],
  ["prefiro_nao", "Prefiro não informar"],
];
const TEXTOS: [Acess["texto"], string][] = [["normal", "Normal"], ["grande", "Grande"], ["extra_grande", "Extra"]];
const LINGUAGENS: [Acess["linguagem"], string][] = [["simples", "Simples e curto"], ["detalhada", "Detalhado"]];
/** O fundo do app é sempre branco: só claro ou alto contraste (preto sobre branco). */
const TEMAS: [Acess["tema"], string][] = [["claro", "Claro"], ["alto_contraste", "Alto contraste"]];

// Mesmas chaves e atributos dos botões "Aa" e "Aparência" (design/Preferencias.tsx).
const ESCALA = { normal: "", grande: "lg", extra_grande: "xl" } as const;
const TEMA = { sistema: "", claro: "", escuro: "", alto_contraste: "hc" } as const;
function aplicarNoAparelho(a: Acess) {
  const pares: [string, string, string][] = [["uh-scale", "data-scale", ESCALA[a.texto]], ["uh-theme", "data-theme", TEMA[a.tema]]];
  for (const [chave, atributo, valor] of pares) {
    try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: só não lembra */ }
    if (valor) document.documentElement.setAttribute(atributo, valor);
    else document.documentElement.removeAttribute(atributo);
  }
}

function Radios<T extends string>({ legenda, nome, opcoes, valor, aoMudar, lado = false }: { legenda: string; nome: string; opcoes: [T, string][]; valor: T; aoMudar: (v: T) => void; lado?: boolean }) {
  const itens = opcoes.map(([v, rotulo]) => (
    <label key={v} className={`d-op d-op--m${valor === v ? " d-op--on" : ""}`}>
      <input type="radio" name={nome} value={v} checked={valor === v} onChange={() => aoMudar(v)} />
      {rotulo}
    </label>
  ));
  return (
    <fieldset className="d-campos">
      <legend>{legenda}</legend>
      {lado ? <div className="d-segs">{itens}</div> : itens}
    </fieldset>
  );
}

function Formulario({ perfil }: { perfil: PerfilApi }) {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [cidade, setCidade] = useState(perfil.cidade ?? "");
  const [uf, setUf] = useState(perfil.uf ?? "");
  const [contato, setContato] = useState<"app" | "telefone" | "">(perfil.contato_preferido ?? "");
  const [renda, setRenda] = useState<Renda>(
    perfil.socioeconomico.informado ? (perfil.socioeconomico.faixa_renda_familiar ?? "") : perfil.socioeconomico.prefiro_nao_informar ? "prefiro_nao" : "",
  );
  // "sistema" e "escuro" (salvos antes do fundo branco obrigatório) viram "claro"
  const [defic, setDefic] = useState<"sim" | "nao" | "">(perfil.possui_deficiencia == null ? "" : perfil.possui_deficiencia ? "sim" : "nao");
  const [tipoDefic, setTipoDefic] = useState(perfil.tipo_deficiencia ?? "");
  const [consente, setConsente] = useState(!!perfil.consentimento_dados_sensiveis);
  const [acess, setAcess] = useState<Acess>({ ...perfil.acessibilidade, tema: perfil.acessibilidade.tema === "alto_contraste" ? "alto_contraste" : "claro" });
  const modo = useModoAtendimento();
  const { sair } = useSessao();
  const mudar = <K extends keyof Acess>(k: K, v: Acess[K]) => setAcess((a) => ({ ...a, [k]: v }));

  const salvar = useMutation({
    mutationFn: () => api.dados(api.cliente.PUT("/perfil", {
      // PUT substitui o perfil: corpoPerfil mantém endereço e preferências que esta tela não mostra
      body: corpoPerfil(perfil, {
        cidade: cidade.trim() || null,
        uf: uf.trim().toUpperCase() || null,
        contato_preferido: contato || null,
        socioeconomico: renda && renda !== "prefiro_nao"
          ? { informado: true, faixa_renda_familiar: renda, prefiro_nao_informar: false }
          : { informado: false, faixa_renda_familiar: null, prefiro_nao_informar: renda === "prefiro_nao" },
        acessibilidade: acess,
        possui_deficiencia: consente && defic ? defic === "sim" : null,
        tipo_deficiencia: consente && defic === "sim" && tipoDefic ? tipoDefic : null,
        consentimento_dados_sensiveis: consente,
      }),
    })),
    onSuccess: (dados) => { qc.setQueryData(["perfil"], dados); aplicarNoAparelho(dados.acessibilidade); },
  });
  const ufInvalida = uf.trim() !== "" && uf.trim().length !== 2;
  const informouSensivel = (renda !== "" && renda !== "prefiro_nao") || defic !== "";
  const faltaConsentimento = informouSensivel && !consente;
  const enviar = (e: FormEvent) => { e.preventDefault(); if (!ufInvalida && !faltaConsentimento) salvar.mutate(); };

  return (
    <form className="d-corpo" style={{ padding: 0 }} onSubmit={enviar} noValidate>
      <Voltar para="/clinicas">Buscar</Voltar>
      <h1 className="d-h1 d-h1--30">Meu perfil</h1>
      <div className="d-aviso d-aviso--pequeno">{perfil.aviso}</div>
      <Link className="d-btn d-btn--outline" to="/perfil/endereco"><Icone nome="local" />Endereço e preferências</Link>

      <div className="d-campo">
        <label htmlFor="perfil-cidade">Cidade</label>
        <input id="perfil-cidade" value={cidade} maxLength={80} autoComplete="address-level2" onChange={(e) => setCidade(e.target.value)} />
      </div>
      <div className="d-campo">
        <label htmlFor="perfil-uf">Estado (sigla)</label>
        <input id="perfil-uf" value={uf} maxLength={2} autoComplete="address-level1" aria-invalid={ufInvalida} aria-describedby={ufInvalida ? "perfil-uf-erro" : undefined}
          onChange={(e) => setUf(e.target.value)} style={{ textTransform: "uppercase" }} />
        {ufInvalida && <p id="perfil-uf-erro" className="d-small" role="alert">Use as 2 letras do estado, por exemplo SP.</p>}
      </div>

      <Radios legenda="Como prefere ser contatado" nome="contato" valor={contato} aoMudar={setContato}
        opcoes={[["app", "Pelo app"], ["telefone", "Por telefone"], ["", "Tanto faz"]]} />

      <Radios legenda="Renda da família (opcional)" nome="renda" valor={renda} aoMudar={setRenda}
        opcoes={[...RENDAS, ["", "Deixar em branco"]]} />
      <Radios legenda="Você tem alguma deficiência? (opcional)" nome="defic" valor={defic} aoMudar={setDefic}
        opcoes={[["sim", "Sim"], ["nao", "Não"], ["", "Não informar"]]} />
      {defic === "sim" && (
        <div className="d-campo">
          <label htmlFor="perfil-tipo-defic">Qual? (opcional)</label>
          <select id="perfil-tipo-defic" value={tipoDefic} onChange={(e) => setTipoDefic(e.target.value)}>
            <option value="">Prefiro não dizer</option>
            <option value="visual">Visual</option><option value="auditiva">Auditiva</option><option value="motora">Motora</option>
            <option value="intelectual">Intelectual</option><option value="tea">Autismo (TEA)</option><option value="outra">Outra</option>
          </select>
        </div>
      )}
      <section className="d-card" aria-labelledby="h-sensivel" style={{ gap: 8 }}>
        <h2 id="h-sensivel" className="d-h2">Por que pedimos renda e deficiência?</h2>
        <p className="d-small">São dados sensíveis (LGPD). Servem só para dar mais prioridade na fila a quem tem menos renda ou tem deficiência. Não aparecem para outros pacientes e não impedem nenhum pedido. Você pode retirar a autorização quando quiser: aí apagamos esses dados.</p>
        <label className="d-consent">
          <input type="checkbox" checked={consente} onChange={(e) => setConsente(e.target.checked)} />
          Autorizo o uso da minha renda e da informação sobre deficiência para calcular minha prioridade.
        </label>
        {faltaConsentimento && <p className="d-small" role="alert">Para informar renda ou deficiência, marque a autorização (ou escolha "Não informar").</p>}
      </section>

      <Radios legenda="Tamanho das letras" nome="texto" valor={acess.texto} aoMudar={(v) => mudar("texto", v)} opcoes={TEXTOS} lado />
      <Radios legenda="Como prefere receber as informações" nome="linguagem" valor={acess.linguagem} aoMudar={(v) => mudar("linguagem", v)} opcoes={LINGUAGENS} />
      <Radios legenda="Aparência" nome="tema" valor={acess.tema} aoMudar={(v) => mudar("tema", v)} opcoes={TEMAS} />

      {salvar.isError && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(salvar.error)}</b></div>}
      {salvar.isSuccess && <div className="d-aviso d-aviso--ok" role="status"><b>Perfil salvo.</b></div>}
      <div className="d-fim">
        <Btn type="submit" disabled={salvar.isPending || ufInvalida || faltaConsentimento}>{salvar.isPending ? "Salvando…" : "Salvar perfil"}</Btn>
        <section className="d-card" aria-labelledby="perfil-modo">
          <h2 id="perfil-modo" className="d-h2">Forma de atendimento</h2>
          <p className="d-small">Agora: {NOME_MODO[modo ?? "telas"]}. A assistente faz as mesmas coisas que estas telas, uma pergunta por vez.</p>
          <Btn variante="outline" compacto onClick={() => salvarModo(api, "conversa")}>{NOME_MODO.conversa}</Btn>
        </section>
        <Btn variante="link" onClick={() => void sair()}>Sair da conta</Btn>
        <LinhaSamu />
      </div>
    </form>
  );
}

/** Meu perfil: GET/PUT /perfil (o PUT substitui o perfil inteiro, então o formulário reenvia tudo). */
export function Perfil() {
  const { api } = useSessao();
  const perfil = useQuery({ queryKey: ["perfil"], queryFn: () => api.dados(api.cliente.GET("/perfil", {})) });

  if (perfil.isPending) return <div className="d-tela"><main className="d-corpo"><p role="status" className="d-small">Carregando…</p></main></div>;
  if (perfil.isError) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para="/clinicas">Buscar</Voltar>
        <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{mensagemDe(perfil.error)}</b></div>
        <Btn onClick={() => void perfil.refetch()}>Tentar de novo</Btn>
      </main></div>
    );
  }
  return <div className="d-tela"><main className="d-corpo"><Formulario perfil={perfil.data} /></main></div>;
}

/** Atalho do topo (ícone de pessoa) para o perfil. */
export function AtalhoPerfil() {
  return <Link className="d-quad" to="/perfil" aria-label="Meu perfil"><Icone nome="pessoa" tamanho={18} /></Link>;
}
