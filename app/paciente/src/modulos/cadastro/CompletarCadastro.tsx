import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { mensagemDe, useSessao, type Perfil } from "@uhealth/api-client";
import { Btn, Voltar } from "../../design/Componentes";
import { Icone } from "../../design/Icone";

const CHAVE_ADIADO = "uh-cadastro-adiado";
export function cadastroAdiado(): boolean {
  try { return sessionStorage.getItem(CHAVE_ADIADO) === "1"; } catch { return false; }
}

type Transporte = "a_pe" | "onibus" | "metro" | "trem" | "carro";
type Turno = "manha" | "tarde" | "noite";
type Pref = "publica" | "privada" | "tanto_faz";
const TRANSPORTES: [Transporte, string][] = [["a_pe", "A pé"], ["onibus", "Ônibus"], ["metro", "Metrô"], ["trem", "Trem"], ["carro", "Carro"]];
const TURNOS: [Turno, string][] = [["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"]];
const PREFS: [Pref, string][] = [["publica", "Universidade pública"], ["privada", "Universidade particular"], ["tanto_faz", "Tanto faz"]];
const DISTANCIAS: [string, string][] = [["5", "Até 5 km"], ["10", "Até 10 km"], ["20", "Até 20 km"], ["", "Sem limite"]];
const formatarCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

