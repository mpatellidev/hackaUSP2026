import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Aviso, Botao, Cartao, Campo, CampoSelecao, Carregando, Erro, Selo, Vazio } from "@uhealth/ui";
import { ESTADO_PEDIDO, dataHora, mensagemDe, rotuloEspecialidade, useSessao, type Vaga } from "@uhealth/api-client";
import { useClinicaAtual } from "../clinicaAtual";

const ESTADO_VAGA = { aberta: "Aberta", preenchida: "Preenchida", cancelada: "Cancelada" } as const;

export function Vagas() {
  const { api } = useSessao();
  const { clinicaId } = useClinicaAtual();
  const qc = useQueryClient();
  const clinica = useQuery({ queryKey: ["clinica", clinicaId], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: clinicaId } } })) });
  const profissionais = useQuery({ queryKey: ["profissionais", clinicaId, "ativos"], queryFn: () => api.dados(api.cliente.GET("/profissionais", { params: { query: { clinica_id: clinicaId, ativos: true } } })) });
  const vagas = useQuery({ queryKey: ["vagas", clinicaId], queryFn: () => api.dados(api.cliente.GET("/vagas", { params: { query: { clinica_id: clinicaId } } })) });

  const [especialidade, setEspecialidade] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [profissional, setProfissional] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  const esp = especialidade || clinica.data?.especialidades[0] || "";
  const deste = (profissionais.data?.itens ?? []).filter((p) => p.especialidade === esp);

  const publicar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/vagas", {
      body: { especialidade: esp, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), profissional_id: profissional || null },
    })),
    onSuccess: () => { setInicio(""); setFim(""); setProfissional(""); return qc.invalidateQueries({ queryKey: ["vagas"] }); },
  });
  function aoPublicar(e: FormEvent) { e.preventDefault(); publicar.mutate(); }

  return (
    <>
      <h1>Vagas</h1>
      <Aviso>Vaga não é agendamento. Pacientes demonstram interesse e a clínica confirma uma única pessoa.</Aviso>

      <Cartao>
        <h2>Publicar vaga</h2>
        {clinica.isPending && <Carregando />}
        {clinica.isError && <Erro mensagem={mensagemDe(clinica.error)} aoTentar={() => clinica.refetch()} />}
        {clinica.data && (
          <form className="pilha form-duas" onSubmit={aoPublicar}>
            <CampoSelecao rotulo="Especialidade" value={esp} onChange={(e) => { setEspecialidade(e.target.value); setProfissional(""); }}>
              {clinica.data.especialidades.map((e) => <option key={e} value={e}>{rotuloEspecialidade(e)}</option>)}
            </CampoSelecao>
            <Campo rotulo="Início" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            <Campo rotulo="Fim" type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} required />
            <CampoSelecao rotulo="Profissional (opcional)" value={profissional} onChange={(e) => setProfissional(e.target.value)}>
              <option value="">Sem profissional definido</option>
              {deste.map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
            </CampoSelecao>
            {publicar.isError && <Aviso tom="perigo">{mensagemDe(publicar.error)}</Aviso>}
            <Botao type="submit" disabled={publicar.isPending || !inicio || !fim}>{publicar.isPending ? "Publicando…" : "Publicar vaga"}</Botao>
          </form>
        )}
      </Cartao>

      {vagas.isPending && <Carregando />}
      {vagas.isError && <Erro mensagem={mensagemDe(vagas.error)} aoTentar={() => vagas.refetch()} />}
      {vagas.data && vagas.data.itens.length === 0 && <Vazio>Nenhuma vaga publicada ainda.</Vazio>}
      <ul className="lista-cartoes">
        {vagas.data?.itens.map((v) => (
          <li key={v.id}>
            <Cartao>
              <h2>{rotuloEspecialidade(v.especialidade)}</h2>
              <p>{dataHora(v.inicio)} até {dataHora(v.fim)}</p>
              <div className="etiquetas">
                <Selo tom={v.estado === "aberta" ? "padrao" : "aviso"}>{ESTADO_VAGA[v.estado]}</Selo>
                {v.profissional_id && <Selo>{profissionais.data?.itens.find((p) => p.id === v.profissional_id)?.nome_exibicao ?? "Profissional"}</Selo>}
                <Selo>{v.interesses_registrados ?? 0} interesse(s)</Selo>
              </div>
              <Botao variante="outline" onClick={() => setAberta(aberta === v.id ? null : v.id)}>{aberta === v.id ? "Ocultar interessados" : "Ver interessados"}</Botao>
              {aberta === v.id && <Interessados vaga={v} />}
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}

function Interessados({ vaga }: { vaga: Vaga }) {
  const { api } = useSessao();
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["vaga", vaga.id, "interesses"], queryFn: () => api.dados(api.cliente.GET("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: vaga.id } } })) });
  const confirmar = useMutation({
    mutationFn: (interesse_id: string) => api.dados(api.cliente.POST("/vagas/{vaga_id}/confirmar", { params: { path: { vaga_id: vaga.id } }, body: { interesse_id } })),
    onSuccess: () => Promise.all(["vagas", "vaga", "agendamentos", "solicitacoes", "fila"].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });

  if (lista.isPending) return <Carregando />;
  if (lista.isError) return <Erro mensagem={mensagemDe(lista.error)} aoTentar={() => lista.refetch()} />;
  return (
    <div className="pilha">
      <p className="hint">{lista.data.aviso}</p>
      {lista.data.itens.length === 0 && <Vazio>Ninguém demonstrou interesse ainda.</Vazio>}
      {confirmar.isError && <Aviso tom="perigo">{mensagemDe(confirmar.error)}</Aviso>}
      {confirmar.isSuccess && <Aviso>{confirmar.data.aviso}</Aviso>}
      <ul className="lista-cartoes">
        {lista.data.itens.map((i) => (
          <li key={i.id}>
            <Cartao>
              <p><strong>#{i.posicao_sugerida} · {i.paciente_nome_exibicao}</strong> · pedido {ESTADO_PEDIDO[i.pedido_estado].rotulo.toLowerCase()}</p>
              <div className="etiquetas">
                {i.urgencia_avaliada && <Selo tom="perigo">Urgência avaliada</Selo>}
                <Selo>Pontuação {i.score.toFixed(1)}</Selo>
                <Selo tom={i.estado === "confirmado" ? "padrao" : "aviso"}>{i.estado.replace(/_/g, " ")}</Selo>
              </div>
              {i.estado === "registrado" && vaga.estado === "aberta" && (
                <Botao disabled={confirmar.isPending} onClick={() => confirmar.mutate(i.id)}>Confirmar esta pessoa</Botao>
              )}
            </Cartao>
          </li>
        ))}
      </ul>
    </div>
  );
}
