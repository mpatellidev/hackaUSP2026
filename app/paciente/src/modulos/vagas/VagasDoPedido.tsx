import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { quando } from "../../design/datas";
import { Btn, BtnLink, BtnTel, Voltar } from "../../design/Componentes";
import { Ilustracao } from "../../design/Ilustracoes";
import { useClinicasPorId } from "../pedidos/nomesClinicas";

const ROTULO_INTERESSE = { registrado: "Interesse registrado", confirmado: "Confirmada para você", nao_selecionado: "Outra pessoa foi escolhida", retirado: "Interesse retirado" } as const;

/** Vaga liberada (design P4). Demonstrar interesse NÃO é agendar: a clínica confirma uma pessoa. */
export function VagasDoPedido() {
  const { id = "" } = useParams();
  const { api } = useSessao();
  const qc = useQueryClient();
  const navegar = useNavigate();
  const clinicas = useClinicasPorId();
  const pedido = useQuery({ queryKey: ["solicitacao", id], queryFn: () => api.dados(api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } })) });
  const clinicaId = pedido.data?.clinica_id;
  const clinica = clinicaId ? clinicas.get(clinicaId) : undefined;
  const vagas = useQuery({
    queryKey: ["vagas", clinicaId],
    enabled: !!clinicaId,
    queryFn: () => api.dados(api.cliente.GET("/vagas", { params: { query: { clinica_id: clinicaId } } })),
  });
  const interesse = useMutation({
    mutationFn: (vagaId: string) => api.dados(api.cliente.POST("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: vagaId } }, body: { solicitacao_id: id } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["vagas"] }), qc.invalidateQueries({ queryKey: ["solicitacao", id] }), qc.invalidateQueries({ queryKey: ["solicitacoes"] })]),
  });

  const itens = vagas.data?.itens ?? [];
  const abertas = itens.filter((v) => v.estado === "aberta" && !v.interesse);
  const comInteresse = itens.filter((v) => v.interesse);
  const erro = pedido.isError ? mensagemDe(pedido.error) : vagas.isError ? mensagemDe(vagas.error) : null;

  if (erro) {
    return (
      <div className="d-tela"><main className="d-corpo">
        <Voltar para={`/pedidos/${id}`}>Voltar ao pedido</Voltar>
        <div className="d-aviso d-aviso--perigo" role="alert"><b>{erro}</b></div>
        <Btn onClick={() => { void pedido.refetch(); void vagas.refetch(); }}>Tentar de novo</Btn>
      </main></div>
    );
  }
  if (pedido.isPending || vagas.isPending) return <div className="d-tela"><main className="d-corpo"><p role="status" className="d-small">Carregando…</p></main></div>;

  const vaga = abertas[0];
  if (!vaga) {
    return (
      <div className="d-tela">
        <main className="d-corpo d-corpo--centro">
          <Ilustracao nome="vagaPreenchida" texto="Relógio com o sol se pondo" />
          <h1 className="d-h1">{comInteresse.length ? "Interesse enviado" : "Nenhuma vaga agora"}</h1>
          <p className="d-p d-p--grande">
            {comInteresse.length
              ? comInteresse.map((v) => `${dataHora(v.inicio)}: ${ROTULO_INTERESSE[v.interesse!]}.`).join(" ")
              : "Esta clínica não informou vagas agora. Seu pedido continua ativo."}
          </p>
          {comInteresse.length > 0 && <div className="d-aviso d-aviso--14">Ainda não é reserva. A clínica confirma.</div>}
          <div className="d-fim">
            <BtnLink to={`/pedidos/${id}`}>Ver meu pedido</BtnLink>
            <BtnLink variante="outline" to="/clinicas">Ver outras clínicas</BtnLink>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="d-tela d-tela--teal">
      <main className="d-corpo d-corpo--24" style={{ padding: "28px 20px 20px" }}>
        <div className="d-vaga-topo"><Ilustracao nome="vagaSol" /><span>Surgiu uma vaga</span></div>
        <h1 className="d-h1 d-h1--30 d-h1--claro" style={{ lineHeight: 1.2 }}>Surgiu um horário na clínica que você acompanha. Tem interesse?</h1>
        <section className="d-painel" aria-label="Vaga">
          <div className="d-small">{clinica?.nome ?? "Clínica"}</div>
          <div className="d-grande">{quando(vaga.inicio)}</div>
          <div className="d-small">{rotuloEspecialidade(vaga.especialidade)}</div>
        </section>
        {interesse.isError && <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(interesse.error)}</b></div>}
        <div className="d-fim" style={{ marginTop: 0 }}>
          <Btn aria-busy={interesse.isPending || undefined} variante="escuro" disabled={interesse.isPending} onClick={() => interesse.mutate(vaga.id)}>{interesse.isPending ? "Enviando…" : "Tenho interesse"}</Btn>
          <Btn variante="claro" className="d-btn--lg" onClick={() => navegar(`/pedidos/${id}`)}>Não consigo nesse horário</Btn>
          {clinica && <BtnTel variante="fantasma" numero={clinica.telefone}>Preciso falar por telefone</BtnTel>}
        </div>
        <div className="d-aviso d-aviso--tinta" style={{ marginTop: "auto" }}>Ainda não é reserva. A clínica confirma.</div>
      </main>
    </div>
  );
}
