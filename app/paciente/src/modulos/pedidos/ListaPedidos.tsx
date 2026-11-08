import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao } from "@uhealth/api-client";
import { Btn, BtnLink, Carregando, Chip, LinhaSamu } from "../../design/Componentes";
import type { NomeIcone } from "../../design/Icone";
import { Ilustracao } from "../../design/Ilustracoes";
import { useClinicasPorId } from "./nomesClinicas";

/** Estado do pedido: cor + ícone + texto (nunca só cor). */
function ChipEstado({ estado }: { estado: keyof typeof ESTADO_PEDIDO }) {
  const e = ESTADO_PEDIDO[estado];
  const tom = e.tom === "perigo" ? "danger" : e.tom === "aviso" ? "sun" : "ok";
  const icone: NomeIcone = estado === "agendada" || estado === "concluida" ? "confirmado" : estado === "indisponivel" ? "naoRecebe"
    : estado === "precisa_contato" ? "telefone" : "analise";
  return <Chip tom={tom} icone={icone}>{e.rotulo}</Chip>;
}

/** Meu pedido (aba): com um só pedido abre direto o acompanhamento; com vários, lista. */
export function ListaPedidos() {
  const { api } = useSessao();
  const clinicas = useClinicasPorId();
  const pedidos = useQuery({ queryKey: ["solicitacoes"], queryFn: () => api.dados(api.cliente.GET("/solicitacoes", {})) });
  const itens = pedidos.data?.itens ?? [];
  if (itens.length === 1) return <Navigate to={`/pedidos/${itens[0].id}`} replace />;

  return (
    <div className="d-tela">
      <main className="d-corpo">
        <h1 className="d-h1 d-h1--30">Meus pedidos</h1>
        {pedidos.isPending && <Carregando texto="Carregando seus pedidos…" />}
        {pedidos.isError && (
          <>
            <div className="d-aviso d-aviso--perigo" role="alert"><b>{mensagemDe(pedidos.error)}</b></div>
            <Btn onClick={() => void pedidos.refetch()}>Tentar de novo</Btn>
          </>
        )}
        {pedidos.data && itens.length === 0 && (
          <section className="d-vazio" aria-label="Nenhum pedido">
            <Ilustracao nome="semClinica" />
            <p className="d-p d-p--grande">Você ainda não enviou pedidos. Comece escolhendo uma clínica.</p>
            <BtnLink to="/clinicas">Buscar clínicas</BtnLink>
          </section>
        )}
        <ul className="d-lista">
          {itens.map((p) => (
            <li key={p.id}>
              <article className="d-card" aria-labelledby={`p-${p.id}`}>
                <h2 id={`p-${p.id}`} className="d-h2">{rotuloEspecialidade(p.especialidade)}</h2>
                <p className="d-small">{clinicas.get(p.clinica_id)?.nome ?? "Clínica"} · enviado em {dataHora(p.criado_em)}</p>
                <div className="d-chips"><ChipEstado estado={p.estado} /></div>
                <Link className="d-btn d-btn--outline d-btn--card" to={`/pedidos/${p.id}`}>Acompanhar pedido</Link>
              </article>
            </li>
          ))}
        </ul>
        <div className="d-fim"><LinhaSamu /></div>
      </main>
    </div>
  );
}
