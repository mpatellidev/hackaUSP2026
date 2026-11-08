import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PUBLICO, mensagemDe, useSessao, type Clinica } from "@uhealth/api-client";
import { BotaoAudio, BotaoLetras } from "../../design/Preferencias";
import { BtnLink, Chip, LinhaSamu } from "../../design/Componentes";
import { Icone, Simbolo } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { Btn } from "../../design/Componentes";

const ROTULO_CUSTO = { gratuito: "Gratuito", a_confirmar: "Custo a confirmar", pago_informado: "Pago (valor informado)" } as const;
const TOM_CUSTO = { gratuito: "sun", a_confirmar: "neutral", pago_informado: "neutral" } as const;

function CartaoClinica({ c, destaque }: { c: Clinica; destaque: boolean }) {
  return (
    <li>
      <article className={`d-card${destaque ? " d-card--sel" : ""}`} aria-labelledby={`c-${c.id}`}>
        <div className="d-card-topo"><h2 id={`c-${c.id}`} className="d-h2">{c.nome}</h2></div>
        <div className="d-chips">
          {c.recebendo_pedidos
            ? <Chip icone="confirmado">Recebendo pedidos</Chip>
            : <Chip tom="danger" icone="naoRecebe">Fechada por ora</Chip>}
          {c.recebendo_pedidos && <Chip tom={TOM_CUSTO[c.custo_informado]}>{ROTULO_CUSTO[c.custo_informado]}</Chip>}
        </div>
        <p className="d-small">{c.cidade}, {c.uf} · {c.publico.map((p) => PUBLICO[p]).join(" · ")}</p>
        {c.recebendo_pedidos && <BtnLink compacto to={`/clinicas/${c.id}`}>Escolher esta clínica</BtnLink>}
      </article>
    </li>
  );
}

/** Buscar (design P1): topo com título e cidade, lista de clínicas e abas. */
export function BuscaClinicas() {
  const { api } = useSessao();
  const [cidade, setCidade] = useState("São Paulo");
  const [editando, setEditando] = useState(false);
  const clinicas = useQuery({
    queryKey: ["clinicas", cidade],
    queryFn: () => api.dados(api.cliente.GET("/clinicas", { params: { query: { cidade: cidade.trim() || undefined } } })),
  });
  const itens = clinicas.data?.itens ?? [];
  const primeira = itens.findIndex((c) => c.recebendo_pedidos);

  if (clinicas.isError) {
    return (
      <div className="d-tela"><main className="d-corpo d-corpo--24 d-corpo--centro" role="alert">
        <Ilustracao nome="semInternet" texto="Celular sem sinal de internet" />
        <h1 className="d-h1">Sem conexão</h1>
        <p className="d-p d-p--grande">{mensagemDe(clinicas.error)}</p>
        <div className="d-fim"><Btn onClick={() => void clinicas.refetch()}>Tentar de novo</Btn></div>
      </main></div>
    );
  }
  if (clinicas.data && itens.length === 0 && !editando) {
    return (
      <div className="d-tela"><main className="d-corpo d-corpo--24 d-corpo--centro">
        <Ilustracao nome="semClinica" texto="Mapa com um ponto de interrogação" />
        <h1 className="d-h1">Nenhuma clínica por perto</h1>
        <p className="d-p d-p--grande">Não achamos clínicas em {cidade.trim() || "todas as cidades"}.</p>
        <div className="d-fim">
          <Btn onClick={() => { setCidade(""); }}>Buscar em todas as cidades</Btn>
          <Btn variante="outline" onClick={() => setEditando(true)}>Trocar de cidade</Btn>
        </div>
      </main></div>
    );
  }

  return (
    <div className="d-tela">
      <header className="d-topo">
        <div className="d-topo-linha">
          <Simbolo tamanho={30} escuro />
          <span className="d-marca">UHealth</span>
          <BotaoAudio aoOuvir={() => document.querySelector("main")?.textContent ?? ""} />
          <BotaoLetras />
        </div>
        <h1 className="d-h1 d-h1--30 d-h1--claro">Onde você quer ser atendido?</h1>
        <div className="d-cidade">
          <Icone nome="local" />
          {editando
            ? <input aria-label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} autoComplete="off" autoFocus />
            : <span>{cidade.trim() || "Todas as cidades"}</span>}
          <button type="button" aria-expanded={editando} onClick={() => setEditando(!editando)}>{editando ? "Pronto" : "Trocar"}</button>
        </div>
      </header>

      <main className="d-corpo" style={{ gap: 14 }}>
        {clinicas.isPending && <p role="status" className="d-small">Carregando…</p>}
        {clinicas.data && itens.length > 0 && <p role="status" className="d-small">{itens.length === 1 ? "1 clínica-escola" : `${itens.length} clínicas-escola`} em {cidade.trim() || "todas as cidades"}</p>}
        <ul className="d-lista">{itens.map((c, i) => <CartaoClinica key={c.id} c={c} destaque={i === primeira} />)}</ul>
        <div className="d-fim">
          <LinhaSamu />
          <Link className="d-btn d-btn--link" to="/urgencia">Estou com uma urgência</Link>
        </div>
      </main>
    </div>
  );
}
