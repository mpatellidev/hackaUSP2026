import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Aviso, Cartao, Campo, CampoSelecao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { CUSTO, ESPECIALIDADES, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";

export function BuscaClinicas() {
  const { api } = useSessao();
  const [cidade, setCidade] = useState("São Paulo");
  const [especialidade, setEspecialidade] = useState("");
  const clinicas = useQuery({
    queryKey: ["clinicas", cidade, especialidade],
    queryFn: () => api.dados(api.cliente.GET("/clinicas", {
      params: { query: { cidade: cidade.trim() || undefined, especialidade: especialidade || undefined } },
    })),
  });

  return (
    <>
      <h1>Onde você quer ser atendido?</h1>
      <div className="pilha">
        <Campo rotulo="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} autoComplete="off" />
        <CampoSelecao rotulo="Especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(ESPECIALIDADES).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </CampoSelecao>
      </div>
      <Aviso>Custos e serviços são informados pelas clínicas e dependem de confirmação da instituição.</Aviso>

      {clinicas.isPending && <Carregando />}
      {clinicas.isError && <Erro mensagem={mensagemDe(clinicas.error)} aoTentar={() => clinicas.refetch()} />}
      {clinicas.data && clinicas.data.itens.length === 0 && <Vazio>Nenhuma clínica encontrada. Tente outra cidade ou especialidade.</Vazio>}
      <ul className="lista-cartoes">
        {clinicas.data?.itens.map((c) => (
          <li key={c.id}>
            <Cartao aria-labelledby={`c-${c.id}`}>
              <h2 id={`c-${c.id}`}>{c.nome}</h2>
              <p>{c.cidade}, {c.uf}</p>
              <div className="etiquetas">
                <Selo tom={c.recebendo_pedidos ? "padrao" : "aviso"}>{c.recebendo_pedidos ? "Recebendo pedidos" : "Sem receber pedidos agora"}</Selo>
                <Selo tom="aviso">{CUSTO[c.custo_informado]}</Selo>
              </div>
              <p>{c.especialidades.map(rotuloEspecialidade).join(" · ")}</p>
              <Link className="btn btn--primary btn--block" to={`/clinicas/${c.id}`}>Ver clínica</Link>
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}
