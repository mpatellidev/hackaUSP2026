import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Aviso, Botao, Cartao, Campo, CampoSelecao, Carregando, Erro, Selo, Tabela, Vazio } from "@uhealth/ui";
import { VINCULO, hora, mensagemDe, rotuloEspecialidade, useSessao, type BlocoAgenda, type Profissional } from "@uhealth/api-client";
import { useClinicaAtual } from "../clinicaAtual";

const ESTADO_BLOCO = { disponivel: "Disponível", reservado: "Reservado", indisponivel: "Indisponível" } as const;
type Vinculo = Profissional["vinculo"];
const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

/** Profissionais fictícios, disponibilidade do dia e agenda. Cadastro e agenda: atendimento ou coordenação (a API barra os demais). */
export function Profissionais() {
  const { api } = useSessao();
  const { clinicaId } = useClinicaAtual();
  const qc = useQueryClient();
  const [dia, setDia] = useState(hoje());
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [vinculo, setVinculo] = useState<Vinculo>("docente");
  const [novoBloco, setNovoBloco] = useState<{ prof: string; inicio: string; fim: string } | null>(null);

  const clinica = useQuery({ queryKey: ["clinica", clinicaId], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: clinicaId } } })) });
  const lista = useQuery({ queryKey: ["profissionais", clinicaId], queryFn: () => api.dados(api.cliente.GET("/profissionais", { params: { query: { clinica_id: clinicaId } } })) });
  const dispo = useQuery({ queryKey: ["disponibilidade", clinicaId, dia], queryFn: () => api.dados(api.cliente.GET("/clinicas/{clinica_id}/disponibilidade", { params: { path: { clinica_id: clinicaId }, query: { data: dia } } })) });
  const recarregar = () => Promise.all(["profissionais", "disponibilidade"].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const esp = especialidade || clinica.data?.especialidades[0] || "";
  const criar = useMutation({
    mutationFn: () => api.dados(api.cliente.POST("/profissionais", { body: { nome_exibicao: nome.trim(), especialidade: esp, vinculo } })),
    onSuccess: () => { setNome(""); return recarregar(); },
  });
  const alternar = useMutation({
    mutationFn: (p: Profissional) => api.dados(api.cliente.PATCH("/profissionais/{profissional_id}", { params: { path: { profissional_id: p.id } }, body: { ativo: !p.ativo } })),
    onSuccess: recarregar,
  });
  const mudarBloco = useMutation({
    mutationFn: (v: { b: BlocoAgenda; estado: BlocoAgenda["estado"] }) => api.dados(api.cliente.PATCH("/agenda/{bloco_id}", { params: { path: { bloco_id: v.b.id } }, body: { estado: v.estado } })),
    onSuccess: recarregar,
  });
  const criarBloco = useMutation({
    mutationFn: (b: { prof: string; inicio: string; fim: string }) => api.dados(api.cliente.POST("/profissionais/{profissional_id}/agenda", {
      params: { path: { profissional_id: b.prof } }, body: { inicio: new Date(b.inicio).toISOString(), fim: new Date(b.fim).toISOString(), estado: "disponivel" },
    })),
    onSuccess: () => { setNovoBloco(null); return recarregar(); },
  });
  function aoCriar(e: FormEvent) { e.preventDefault(); criar.mutate(); }
  const erro = criar.error ?? alternar.error ?? mudarBloco.error ?? criarBloco.error;

  return (
    <>
      <h1>Profissionais e agenda</h1>
      <Aviso>Profissionais e horários fictícios (demonstração). Horário disponível não é vaga publicada nem agendamento.</Aviso>
      {erro && <Aviso tom="perigo">{mensagemDe(erro)}</Aviso>}

      <Cartao>
        <h2>Disponibilidade do dia</h2>
        <Campo rotulo="Dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        {dispo.isPending && <Carregando />}
        {dispo.isError && <Erro mensagem={mensagemDe(dispo.error)} aoTentar={() => dispo.refetch()} />}
        {dispo.data && dispo.data.profissionais.length === 0 && <Vazio>Nenhum profissional ativo.</Vazio>}
        <ul className="lista-cartoes">
          {dispo.data?.profissionais.map((p) => (
            <li key={p.id}>
              <Cartao>
                <p><strong>{p.nome_exibicao}</strong> · {rotuloEspecialidade(p.especialidade)}</p>
                <p>{p.disponiveis} horário(s) disponível(is) neste dia</p>
                {p.blocos.length === 0 && <p className="hint">Sem horários cadastrados neste dia.</p>}
                <ul className="lista-cartoes">
                  {p.blocos.map((b) => (
                    <li key={b.id} className="linha">
                      <span>{hora(b.inicio)}–{hora(b.fim)}</span>
                      <Selo tom={b.estado === "disponivel" ? "padrao" : "aviso"}>{ESTADO_BLOCO[b.estado]}</Selo>
                      <CampoSelecao rotulo="Mudar" value={b.estado} onChange={(e) => mudarBloco.mutate({ b, estado: e.target.value as BlocoAgenda["estado"] })} aria-label={`Estado do horário ${hora(b.inicio)}`}>
                        {Object.entries(ESTADO_BLOCO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                      </CampoSelecao>
                    </li>
                  ))}
                </ul>
                {novoBloco?.prof === p.id ? (
                  <form className="pilha" onSubmit={(e) => { e.preventDefault(); criarBloco.mutate(novoBloco); }}>
                    <Campo rotulo="Início" type="datetime-local" value={novoBloco.inicio} onChange={(e) => setNovoBloco({ ...novoBloco, inicio: e.target.value })} required />
                    <Campo rotulo="Fim" type="datetime-local" value={novoBloco.fim} onChange={(e) => setNovoBloco({ ...novoBloco, fim: e.target.value })} required />
                    <div className="linha"><Botao type="submit" disabled={criarBloco.isPending}>Salvar horário</Botao><Botao variante="outline" onClick={() => setNovoBloco(null)}>Cancelar</Botao></div>
                  </form>
                ) : <Botao variante="outline" onClick={() => setNovoBloco({ prof: p.id, inicio: `${dia}T09:00`, fim: `${dia}T10:00` })}>Adicionar horário</Botao>}
              </Cartao>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao>
        <h2>Cadastrar profissional</h2>
        <form className="pilha" onSubmit={aoCriar}>
          <Campo rotulo="Nome de exibição (fictício)" value={nome} minLength={2} maxLength={80} onChange={(e) => setNome(e.target.value)} required />
          <CampoSelecao rotulo="Especialidade" value={esp} onChange={(e) => setEspecialidade(e.target.value)}>
            {clinica.data?.especialidades.map((e) => <option key={e} value={e}>{rotuloEspecialidade(e)}</option>)}
          </CampoSelecao>
          <CampoSelecao rotulo="Vínculo" value={vinculo} onChange={(e) => setVinculo(e.target.value as Vinculo)}>
            {Object.entries(VINCULO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </CampoSelecao>
          <Botao type="submit" disabled={criar.isPending || nome.trim().length < 2}>Cadastrar</Botao>
        </form>
      </Cartao>

      {lista.data && (
        <Tabela legenda="Profissionais da clínica" chave={(p) => p.id} linhas={lista.data.itens} colunas={[
          { titulo: "Nome", celula: (p) => p.nome_exibicao },
          { titulo: "Especialidade", celula: (p) => rotuloEspecialidade(p.especialidade) },
          { titulo: "Vínculo", celula: (p) => VINCULO[p.vinculo] },
          { titulo: "Situação", celula: (p) => <Selo tom={p.ativo ? "padrao" : "aviso"}>{p.ativo ? "Ativo" : "Inativo"}</Selo> },
          { titulo: "Ações", celula: (p) => <Botao variante="outline" disabled={alternar.isPending} onClick={() => alternar.mutate(p)}>{p.ativo ? "Desativar" : "Reativar"}</Botao> },
        ]} />
      )}
    </>
  );
}
