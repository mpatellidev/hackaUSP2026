import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Aviso, Botao, Cartao, Campo, CampoSelecao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { CUSTO, ESPECIALIDADES, PUBLICO, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Icone } from "../../design/Icone";

type Filtro = "recebendo" | "gratuito" | "adultos" | "criancas";
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "recebendo", rotulo: "Recebendo pedidos" },
  { id: "gratuito", rotulo: "Gratuito" },
  { id: "adultos", rotulo: "Adultos" },
  { id: "criancas", rotulo: "Crianças" },
];

export function BuscaClinicas() {
  const { api } = useSessao();
  const [cidade, setCidade] = useState("São Paulo");
  const [editando, setEditando] = useState(false);
  const [especialidade, setEspecialidade] = useState("");
  const [filtros, setFiltros] = useState<Filtro[]>([]);
  const clinicas = useQuery({
    queryKey: ["clinicas", cidade, especialidade],
    queryFn: () => api.dados(api.cliente.GET("/clinicas", {
      params: { query: { cidade: cidade.trim() || undefined, especialidade: especialidade || undefined } },
    })),
  });

  const alternar = (f: Filtro) => setFiltros((atual) => (atual.includes(f) ? atual.filter((x) => x !== f) : [...atual, f]));
  const itens = (clinicas.data?.itens ?? []).filter((c) =>
    (!filtros.includes("recebendo") || c.recebendo_pedidos)
    && (!filtros.includes("gratuito") || c.custo_informado === "gratuito")
    && (!filtros.includes("adultos") || c.publico.includes("adultos"))
    && (!filtros.includes("criancas") || c.publico.includes("criancas")));

  return (
    <>
      <h1>Onde você quer ser atendido?</h1>
      <div className="linha cidade-atual">
        <Icone nome="local" />
        <strong>{cidade.trim() || "Todas as cidades"}</strong>
        <Botao variante="outline" aria-expanded={editando} onClick={() => setEditando(!editando)}>{editando ? "Pronto" : "Trocar"}</Botao>
      </div>
      {editando && (
        <div className="pilha">
          <Campo rotulo="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} autoComplete="off" />
          <CampoSelecao rotulo="Especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ESPECIALIDADES).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
          </CampoSelecao>
        </div>
      )}

      <div className="filtros" role="group" aria-label="Filtros">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`filtro${filtros.includes(f.id) ? " filtro--ligado" : ""}`}
            aria-pressed={filtros.includes(f.id)} onClick={() => alternar(f.id)}>
            {filtros.includes(f.id) && <Icone nome="confirmado" tamanho={20} />}{f.rotulo}
          </button>
        ))}
      </div>

      {clinicas.isPending && <Carregando />}
      {clinicas.isError && <Erro mensagem={mensagemDe(clinicas.error)} aoTentar={() => clinicas.refetch()} />}
      {clinicas.data && (
        <p role="status" className="contagem">
          {itens.length === 1 ? "1 clínica-escola" : `${itens.length} clínicas-escola`} em {cidade.trim() || "todas as cidades"}
        </p>
      )}
      {clinicas.data && itens.length === 0 && (
        <Vazio>Nenhuma clínica encontrada. Tire um filtro, troque de cidade ou de especialidade.</Vazio>
      )}
      <ul className="lista-cartoes">
        {itens.map((c) => (
          <li key={c.id}>
            <Cartao aria-labelledby={`c-${c.id}`}>
              <h2 id={`c-${c.id}`}>{c.nome}</h2>
              <p>{c.cidade}, {c.uf}</p>
              <div className="etiquetas">
                <Selo tom={c.recebendo_pedidos ? "padrao" : "aviso"}>
                  <Icone nome={c.recebendo_pedidos ? "confirmado" : "naoRecebe"} tamanho={20} />
                  {c.recebendo_pedidos ? "Recebendo pedidos" : "Fechada por ora"}
                </Selo>
                <Selo tom="aviso">{CUSTO[c.custo_informado]}</Selo>
              </div>
              <p>{c.publico.map((p) => PUBLICO[p]).join(" · ")} · {c.especialidades.map(rotuloEspecialidade).join(" · ")}</p>
              <Link className="btn btn--primary btn--block" to={`/clinicas/${c.id}`}>Escolher esta clínica</Link>
            </Cartao>
          </li>
        ))}
      </ul>
      <Aviso>Custos e serviços são informados pelas clínicas e dependem de confirmação da instituição.</Aviso>
    </>
  );
}