function Marcar<T extends string>({ legenda, opcoes, valores, aoMudar }: { legenda: string; opcoes: [T, string][]; valores: T[]; aoMudar: (v: T[]) => void }) {
  return (
    <fieldset className="d-campos">
      <legend>{legenda}</legend>
      <div className="d-grade2">
        {opcoes.map(([v, rotulo]) => {
          const on = valores.includes(v);
          return (
            <label key={v} className={`d-op d-op--m${on ? " d-op--on" : ""}`}>
              <input type="checkbox" checked={on} onChange={() => aoMudar(on ? valores.filter((x) => x !== v) : [...valores, v])} />
              {rotulo}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Radios<T extends string>({ legenda, nome, opcoes, valor, aoMudar }: { legenda: string; nome: string; opcoes: [T, string][]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <fieldset className="d-campos">
      <legend>{legenda}</legend>
      {opcoes.map(([v, rotulo]) => (
        <label key={v} className={`d-op d-op--m${valor === v ? " d-op--on" : ""}`}>
          <input type="radio" name={nome} checked={valor === v} onChange={() => aoMudar(v)} />
          {rotulo}
        </label>
      ))}
    </fieldset>
  );
}

/** Corpo completo do PUT /perfil (ele substitui o perfil): mantém o que já existe e troca endereço/preferências. */
export function corpoPerfil(p: Perfil, mudancas: Partial<Perfil>) {
  const base = { ...p, ...mudancas };
  return {
    cidade: base.cidade, uf: base.uf, contato_preferido: base.contato_preferido,
    socioeconomico: { informado: base.socioeconomico.informado, faixa_renda_familiar: base.socioeconomico.faixa_renda_familiar ?? null, prefiro_nao_informar: base.socioeconomico.prefiro_nao_informar },
    acessibilidade: base.acessibilidade, cep: base.cep ?? null, logradouro: base.logradouro ?? null, numero: base.numero ?? null,
    bairro: base.bairro ?? null, latitude: base.latitude ?? null, longitude: base.longitude ?? null,
    preferencia_instituicao: base.preferencia_instituicao ?? null, distancia_max_km: base.distancia_max_km ?? null,
    transportes: base.transportes ?? [], turnos: base.turnos ?? [], precisa_acessibilidade: base.precisa_acessibilidade ?? false,
    possui_deficiencia: base.possui_deficiencia ?? null,
    tipo_deficiencia: (base.tipo_deficiencia ?? null) as "visual" | "auditiva" | "motora" | "intelectual" | "tea" | "outra" | null,
    consentimento_dados_sensiveis: base.consentimento_dados_sensiveis ?? false,
  };
}

function Formulario({ perfil, aoTerminar, voltar }: { perfil: Perfil; aoTerminar: () => void; voltar?: string }) {
  const { api } = useSessao();
  const qc = useQueryClient();
  const [cep, setCep] = useState(perfil.cep ? formatarCep(perfil.cep) : "");
  const [numero, setNumero] = useState(perfil.numero ?? "");
  const [bairro, setBairro] = useState(perfil.bairro ?? "");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [pref, setPref] = useState<Pref>((perfil.preferencia_instituicao as Pref) ?? "tanto_faz");
  const [transportes, setTransportes] = useState<Transporte[]>((perfil.transportes ?? []) as Transporte[]);
  const [turnos, setTurnos] = useState<Turno[]>((perfil.turnos ?? []) as Turno[]);
  const [dist, setDist] = useState(perfil.distancia_max_km ? String(perfil.distancia_max_km) : "");
  const [acess, setAcess] = useState(!!perfil.precisa_acessibilidade);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: () => api.dados(api.cliente.PUT("/perfil", { body: corpoPerfil(perfil, {
      cep: cep.replace(/\D/g, ""), numero: numero.trim() || null, bairro: bairro.trim() || null,
      latitude: gps?.lat ?? null, longitude: gps?.lng ?? null, preferencia_instituicao: pref,
      distancia_max_km: dist ? Number(dist) : null, transportes, turnos, precisa_acessibilidade: acess,
    }) })),
    onSuccess: (dados) => { qc.setQueryData(["perfil"], dados); void qc.invalidateQueries({ queryKey: ["sugestoes"] }); aoTerminar(); },
  });
  const usarGps = () => navigator.geolocation?.getCurrentPosition(
    (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setErro(null); },
    () => setErro("Não conseguimos sua localização. Digite o CEP."), { timeout: 10000 });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (cep.replace(/\D/g, "").length !== 8) { setErro("Digite os 8 números do CEP."); return; }
    setErro(null);
    salvar.mutate();
  };

  return (
    <form className="d-corpo" style={{ gap: 16 }} onSubmit={enviar} noValidate>
      {voltar && <Voltar para={voltar}>Perfil</Voltar>}
      <h1 className="d-h1 d-h1--30">Seu endereço e preferências</h1>
      <p className="d-p">Usamos isso para sugerir a universidade mais perto e mais fácil para você.</p>
      <div className="d-campo">
        <label htmlFor="cad-cep">CEP</label>
        <input id="cad-cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCep(formatarCep(e.target.value))} />
      </div>
      <div className="d-linha2">
        <div className="d-campo">
          <label htmlFor="cad-num">Número</label>
          <input id="cad-num" value={numero} maxLength={12} autoComplete="address-line2" onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div className="d-campo">
          <label htmlFor="cad-bairro">Bairro</label>
          <input id="cad-bairro" value={bairro} maxLength={80} onChange={(e) => setBairro(e.target.value)} />
        </div>
      </div>
      <Btn variante="outline" onClick={usarGps}><Icone nome="local" />{gps ? "Localização do aparelho usada" : "Usar a localização do aparelho (mais preciso)"}</Btn>
      <Radios legenda="Onde prefere ser atendido?" nome="pref" opcoes={PREFS} valor={pref} aoMudar={setPref} />
      <Marcar legenda="Como você costuma ir? (pode marcar mais de um)" opcoes={TRANSPORTES} valores={transportes} aoMudar={setTransportes} />
      <Marcar legenda="Em que horário você pode ir?" opcoes={TURNOS} valores={turnos} aoMudar={setTurnos} />
      <Radios legenda="Até que distância?" nome="dist" opcoes={DISTANCIAS} valor={dist} aoMudar={setDist} />
      <label className={`d-op d-op--m${acess ? " d-op--on" : ""}`}>
        <input type="checkbox" checked={acess} onChange={(e) => setAcess(e.target.checked)} />
        Preciso de acesso sem degraus
      </label>
      {(erro || salvar.isError) && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{erro ?? mensagemDe(salvar.error)}</b></div>}
      <div className="d-fim d-fim--fixo">
        <Btn aria-busy={salvar.isPending || undefined} type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar"}</Btn>
        {!voltar && (
          <Btn variante="link" onClick={() => { try { sessionStorage.setItem(CHAVE_ADIADO, "1"); } catch { /* ok */ } aoTerminar(); }}>Fazer depois</Btn>
        )}
      </div>
    </form>
  );
}

/** Depois do cadastro (painel manual) ou pelo Perfil: endereço/território e preferências de atendimento. */
export function CompletarCadastro({ aoTerminar, voltar }: { aoTerminar: () => void; voltar?: string }) {
  const { api } = useSessao();
  const perfil = useQuery({ queryKey: ["perfil"], queryFn: () => api.dados(api.cliente.GET("/perfil", {})) });
  return (
    <div className={voltar ? "d-tela" : "d-casca"}>
      <div className="d-tela">
        <main className="d-corpo" style={{ padding: 0 }}>
          {perfil.isPending && <p role="status" className="d-small" style={{ padding: 20 }}>Carregando…</p>}
          {perfil.isError && <div className="d-aviso d-aviso--perigo" role="alert" style={{ margin: 20 }}><b>{mensagemDe(perfil.error)}</b></div>}
          {perfil.data && <Formulario perfil={perfil.data} aoTerminar={aoTerminar} voltar={voltar} />}
        </main>
      </div>
    </div>
  );
}
