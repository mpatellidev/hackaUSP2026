import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Aviso, Botao, Cartao, CampoSelecao, Campo, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { dataHora, mensagemDe, useSessao } from "@uhealth/api-client";
import { useClinicaAtual } from "../clinicaAtual";

type Classificacao = "urgencia_confirmada" | "sem_urgencia";

/** Só `profissional` avalia (a API também barra com 403). Urgência avaliada sempre precede o score na fila. */
export function Urgencias() {
  const { api } = useSessao();
  const { funcao } = useClinicaAtual();
  const qc = useQueryClient();
  const [classificacao, setClassificacao] = useState<Classificacao>("urgencia_confirmada");
  const [obs, setObs] = useState("");
  const relatos = useQuery({ queryKey: ["urgencias"], queryFn: () => api.dados(api.cliente.GET("/urgencias", {})) });
  const avaliar = useMutation({
    mutationFn: (relatoId: string) => api.dados(api.cliente.POST("/urgencias/{relato_id}/avaliacao", {
      params: { path: { relato_id: relatoId } }, body: { classificacao, observacao_administrativa: obs.trim() || null },
    })),
    onSuccess: () => { setObs(""); return Promise.all([qc.invalidateQueries({ queryKey: ["urgencias"] }), qc.invalidateQueries({ queryKey: ["fila"] })]); },
  });

  return (
    <>
      <h1>Urgências relatadas</h1>
      <Aviso>Relato de urgência nunca é punido. A avaliação é de um profissional e não é diagnóstico: registre só observação administrativa.</Aviso>
      {funcao !== "profissional" && <Aviso>Você pode acompanhar os relatos, mas só um profissional da clínica registra a avaliação.</Aviso>}
      {relatos.isPending && <Carregando />}
      {relatos.isError && <Erro mensagem={mensagemDe(relatos.error)} aoTentar={() => relatos.refetch()} />}
      {relatos.data && relatos.data.itens.length === 0 && <Vazio>Nenhum relato de urgência.</Vazio>}
      {avaliar.isError && <Aviso tom="perigo">{mensagemDe(avaliar.error)}</Aviso>}
      <ul className="lista-cartoes">
        {relatos.data?.itens.map((r) => (
          <li key={r.id}>
            <Cartao>
              <Selo tom={r.estado === "avaliada" ? "padrao" : "aviso"}>{r.rotulo}</Selo>
              <p>Relatado em {dataHora(r.criado_em)}{r.solicitacao_id ? " · ligado a um pedido" : ""}</p>
              {r.avaliacao && <p>Avaliação: {r.avaliacao.classificacao === "urgencia_confirmada" ? "urgência confirmada" : "sem urgência confirmada"}{r.avaliacao.observacao_administrativa ? ` — ${r.avaliacao.observacao_administrativa}` : ""}</p>}
              {r.estado !== "avaliada" && funcao === "profissional" && (
                <div className="pilha">
                  <CampoSelecao rotulo="Classificação" value={classificacao} onChange={(e) => setClassificacao(e.target.value as Classificacao)}>
                    <option value="urgencia_confirmada">Urgência confirmada</option>
                    <option value="sem_urgencia">Sem urgência confirmada</option>
                  </CampoSelecao>
                  <Campo rotulo="Observação administrativa (opcional)" value={obs} maxLength={280} onChange={(e) => setObs(e.target.value)} />
                  <Botao disabled={avaliar.isPending} onClick={() => avaliar.mutate(r.id)}>Registrar avaliação</Botao>
                </div>
              )}
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}
