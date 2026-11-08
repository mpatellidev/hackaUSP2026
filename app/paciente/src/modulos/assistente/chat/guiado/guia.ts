// Conversa guiada: o mesmo que as telas do app fazem, mas em forma de conversa.
// Cada passo mostra mensagens e opções (botões) que vêm do banco, e chama os MESMOS endpoints das telas.
// Não usa IA: é previsível e funciona também no modo mock. Texto livre fora de um passo vai para a IA.
//
// Regras do produto mantidas: nada é enviado sem a confirmação do paciente; interesse não é reserva;
// "agendado" só aparece quando o backend confirmou; o texto de emergência (SAMU 192) é estático, sem rede.
import {
  CRITERIO_ALTERNATIVA, CUSTO, ESTADO_PEDIDO, PUBLICO, dataHora, mensagemDe, rotuloEspecialidade,
  type Api, type Clinica, type PublicoAlvo,
} from "@uhealth/api-client";
import { TEXTO_EMERGENCIA } from "@uhealth/ui";
import { descreverEvento } from "../../../pedidos/Historico";

export interface OpcaoGuia {
  label: string;
  value: string;
}

export interface PassoGuia {
  mensagens: { texto: string; erro?: boolean }[];
  opcoes: OpcaoGuia[];
  titulo?: string;
  /** se existir, a próxima mensagem digitada responde este passo (e não vai para a IA) */
  texto?: { placeholder: string };
}

/** Valores de opção que começam com "@" são ações da conversa guiada (o resto vai para a IA). */
export const ehAcaoGuiada = (valor: string) => valor.startsWith("@");

const op = (label: string, ...partes: string[]): OpcaoGuia => ({ label, value: `@${partes.map(encodeURIComponent).join(":")}` });
const INICIO = op("Voltar ao início", "inicio");
const ATIVOS = ["enviada", "em_analise", "precisa_contato", "aguardando_confirmacao"];
const NOTAS: [number, string][] = [[1, "Muito ruim"], [2, "Ruim"], [3, "Regular"], [4, "Bom"], [5, "Muito bom"]];
const PARA_QUEM = { mim: "Para mim", outra: "Para outra pessoa" } as const;
const ROTULO_INTERESSE = { registrado: "interesse registrado", confirmado: "confirmada para você", nao_selecionado: "outra pessoa foi escolhida", retirado: "interesse retirado" } as const;
const nomeCurto = (nome: string) => nome.replace(/^Clínica-Escola /, "Clínica ");

function passo(mensagens: string | string[], opcoes: OpcaoGuia[], extra: Partial<PassoGuia> = {}): PassoGuia {
  return { mensagens: (Array.isArray(mensagens) ? mensagens : [mensagens]).map((texto) => ({ texto })), opcoes, ...extra };
}

interface Rascunho {
  clinica: Clinica;
  paraQuem?: keyof typeof PARA_QUEM;
  especialidade?: string;
  publico?: PublicoAlvo;
  motivo?: string;
  horarios?: Map<string, string>;
  horario?: { vaga_id: string; inicio: string } | "sem";
  nomePaciente?: string;
  telefone?: string;
}

export interface OpcoesGuia {
  /** nome de quem está logado (paciente quando o pedido é "para mim") */
  nomeUsuario?: string;
  /** localização do aparelho; trocável nos testes */
  localizar?: () => Promise<{ lat: number; lng: number }>;
}

function localizarPeloNavegador(): Promise<{ lat: number; lng: number }> {
  return new Promise((ok, falha) => {
    if (!("geolocation" in navigator)) { falha(new Error("sem geolocalização")); return; }
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), falha,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  });
}

export class Guia {
  private rascunho: Rascunho | null = null;
  private endereco: { cep?: string; preferencia?: string; turnos?: string[]; transportes?: string[] } = {};
  private esperando: ((texto: string) => Promise<PassoGuia>) | null = null;

  private readonly localizar: () => Promise<{ lat: number; lng: number }>;

  constructor(private readonly api: Api, private readonly aoMudarDados: () => void = () => {}, private readonly opcoes: OpcoesGuia = {}) {
    this.localizar = opcoes.localizar ?? localizarPeloNavegador;
  }

  /** true se o passo atual espera uma resposta escrita */
  esperaTexto(): boolean {
    return this.esperando !== null;
  }

  /** Cancela a espera por texto (ex.: a pessoa tocou em outra opção). */
  pararDeEsperar() {
    this.esperando = null;
  }

  async responderTexto(texto: string): Promise<PassoGuia> {
    const continuar = this.esperando;
    this.esperando = null;
    if (!continuar) return this.inicio();
    try { return await continuar(texto); } catch (e) { return this.erro(e); }
  }

  async executar(valor: string): Promise<PassoGuia> {
    this.esperando = null;
    const [acao, ...args] = valor.slice(1).split(":").map(decodeURIComponent);
    try {
      switch (acao) {
        case "pedir": case "trilha": return await this.pedir();
        case "emergencia": return await this.emergencia();
        case "receitas": return await this.receitas();
        case "onde": return this.ondeProcurar();
        case "atendente": return this.atendentePergunta();
        case "atendente_ok": return await this.atendente();
        case "remarcar": return await this.remarcar(args[0]);
        case "remarcar_vaga": return this.remarcarConfirmar(args[0], args[1], args[2]);
        case "remarcar_ok": return await this.remarcarEnviar(args[0], args[1]);
        case "encaminhamentos": return await this.encaminhamentos();
        case "enc_pergunta": return await this.encaminhamentoPergunta(args[0], args[1] === "1");
        case "enc_ok": return await this.encaminhamentoResponder(args[0], args[1] === "1");
        case "prioridade": return await this.prioridade();
        case "avisos": return await this.avisos();
        case "avisos_lidos": return await this.avisosLidos();
        case "endereco": return this.perguntarEnderecoCep();
        case "end_pref": return this.enderecoPreferencia(args[0]);
        case "end_turno": return this.enderecoTurno(args[0]);
        case "end_transp": return this.enderecoTransporte(args[0]);
        case "end_ok": return await this.enderecoSalvar();
        case "local_gps": return await this.localGps();
        case "local_cep": return this.perguntarCep();
        case "cidade": return await this.cidade(args[0]);
        case "horario": return await this.horario(args[0]);
        case "clinica": return await this.clinica(args[0]);
        case "quem": return this.quem(args[0] as keyof typeof PARA_QUEM);
        case "esp": return this.especialidade(args[0]);
        case "pub": return this.publico(args[0] as PublicoAlvo);
        case "enviar": return await this.enviar();
        case "corrigir": return this.corrigir();
        case "pedidos": return await this.pedidos();
        case "pedido": return await this.pedido(args[0]);
        case "historico": return await this.historico(args[0]);
        case "vagas": return await this.vagas(args[0]);
        case "vaga": return await this.vaga(args[0], args[1]);
        case "interesse": return await this.interesse(args[0], args[1]);
        case "alternativas": return await this.alternativas(args[0]);
        case "alt": return await this.confirmarEncaminhar(args[0], args[1]);
        case "encaminhar": return await this.encaminhar(args[0], args[1]);
        case "agenda": return await this.agenda();
        case "cancelar_pergunta": return this.cancelarPergunta(args[0]);
        case "cancelar": return await this.cancelar(args[0]);
        case "alertas": return await this.alertas();
        case "alertas_pref": return await this.alertasPreferencia(args[0] === "1");
        case "alertas_lidos": return await this.alertasLidos();
        case "urgencia": return await this.emergencia();
        case "avaliar": return await this.avaliar(args[0]);
        case "nota": return this.nota(args[0], Number(args[1]));
        case "avaliar_enviar": return await this.avaliarEnviar(args[0], Number(args[1]), "");
        default: return this.inicio();
      }
    } catch (e) {
      return this.erro(e, valor);
    }
  }

  inicio(): PassoGuia {
    return passo("O que você quer fazer?", [
      op("Marcar atendimento", "pedir"),
      op("Ver meus pedidos", "pedidos"),
      op("Horário marcado (remarcar ou cancelar)", "agenda"),
      op("Encaminhamentos", "encaminhamentos"),
      op("Minha prioridade", "prioridade"),
      op("Avisos", "avisos"),
      op("Meu endereço e preferências", "endereco"),
      op("Minhas receitas", "receitas"),
      op("Emergência no dente", "emergencia"),
      op("Falar com uma pessoa", "atendente"),
    ], { titulo: "O que você quer fazer" });
  }

  // ---------- emergência: clínica de urgência aberta mais próxima (não cria agendamento) ----------
  private async emergencia(): Promise<PassoGuia> {
    const graves = `Sinais graves (sangramento que não para, inchaço que dificulta respirar ou engolir, febre alta): vá a um pronto-socorro ou ligue 192 (SAMU). ${TEXTO_EMERGENCIA}`;
    let e;
    try {
      e = await this.api.dados(this.api.cliente.GET("/emergencia", {}));
    } catch {
      return passo([graves, "Não consegui buscar as clínicas agora. Se for grave, ligue 192."], [INICIO]);
    }
    const linha = (x: NonNullable<typeof e.principal>) => `${x.clinica.nome}${x.distancia_km != null ? ` (${x.distancia_km.toLocaleString("pt-BR")} km)` : ""}\n`
      + `${x.clinica.endereco ?? ""}, ${x.clinica.bairro ?? ""} · aberta ${x.aberta_ate === "24 horas" ? "24 horas" : `até ${x.aberta_ate}`}\nTelefone: ${x.clinica.telefone}`;
    return passo([
      graves,
      e.principal ? `Clínica de urgência aberta mais perto:\n${linha(e.principal)}` : e.aviso,
      ...(e.alternativas.length ? [`Outras opções:\n${e.alternativas.map((a) => `• ${linha(a)}`).join("\n")}`] : []),
      "Isto não marca consulta. Ligue antes de ir, se puder. Na tela Emergência há os botões Ligar e Como chegar.",
    ], [op("Falar com uma pessoa", "atendente"), INICIO], { titulo: "Emergência" });
  }

  // ---------- receitas: mostra e explica sem mudar nada ----------
  private async receitas(): Promise<PassoGuia> {
    const l = await this.api.dados(this.api.cliente.GET("/receitas", {}));
    if (l.itens.length === 0) return passo("Você ainda não tem receita. Quando a clínica emitir, aviso aqui.", [INICIO]);
    const textos = l.itens.slice(0, 3).map((rec) => `Receita de ${rec.data_emissao ? dataHora(rec.data_emissao).slice(0, 10) : ""} (${rec.instituicao}):\n`
      + rec.itens.map((i) => `• ${i.medicamento}: use ${i.dosagem} (${i.via}), ${i.frequencia}, por ${i.duracao}.`).join("\n")
      + (rec.orientacoes ? `\nOrientações: ${rec.orientacoes}` : "") + `\nAssinada por ${rec.assinante_nome} (${rec.assinante_cro}).`);
    return passo([...textos, "Siga como está escrito e não mude a dose. Dúvida sobre o remédio: fale com a clínica que receitou. O PDF está em Meu cuidado > Receitas."],
      [op("Falar com uma pessoa", "atendente"), INICIO]);
  }

  // ---------- falar com uma pessoa (confirma antes de avisar a equipe) ----------
  private atendentePergunta(): PassoGuia {
    return passo("Vou avisar a equipe da sua clínica que você quer falar com uma pessoa. Ela vai ver seu nome. Pode ser?", [
      op("Sim, pode avisar", "atendente_ok"), INICIO]);
  }

  private async atendente(): Promise<PassoGuia> {
    const r = await this.api.dados(this.api.cliente.POST("/atendimento-humano", { body: {} }));
    const tel = r.contatos.map((c) => `• ${c.clinica_nome}: ${c.telefone}`).join("\n");
    return passo([r.mensagem, ...(tel ? [`Telefones:\n${tel}`] : [])], [INICIO]);
  }

  // ---------- encaminhamentos ----------
  private async encaminhamentos(): Promise<PassoGuia> {
    const lista = await this.api.dados(this.api.cliente.GET("/referenciamentos", {}));
    if (lista.itens.length === 0) return passo("Você não tem encaminhamento. Seu tratamento segue na clínica atual.", [INICIO]);
    const pend = lista.itens.find((x) => x.estado === "aguardando_paciente");
    const linhas = lista.itens.map((x) => `• ${x.clinica_destino.nome}: ${x.estado === "aguardando_paciente" ? "esperando sua resposta" : x.estado === "aceito" ? "confirmado" : "recusado"}`);
    if (!pend) return passo(`Seus encaminhamentos:\n${linhas.join("\n")}`, [op("Ver meus pedidos", "pedidos"), INICIO]);
    return passo([
      `${pend.motivo_simples} Por isso encontramos outra universidade para continuar: ${pend.clinica_destino.nome}`
        + (pend.clinica_destino.endereco ? ` (${pend.clinica_destino.endereco}, ${pend.clinica_destino.bairro})` : "") + ".",
      pend.horario_inicio ? `Separamos o horário de ${dataHora(pend.horario_inicio)}.` : "A clínica vai ligar para combinar o horário.",
      "Seu diagnóstico vai junto, sem repetir exames. Você quer ir para essa clínica?",
    ], [op("Sim, quero ir", "enc_pergunta", pend.id, "1"), op("Prefiro ficar na clínica atual", "enc_pergunta", pend.id, "0"), INICIO],
    { titulo: "Encaminhamento" });
  }

  private async encaminhamentoPergunta(id: string, aceitar: boolean): Promise<PassoGuia> {
    return passo(aceitar
      ? "Confirmando: você autoriza a nova clínica a ver o diagnóstico já feito e pedimos o horário separado. Só é consulta marcada quando a clínica confirmar. Posso confirmar?"
      : "Confirmando: você continua na clínica atual e o encaminhamento é cancelado. Posso confirmar?",
    [op("Sim, confirmar", "enc_ok", id, aceitar ? "1" : "0"), op("Voltar", "encaminhamentos")]);
  }

  private async encaminhamentoResponder(id: string, aceitar: boolean): Promise<PassoGuia> {
    const r = await this.api.dados(this.api.cliente.POST(aceitar ? "/referenciamentos/{ref_id}/aceitar" : "/referenciamentos/{ref_id}/recusar", { params: { path: { ref_id: id } } }));
    this.aoMudarDados();
    return passo(aceitar ? `Pronto! Encaminhamento para ${r.clinica_destino.nome} confirmado. A clínica confirma o horário.` : "Tudo bem. Você continua na clínica atual.",
      [...(r.solicitacao_destino_id ? [op("Acompanhar o novo pedido", "pedido", r.solicitacao_destino_id)] : []), INICIO]);
  }

  // ---------- prioridade (educativo) e avisos ----------
  private async prioridade(): Promise<PassoGuia> {
    const s = await this.api.dados(this.api.cliente.GET("/meu-score", {}));
    const partes = s.componentes.map((c) => `• ${c.titulo}: ${c.pontos > 0 ? "+" : ""}${c.pontos.toLocaleString("pt-BR")}. ${c.explicacao}`);
    return passo([
      `Seus pontos agora: ${s.score.toLocaleString("pt-BR")}.${s.urgencia_avaliada ? " Seu caso foi avaliado como urgente: você vem antes na fila." : ""}`,
      `Como é calculado:\n${partes.join("\n")}`,
      `${s.aviso} ${s.dicas.join(" ")}`,
    ], [INICIO]);
  }

  private async avisos(): Promise<PassoGuia> {
    const l = await this.api.dados(this.api.cliente.GET("/notificacoes", {}));
    if (l.itens.length === 0) return passo("Nenhum aviso por enquanto.", [INICIO]);
    const linhas = l.itens.slice(0, 5).map((n) => `• ${dataHora(n.criado_em)}: ${n.titulo}. ${n.texto}`);
    return passo(`Seus avisos:\n${linhas.join("\n")}`, [
      ...(l.nao_lidas ? [op("Marcar como lidos", "avisos_lidos")] : []),
      ...(l.itens.some((n) => n.referencia?.startsWith("referenciamento:")) ? [op("Ver encaminhamento", "encaminhamentos")] : []),
      INICIO]);
  }

  private async avisosLidos(): Promise<PassoGuia> {
    const l = await this.api.dados(this.api.cliente.GET("/notificacoes", {}));
    for (const n of l.itens.filter((x) => !x.lida)) {
      await this.api.dados(this.api.cliente.POST("/notificacoes/{notificacao_id}/lida", { params: { path: { notificacao_id: n.id } } }));
    }
    this.aoMudarDados();
    return passo("Pronto, avisos marcados como lidos.", [INICIO]);
  }

  // ---------- endereço e preferências (cadastro pela conversa) ----------
  private perguntarEnderecoCep(aviso?: string): PassoGuia {
    this.endereco = {};
    this.esperando = (t) => Promise.resolve(this.enderecoCep(t));
    return passo([...(aviso ? [aviso] : []), "Para achar a universidade mais perto, qual é o seu CEP? Escreva os 8 números."],
      [INICIO], { texto: { placeholder: "00000-000" } });
  }

  private enderecoCep(texto: string): PassoGuia {
    const d = texto.replace(/\D/g, "");
    if (d.length !== 8) return this.perguntarEnderecoCep("O CEP tem 8 números. Tente de novo.");
    this.endereco.cep = d;
    return passo("Você prefere universidade pública ou particular?", [
      op("Pública", "end_pref", "publica"), op("Particular", "end_pref", "privada"), op("Tanto faz", "end_pref", "tanto_faz")]);
  }

  private enderecoPreferencia(p: string): PassoGuia {
    this.endereco.preferencia = p;
    return passo("Em que horário você consegue ir?", [
      op("De manhã", "end_turno", "manha"), op("À tarde", "end_turno", "tarde"), op("À noite", "end_turno", "noite"), op("Qualquer horário", "end_turno", "")]);
  }

  private enderecoTurno(t: string): PassoGuia {
    this.endereco.turnos = t ? [t] : [];
    return passo("Como você costuma ir?", [
      op("Ônibus", "end_transp", "onibus"), op("Metrô", "end_transp", "metro"), op("Trem", "end_transp", "trem"),
      op("Carro", "end_transp", "carro"), op("A pé", "end_transp", "a_pe"), op("Tanto faz", "end_transp", "")]);
  }

  private enderecoTransporte(t: string): PassoGuia {
    this.endereco.transportes = t ? [t] : [];
    const e = this.endereco;
    const nomes: Record<string, string> = { publica: "pública", privada: "particular", tanto_faz: "tanto faz", manha: "manhã", tarde: "tarde", noite: "noite",
      onibus: "ônibus", metro: "metrô", trem: "trem", carro: "carro", a_pe: "a pé" };
    return passo(`Vou salvar: CEP ${e.cep!.slice(0, 5)}-${e.cep!.slice(5)}, universidade ${nomes[e.preferencia!]}, `
      + `horário ${e.turnos!.length ? nomes[e.turnos![0]] : "qualquer"}, indo de ${e.transportes!.length ? nomes[e.transportes![0]] : "qualquer jeito"}. Posso salvar?`,
    [op("Sim, salvar", "end_ok"), op("Começar de novo", "endereco"), INICIO]);
  }

  private async enderecoSalvar(): Promise<PassoGuia> {
    const e = this.endereco;
    if (!e.cep) return this.perguntarEnderecoCep();
    const p = await this.api.dados(this.api.cliente.GET("/perfil", {}));
    await this.api.dados(this.api.cliente.PUT("/perfil", { body: {
      cidade: p.cidade, uf: p.uf, contato_preferido: p.contato_preferido,
      socioeconomico: { informado: p.socioeconomico.informado, faixa_renda_familiar: p.socioeconomico.faixa_renda_familiar ?? null, prefiro_nao_informar: p.socioeconomico.prefiro_nao_informar },
      acessibilidade: p.acessibilidade, cep: e.cep, numero: p.numero ?? null, bairro: p.bairro ?? null, logradouro: p.logradouro ?? null,
      latitude: null, longitude: null, preferencia_instituicao: e.preferencia as "publica" | "privada" | "tanto_faz",
      distancia_max_km: p.distancia_max_km ?? null, turnos: e.turnos as ("manha" | "tarde" | "noite")[],
      transportes: e.transportes as ("a_pe" | "onibus" | "metro" | "trem" | "carro")[], precisa_acessibilidade: p.precisa_acessibilidade ?? false,
      possui_deficiencia: p.possui_deficiencia ?? null, consentimento_dados_sensiveis: p.consentimento_dados_sensiveis ?? false,
      tipo_deficiencia: (p.tipo_deficiencia ?? null) as "visual" | "auditiva" | "motora" | "intelectual" | "tea" | "outra" | null,
    } }));
    this.aoMudarDados();
    return passo("Pronto, salvei. Agora posso sugerir a universidade mais perto e mais fácil para você.", [op("Marcar atendimento", "pedir"), INICIO]);
  }

  private erro(e: unknown, tentarDeNovo?: string): PassoGuia {
    return {
      mensagens: [{ texto: mensagemDe(e), erro: true }],
      opcoes: [...(tentarDeNovo ? [{ label: "Tentar de novo", value: tentarDeNovo }] : []), INICIO],
    };
  }

  // ---------- consultas (as mesmas das telas) ----------
  private async listarClinicas(cidade?: string) {
    return (await this.api.dados(this.api.cliente.GET("/clinicas", { params: { query: { cidade: cidade || undefined } } }))).itens;
  }
  private async nomesClinicas(): Promise<Map<string, Clinica>> {
    return new Map((await this.listarClinicas()).map((c) => [c.id, c]));
  }
  private async verPedido(id: string) {
    return this.api.dados(this.api.cliente.GET("/solicitacoes/{solicitacao_id}", { params: { path: { solicitacao_id: id } } }));
  }
  private async listarPedidos() {
    return (await this.api.dados(this.api.cliente.GET("/solicitacoes", {}))).itens;
  }

  // ---------- pedir atendimento (mesmos passos da tela) ----------
  /** Agendar: com endereço no perfil, as clínicas comparadas (distância, valor, próximos horários); sem, onde procurar. */
  private async pedir(): Promise<PassoGuia> {
    this.rascunho = null;
    const perfil = await this.api.dados(this.api.cliente.GET("/perfil", {}));
    if (perfil.latitude == null) return this.ondeProcurar();
    const s = await this.api.dados(this.api.cliente.GET("/universidades/sugestoes", {}));
    if (s.itens.length === 0) return passo("Nenhuma clínica dentro das suas preferências agora.", [op("Buscar de outro jeito", "onde"), op("Mudar preferências", "endereco"), INICIO]);
    const linhas = s.itens.slice(0, 4).map((i) => `• ${i.clinica.nome}${i.distancia_km != null ? ` (${i.distancia_km.toLocaleString("pt-BR")} km)` : ""}: ${i.motivos.join(". ")}.`);
    return passo([`Sugeridas para você, da melhor para a pior:\n${linhas.join("\n")}`, "Qual delas você escolhe?"],
      [...s.itens.slice(0, 4).map((i) => op(i.clinica.nome, "clinica", i.clinica.id)), op("Buscar de outro jeito", "onde")], { titulo: "Escolha a clínica" });
  }

  private ondeProcurar(): PassoGuia {
    return passo("Vou achar as clínicas mais perto de você. Como prefere?", [
      op("Usar minha localização", "local_gps"),
      op("Digitar meu CEP", "local_cep"),
      op("Ver todas as clínicas", "cidade", ""),
      INICIO,
    ], { titulo: "Como achar as clínicas" });
  }

  private async localGps(): Promise<PassoGuia> {
    let pos: { lat: number; lng: number };
    try {
      pos = await this.localizar();
    } catch {
      return passo("Não consegui sua localização. Você pode digitar o CEP.", [op("Digitar meu CEP", "local_cep"), op("Ver todas as clínicas", "cidade", ""), INICIO]);
    }
    return this.listarPerto({ lat: pos.lat, lng: pos.lng }, "da sua localização");
  }

  private perguntarCep(aviso?: string): PassoGuia {
    this.esperando = (t) => this.cep(t);
    return passo([...(aviso ? [aviso] : []), "Qual é o seu CEP? Escreva na caixa de mensagem (8 números)."],
      [op("Usar minha localização", "local_gps"), op("Ver todas as clínicas", "cidade", ""), INICIO], { texto: { placeholder: "00000-000" } });
  }

  private async cep(texto: string): Promise<PassoGuia> {
    const digitos = texto.replace(/\D/g, "");
    if (digitos.length !== 8) return this.perguntarCep("O CEP tem 8 números. Tente de novo.");
    try {
      return await this.listarPerto({ cep: digitos }, `do CEP ${digitos.slice(0, 5)}-${digitos.slice(5)}`);
    } catch (e) {
      return this.perguntarCep(mensagemDe(e));
    }
  }

  private async listarPerto(query: { lat: number; lng: number } | { cep: string }, deOnde: string): Promise<PassoGuia> {
    const lista = await this.api.dados(this.api.cliente.GET("/clinicas", { params: { query } }));
    const recebendo = lista.itens.filter((c) => c.recebendo_pedidos);
    if (recebendo.length === 0) return passo("Nenhuma clínica pode receber pedidos agora.", [INICIO]);
    const aprox = lista.localizacao?.aproximada ? "cerca de " : "";
    const linhas = recebendo.map((c) => `• ${c.nome}${c.distancia_km != null ? ` (${aprox}${c.distancia_km.toLocaleString("pt-BR")} km)` : ""}: `
      + `${c.endereco ? `${c.endereco}, ${c.bairro}. ` : ""}${CUSTO[c.custo_informado]}.`);
    return passo([`Clínicas mais perto ${deOnde}, da mais perto para a mais longe:\n${linhas.join("\n")}`, "Qual delas você escolhe?"],
      [...recebendo.map((c) => op(c.nome, "clinica", c.id)), op("Buscar de outro jeito", "pedir")], { titulo: "Escolha a clínica" });
  }

  private async cidade(cidade: string): Promise<PassoGuia> {
    const todas = await this.listarClinicas(cidade);
    const recebendo = todas.filter((c) => c.recebendo_pedidos);
    const fechadas = todas.length - recebendo.length;
    const onde = cidade || "todas as cidades";
    if (recebendo.length === 0) return passo(`Nenhuma clínica pode receber pedidos em ${onde} agora.`, [op("Buscar de outro jeito", "pedir"), INICIO]);
    const linhas = recebendo.map((c) => `• ${c.nome}${c.endereco ? `: ${c.endereco}, ${c.bairro}, ${c.cidade}` : ""}. ${CUSTO[c.custo_informado]}.`);
    return passo([
      `${recebendo.length === 1 ? "1 clínica-escola recebe" : `${recebendo.length} clínicas-escola recebem`} pedidos em ${onde}:\n${linhas.join("\n")}`
        + (fechadas ? `\n${fechadas === 1 ? "1 clínica não pode" : `${fechadas} clínicas não podem`} receber agora.` : ""),
      "Qual delas você escolhe?",
    ], [...recebendo.map((c) => op(c.nome, "clinica", c.id)), INICIO], { titulo: "Escolha a clínica" });
  }

  private async clinica(id: string): Promise<PassoGuia> {
    const c = await this.api.dados(this.api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: id } } }));
    if (!c.recebendo_pedidos) return passo(`${nomeCurto(c.nome)} não pode receber agora.`, [op("Escolher outra clínica", "pedir"), INICIO]);
    this.rascunho = { clinica: c };
    return passo([`Você escolheu ${c.nome}.`, "Para quem é o atendimento? Se for para uma criança ou uma pessoa idosa, você pode pedir por ela."], [
      op(PARA_QUEM.mim, "quem", "mim"),
      op(PARA_QUEM.outra, "quem", "outra"),
      op("Escolher outra clínica", "pedir"),
    ], { titulo: "Para quem é o atendimento" });
  }

  private semRascunho(): PassoGuia {
    return passo("Vamos começar o pedido de novo.", [op("Pedir atendimento", "pedir"), INICIO]);
  }

  private quem(v: keyof typeof PARA_QUEM): PassoGuia {
    const r = this.rascunho;
    if (!r || !(v in PARA_QUEM)) return this.semRascunho();
    r.paraQuem = v;
    if (r.clinica.especialidades.length === 1) r.especialidade = r.clinica.especialidades[0];
    if (r.clinica.publico.length === 1) r.publico = r.clinica.publico[0];
    return this.proximaPergunta();
  }

  private especialidade(e: string): PassoGuia {
    const r = this.rascunho;
    if (!r || !r.clinica.especialidades.includes(e)) return this.semRascunho();
    r.especialidade = e;
    return this.proximaPergunta();
  }

  private publico(p: PublicoAlvo): PassoGuia {
    const r = this.rascunho;
    if (!r || !r.clinica.publico.includes(p)) return this.semRascunho();
    r.publico = p;
    return this.proximaPergunta();
  }

  /** Pergunta só o que falta; quando só há uma opção, ela é usada sem perguntar (como na tela). */
  private proximaPergunta(): PassoGuia {
    const r = this.rascunho!;
    if (!r.especialidade) {
      return passo("Que tipo de atendimento você procura? A clínica mostra só o que ela oferece.",
        [...r.clinica.especialidades.map((e) => op(e === "triagem" ? "Triagem (começo da trilha de cuidado)" : rotuloEspecialidade(e), "esp", e)), op("Cancelar pedido", "inicio")], { titulo: "Tipo de atendimento" });
    }
    if (!r.publico) {
      return passo("Quem vai ser atendido? A clínica usa isso para saber se pode atender.",
        [...r.clinica.publico.map((p) => op(PUBLICO[p], "pub", p)), op("Cancelar pedido", "inicio")], { titulo: "Quem vai ser atendido" });
    }
    return this.perguntarMotivo();
  }

  private perguntarMotivo(aviso?: string): PassoGuia {
    this.esperando = (t) => this.motivo(t);
    return passo([
      ...(aviso ? [aviso] : []),
      "Em poucas palavras, do que você precisa? Por exemplo: \"consulta de rotina\". Escreva na caixa de mensagem.",
      "Não conte dados de saúde: a clínica pergunta o resto depois.",
    ], [op("Cancelar pedido", "inicio")], { texto: { placeholder: "Escreva do que você precisa" } });
  }

  private async motivo(texto: string): Promise<PassoGuia> {
    const r = this.rascunho;
    if (!r) return this.semRascunho();
    const t = texto.trim();
    if (t.length < 3) return this.perguntarMotivo("Escreva um pouco mais (pelo menos 3 letras).");
    if (t.length > 280) return this.perguntarMotivo("Esse texto está longo. Use até 280 letras.");
    r.motivo = t;
    return this.perguntarHorario();
  }

  /** Horários livres da clínica (GET /clinicas/{id}/horarios), como na tela "Escolha um horário". */
  private async perguntarHorario(): Promise<PassoGuia> {
    const r = this.rascunho!;
    const h = await this.api.dados(this.api.cliente.GET("/clinicas/{clinica_id}/horarios", {
      params: { path: { clinica_id: r.clinica.id }, query: { especialidade: r.especialidade! } },
    }));
    r.horarios = new Map(h.itens.map((x) => [x.vaga_id, x.inicio]));
    return passo([
      h.itens.length ? "Escolha um horário livre:" : "Esta clínica não tem horário livre agora para este atendimento.",
      h.aviso,
    ], [
      ...h.itens.map((x) => op(dataHora(x.inicio), "horario", x.vaga_id)),
      op("A clínica me liga para combinar", "horario", "sem"),
      op("Cancelar pedido", "inicio"),
    ], { titulo: "Escolha o horário" });
  }

  private horario(vagaId: string): PassoGuia | Promise<PassoGuia> {
    const r = this.rascunho;
    if (!r?.motivo) return this.semRascunho();
    if (vagaId === "sem") r.horario = "sem";
    else {
      const inicio = r.horarios?.get(vagaId);
      if (!inicio) return this.perguntarHorario();
      r.horario = { vaga_id: vagaId, inicio };
    }
    return r.paraQuem === "outra" ? this.perguntarNome() : this.perguntarTelefone();
  }

  private perguntarNome(aviso?: string): PassoGuia {
    this.esperando = (t) => Promise.resolve(this.nome(t));
    return passo([...(aviso ? [aviso] : []), "Qual é o nome completo de quem será atendido? Escreva na caixa de mensagem."],
      [op("Cancelar pedido", "inicio")], { texto: { placeholder: "Nome de quem será atendido" } });
  }

  private nome(texto: string): PassoGuia {
    const r = this.rascunho;
    if (!r) return this.semRascunho();
    const t = texto.trim();
    if (t.length < 2 || t.length > 120) return this.perguntarNome("Digite o nome completo.");
    r.nomePaciente = t;
    return this.perguntarTelefone();
  }

  private perguntarTelefone(aviso?: string): PassoGuia {
    this.esperando = (t) => Promise.resolve(this.telefone(t));
    return passo([...(aviso ? [aviso] : []), "Qual telefone a clínica pode usar para falar com você? Escreva com DDD."],
      [op("Cancelar pedido", "inicio")], { texto: { placeholder: "(11) 91234-5678" } });
  }

  private telefone(texto: string): PassoGuia {
    const r = this.rascunho;
    if (!r) return this.semRascunho();
    const d = texto.replace(/\D/g, "");
    if (d.length < 10 || d.length > 11) return this.perguntarTelefone("O telefone precisa ter DDD e 8 ou 9 números.");
    r.telefone = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    return this.revisao();
  }

  private revisao(): PassoGuia {
    const r = this.rascunho!;
    const c = r.clinica;
    return passo([
      "Revise antes de enviar:\n"
        + `Clínica: ${c.nome}\n`
        + (c.endereco ? `Endereço: ${c.endereco}, ${c.bairro}, ${c.cidade}/${c.uf}\n` : "")
        + (r.especialidade === "triagem" ? "Tipo: começo da trilha de cuidado\n" : "")
        + `Para quem: ${PARA_QUEM[r.paraQuem!]}\n`
        + `Paciente: ${this.nomeDoPaciente()}\n`
        + `Telefone: ${r.telefone}\n`
        + `Atendimento: ${rotuloEspecialidade(r.especialidade!)}\n`
        + `Quem será atendido: ${PUBLICO[r.publico!]}\n`
        + `Do que precisa: ${r.motivo}\n`
        + `Horário: ${r.horario && r.horario !== "sem" ? `${dataHora(r.horario.inicio)} (a clínica confirma)` : "a clínica liga para combinar"}\n`
        + `Custo: ${CUSTO[c.custo_informado]}`,
      `Ao enviar, você autoriza a ${c.nome} a ver estas informações para analisar seu pedido. Só é consulta marcada quando a clínica confirmar.`,
    ], [op("Autorizo e envio o pedido", "enviar"), op("Corrigir algo", "corrigir"), op("Cancelar pedido", "inicio")], { titulo: "Revise o pedido" });
  }

  private nomeDoPaciente(): string {
    const r = this.rascunho!;
    return r.paraQuem === "outra" ? r.nomePaciente ?? "" : this.opcoes.nomeUsuario ?? "";
  }

  private corrigir(): PassoGuia {
    const r = this.rascunho;
    if (!r) return this.semRascunho();
    return passo("O que você quer corrigir?", [
      op("Começar de novo com esta clínica", "clinica", r.clinica.id),
      op("Escolher outra clínica", "pedir"),
      op("Cancelar pedido", "inicio"),
    ]);
  }

  private async enviar(): Promise<PassoGuia> {
    const r = this.rascunho;
    if (!r?.especialidade || !r.publico || !r.motivo || !r.telefone || !r.horario) return this.semRascunho();
    const criado = await this.api.dados(this.api.cliente.POST("/solicitacoes", {
      body: {
        clinica_id: r.clinica.id, especialidade: r.especialidade, publico_alvo: r.publico, descricao_administrativa: r.motivo,
        para_quem: r.paraQuem ?? "mim", nome_paciente: this.nomeDoPaciente() || null, telefone_contato: r.telefone,
      },
    }));
    const horario = r.horario;
    this.rascunho = null; // evita envio repetido
    let msgHorario = `A clínica vai analisar e ligar para ${criado.telefone_contato ?? "você"}.`;
    if (horario !== "sem") {
      try {
        await this.api.dados(this.api.cliente.POST("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: horario.vaga_id } }, body: { solicitacao_id: criado.id } }));
        msgHorario = `Pedimos o horário de ${dataHora(horario.inicio)} para você. A clínica analisa o pedido e confirma.`;
      } catch (e) {
        msgHorario = `O horário escolhido não pôde ser pedido (${mensagemDe(e)}). Seu pedido continua enviado; veja outros horários no pedido.`;
      }
    }
    this.aoMudarDados();
    return passo(["Pedido enviado.", msgHorario, "Só é consulta marcada quando a clínica confirmar."],
      [op("Acompanhar pedido", "pedido", criado.id), INICIO]);
  }

  // ---------- acompanhar pedidos ----------
  private async pedidos(): Promise<PassoGuia> {
    const [itens, clinicas] = await Promise.all([this.listarPedidos(), this.nomesClinicas()]);
    if (itens.length === 0) return passo("Você ainda não enviou pedidos.", [op("Pedir atendimento", "pedir"), INICIO]);
    return passo(itens.length === 1 ? "Você tem 1 pedido:" : `Você tem ${itens.length} pedidos. Qual quer ver?`, [
      ...itens.map((p) => op(`${rotuloEspecialidade(p.especialidade)} · ${clinicas.get(p.clinica_id)?.nome ?? "Clínica"} · ${ESTADO_PEDIDO[p.estado].rotulo}`, "pedido", p.id)),
      INICIO,
    ], { titulo: "Seus pedidos" });
  }

  private async pedido(id: string): Promise<PassoGuia> {
    const [p, clinicas] = await Promise.all([this.verPedido(id), this.nomesClinicas()]);
    const c = clinicas.get(p.clinica_id);
    const estado = ESTADO_PEDIDO[p.estado];
    const opcoes: OpcaoGuia[] = [];
    if (ATIVOS.includes(p.estado)) opcoes.push(op("Ver vagas desta clínica", "vagas", p.id));
    if (p.estado === "indisponivel") opcoes.push(op("Ver outras clínicas", "alternativas", p.id));
    if (p.estado === "agendada") opcoes.push(op("Ver horário confirmado", "agenda"));
    if (p.estado === "concluida") opcoes.push(op("Avaliar a clínica", "avaliar", p.id));
    opcoes.push(op("Ver histórico do pedido", "historico", p.id));
    if (p.estado !== "concluida") opcoes.push(op("Emergência no dente", "emergencia"));
    opcoes.push(op("Ver meus pedidos", "pedidos"), INICIO);
    return passo([
      `Pedido de ${rotuloEspecialidade(p.especialidade)} para ${c?.nome ?? "a clínica"}.\nSituação: ${estado.rotulo}. ${estado.explica}\nEnviado em ${dataHora(p.criado_em)}.`
        + (c ? `\nTelefone da clínica: ${c.telefone}` : ""),
    ], opcoes, { titulo: "O que você quer fazer com este pedido" });
  }

  private async historico(id: string): Promise<PassoGuia> {
    const ev = await this.api.dados(this.api.cliente.GET("/solicitacoes/{solicitacao_id}/eventos", { params: { path: { solicitacao_id: id } } }));
    const linhas = [...ev.itens].sort((a, b) => a.criado_em.localeCompare(b.criado_em))
      .map((e) => `• ${dataHora(e.criado_em)}: ${descreverEvento(e)} (${e.autor_papel === "paciente" ? "por você" : "pela clínica"})${e.motivo ? `. Motivo: ${e.motivo}` : ""}`);
    return passo(linhas.length ? `Histórico do pedido:\n${linhas.join("\n")}` : "Ainda não há registros neste pedido.",
      [op("Voltar ao pedido", "pedido", id), INICIO]);
  }

  // ---------- vagas e interesse ----------
  private async listarVagas(pedidoId: string) {
    const p = await this.verPedido(pedidoId);
    return (await this.api.dados(this.api.cliente.GET("/vagas", { params: { query: { clinica_id: p.clinica_id } } }))).itens;
  }

  private async vagas(pedidoId: string): Promise<PassoGuia> {
    const itens = await this.listarVagas(pedidoId);
    const abertas = itens.filter((v) => v.estado === "aberta" && !v.interesse);
    const comInteresse = itens.filter((v) => v.interesse);
    const resumoInteresse = comInteresse.map((v) => `• ${dataHora(v.inicio)}: ${ROTULO_INTERESSE[v.interesse!]}`).join("\n");
    if (abertas.length === 0) {
      return passo(comInteresse.length
        ? [`Seus interesses nesta clínica:\n${resumoInteresse}`, "Ainda não é reserva. A clínica confirma."]
        : "Esta clínica não informou vagas agora. Seu pedido continua ativo.",
      [op("Voltar ao pedido", "pedido", pedidoId), INICIO]);
    }
    return passo([
      `Horários livres nesta clínica:\n${abertas.map((v) => `• ${dataHora(v.inicio)} · ${rotuloEspecialidade(v.especialidade)}`).join("\n")}`
        + (comInteresse.length ? `\n\nSeus interesses:\n${resumoInteresse}` : ""),
      "Escolha um horário para ver. Ainda não é reserva: a clínica confirma.",
    ], [...abertas.map((v) => op(dataHora(v.inicio), "vaga", pedidoId, v.id)), op("Voltar ao pedido", "pedido", pedidoId)], { titulo: "Horários livres" });
  }

  private async vaga(pedidoId: string, vagaId: string): Promise<PassoGuia> {
    const v = (await this.listarVagas(pedidoId)).find((x) => x.id === vagaId);
    if (!v || v.estado !== "aberta") return passo("Esse horário não está mais livre. Seu pedido continua ativo.", [op("Ver outros horários", "vagas", pedidoId), INICIO]);
    return passo([`Horário: ${dataHora(v.inicio)} · ${rotuloEspecialidade(v.especialidade)}.`, "Tem interesse? Ainda não é reserva. A clínica confirma."], [
      op("Tenho interesse", "interesse", pedidoId, vagaId),
      op("Não consigo nesse horário", "vagas", pedidoId),
      op("Voltar ao pedido", "pedido", pedidoId),
    ]);
  }

  private async interesse(pedidoId: string, vagaId: string): Promise<PassoGuia> {
    await this.api.dados(this.api.cliente.POST("/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: vagaId } }, body: { solicitacao_id: pedidoId } }));
    this.aoMudarDados();
    return passo(["Interesse registrado.", "Ainda não é reserva. A clínica confirma."], [op("Voltar ao pedido", "pedido", pedidoId), INICIO]);
  }

  // ---------- outra clínica (o paciente escolhe) ----------
  private async alternativas(id: string): Promise<PassoGuia> {
    const [p, clinicas, lista] = await Promise.all([
      this.verPedido(id), this.nomesClinicas(),
      this.api.dados(this.api.cliente.GET("/solicitacoes/{solicitacao_id}/alternativas", { params: { path: { solicitacao_id: id } } })),
    ]);
    const origem = nomeCurto(clinicas.get(p.clinica_id)?.nome ?? "A clínica");
    if (lista.itens.length === 0) return passo("Não encontramos outra clínica compatível agora. Seu pedido continua guardado.", [op("Voltar ao pedido", "pedido", id), INICIO]);
    const linhas = lista.itens.map(({ clinica: c }) => `• ${c.nome}: ${CUSTO[c.custo_informado]}. Atende ${c.publico.map((x) => PUBLICO[x].toLowerCase()).join(", ")}.`);
    return passo([
      `${origem} não pode receber agora.`,
      `Encontramos outras opções. Cada uma ${lista.criterios.map((k) => CRITERIO_ALTERNATIVA[k] ?? k).join("; ")}.\n${linhas.join("\n")}`,
      "Nada é enviado sem a sua confirmação.",
    ], [...lista.itens.map(({ clinica: c }) => op(`Enviar para ${c.nome}`, "alt", id, c.id)), op("Agora não, quero esperar", "pedido", id)], { titulo: "Outras clínicas" });
  }

  private async confirmarEncaminhar(id: string, clinicaId: string): Promise<PassoGuia> {
    const c = await this.api.dados(this.api.cliente.GET("/clinicas/{clinica_id}", { params: { path: { clinica_id: clinicaId } } }));
    return passo([`Enviar seu pedido para ${c.nome}?`, ...(c.custo_informado !== "gratuito" ? ["Custo não informado. Confirme antes de se deslocar."] : [])], [
      op("Sim, enviar meu pedido", "encaminhar", id, clinicaId),
      op("Ver outras opções", "alternativas", id),
      op("Agora não", "pedido", id),
    ]);
  }

  private async encaminhar(id: string, clinicaId: string): Promise<PassoGuia> {
    const r = await this.api.dados(this.api.cliente.POST("/solicitacoes/{solicitacao_id}/encaminhar", { params: { path: { solicitacao_id: id } }, body: { clinica_destino_id: clinicaId } }));
    this.aoMudarDados();
    return passo(["Pedido enviado para a nova clínica. Ela vai analisar.", "Ainda não é consulta marcada."], [op("Acompanhar pedido", "pedido", r.solicitacao.id), INICIO]);
  }

  // ---------- horário confirmado ----------
  private async agenda(): Promise<PassoGuia> {
    const lista = await this.api.dados(this.api.cliente.GET("/agendamentos", {}));
    const confirmados = lista.itens.filter((a) => a.estado === "agendado").sort((a, b) => a.vaga.inicio.localeCompare(b.vaga.inicio));
    if (confirmados.length === 0) return passo("Nenhum horário confirmado ainda. Quando a clínica confirmar um horário, ele aparece aqui.", [op("Ver meus pedidos", "pedidos"), INICIO]);
    const linhas = confirmados.map((a) => `• ${dataHora(a.vaga.inicio)}: ${a.clinica.nome}, ${rotuloEspecialidade(a.vaga.especialidade)}. Telefone: ${a.clinica.telefone}`);
    return passo([
      `${confirmados.length === 1 ? "Horário confirmado pela clínica" : "Horários confirmados pela clínica"}:\n${linhas.join("\n")}`,
      "Chegue 15 minutos antes e leve um documento com foto.",
    ], [
      ...confirmados.flatMap((a) => [
        op(confirmados.length === 1 ? "Remarcar" : `Remarcar ${dataHora(a.vaga.inicio)}`, "remarcar", a.id),
        op(confirmados.length === 1 ? "Não vou conseguir ir" : `Não vou conseguir ir em ${dataHora(a.vaga.inicio)}`, "cancelar_pergunta", a.id),
      ]),
      INICIO,
    ]);
  }

  private async remarcar(agendamentoId: string): Promise<PassoGuia> {
    const lista = await this.api.dados(this.api.cliente.GET("/agendamentos", {}));
    const a = lista.itens.find((x) => x.id === agendamentoId);
    if (!a) return passo("Não achei esse horário.", [op("Horário marcado", "agenda"), INICIO]);
    const h = await this.api.dados(this.api.cliente.GET("/clinicas/{clinica_id}/horarios", {
      params: { path: { clinica_id: a.clinica.id }, query: { especialidade: a.vaga.especialidade } } }));
    const livres = h.itens.filter((x) => x.vaga_id !== a.vaga_id);
    if (livres.length === 0) return passo(`Não há outro horário livre agora. Ligue para a clínica: ${a.clinica.telefone}.`, [op("Falar com uma pessoa", "atendente"), INICIO]);
    return passo("Escolha o novo horário:", [...livres.slice(0, 6).map((x) => op(dataHora(x.inicio), "remarcar_vaga", agendamentoId, x.vaga_id, x.inicio)), op("Manter o atual", "agenda")],
      { titulo: "Novo horário" });
  }

  private remarcarConfirmar(agendamentoId: string, vagaId: string, inicio: string): PassoGuia {
    return passo(`Confirmando: troco seu horário para ${dataHora(inicio)}. O atual é liberado sem falta nem penalidade, e o novo só vale quando a clínica confirmar. Posso trocar?`,
      [op("Sim, trocar", "remarcar_ok", agendamentoId, vagaId), op("Manter o atual", "agenda")]);
  }

  private async remarcarEnviar(agendamentoId: string, vagaId: string): Promise<PassoGuia> {
    const r = await this.api.dados(this.api.cliente.POST("/agendamentos/{agendamento_id}/remarcar", { params: { path: { agendamento_id: agendamentoId } }, body: { vaga_id: vagaId } }));
    this.aoMudarDados();
    return passo([`Pedimos o novo horário: ${dataHora(r.inicio)}.`, r.aviso], [op("Ver meus pedidos", "pedidos"), INICIO]);
  }

  private cancelarPergunta(id: string): PassoGuia {
    return passo(["Cancelar antes do horário não gera falta nem penalidade. Seu pedido volta para análise da clínica.", "Quer mesmo cancelar?"], [
      op("Sim, cancelar este atendimento", "cancelar", id),
      op("Manter horário", "agenda"),
    ]);
  }

  private async cancelar(id: string): Promise<PassoGuia> {
    await this.api.dados(this.api.cliente.POST("/agendamentos/{agendamento_id}/cancelar", { params: { path: { agendamento_id: id } }, body: {} }));
    this.aoMudarDados();
    return passo("Atendimento cancelado. Seu pedido voltou para análise da clínica.", [op("Ver meus pedidos", "pedidos"), INICIO]);
  }

  // ---------- alertas de vaga ----------
  private async alertas(): Promise<PassoGuia> {
    const [lista, pref, pedidos] = await Promise.all([
      this.api.dados(this.api.cliente.GET("/alertas", {})),
      this.api.dados(this.api.cliente.GET("/alertas/preferencia", {})),
      this.listarPedidos(),
    ]);
    const linhas = lista.itens.map((a) => `• ${nomeCurto(a.clinica_nome)} · ${rotuloEspecialidade(a.especialidade)} · ${dataHora(a.inicio)}${a.lido ? "" : " (novo)"}`);
    const verVaga = new Map<string, OpcaoGuia>();
    for (const a of lista.itens.filter((x) => !x.lido)) {
      const p = pedidos.find((x) => x.clinica_id === a.clinica_id && x.especialidade === a.especialidade && ATIVOS.includes(x.estado));
      if (p && !verVaga.has(p.id)) verVaga.set(p.id, op(`Ver vagas em ${nomeCurto(a.clinica_nome)}`, "vagas", p.id));
    }
    return passo([
      lista.itens.length ? `Seus alertas de vaga:\n${linhas.join("\n")}` : "Nenhum alerta por enquanto.",
      `Avisos de vaga aqui no app: ${pref.receber ? "ligados" : "desligados"}. ${lista.aviso}`,
    ], [
      ...verVaga.values(),
      ...(lista.nao_lidos > 0 ? [op("Marcar todos como lidos", "alertas_lidos")] : []),
      op(pref.receber ? "Desligar avisos de vaga" : "Ligar avisos de vaga", "alertas_pref", pref.receber ? "0" : "1"),
      INICIO,
    ]);
  }

  private async alertasPreferencia(receber: boolean): Promise<PassoGuia> {
    const atual = await this.api.dados(this.api.cliente.GET("/alertas/preferencia", {}));
    await this.api.dados(this.api.cliente.PUT("/alertas/preferencia", { body: { receber, ligacao: receber && atual.ligacao } }));
    this.aoMudarDados();
    return this.alertas();
  }

  private async alertasLidos(): Promise<PassoGuia> {
    const lista = await this.api.dados(this.api.cliente.GET("/alertas", {}));
    for (const a of lista.itens.filter((x) => !x.lido)) {
      await this.api.dados(this.api.cliente.POST("/alertas/{alerta_id}/lido", { params: { path: { alerta_id: a.id } } }));
    }
    this.aoMudarDados();
    return this.alertas();
  }

  // ---------- avaliar a clínica ----------
  private async avaliar(id: string): Promise<PassoGuia> {
    const [p, minhas] = await Promise.all([this.verPedido(id), this.api.dados(this.api.cliente.GET("/avaliacoes", {}))]);
    if (p.estado !== "concluida") return passo("Você poderá avaliar depois que o atendimento for concluído.", [op("Voltar ao pedido", "pedido", id), INICIO]);
    const existente = minhas.itens.find((a) => a.solicitacao_id === id);
    return passo(existente ? `Sua nota atual é ${existente.nota}. Quer mudar? Como foi o atendimento?` : "Como foi o atendimento?", [
      ...NOTAS.map(([n, rotulo]) => op(`${n} · ${rotulo}`, "nota", id, String(n))),
      op("Voltar ao pedido", "pedido", id),
    ], { titulo: "Nota do atendimento" });
  }

  private nota(id: string, nota: number, aviso?: string): PassoGuia {
    if (!(nota >= 1 && nota <= 5)) return passo("Escolha uma nota de 1 a 5.", [op("Avaliar a clínica", "avaliar", id)]);
    this.esperando = (t) => this.avaliarEnviar(id, nota, t);
    return passo([
      ...(aviso ? [aviso] : []),
      "Quer deixar um comentário? Escreva na caixa de mensagem (até 280 letras).",
      "Não escreva seu nome nem dados de saúde: a clínica e outras pessoas podem ver.",
    ], [op("Enviar sem comentário", "avaliar_enviar", id, String(nota)), op("Voltar ao pedido", "pedido", id)], { texto: { placeholder: "Seu comentário (opcional)" } });
  }

  private async avaliarEnviar(id: string, nota: number, comentario: string): Promise<PassoGuia> {
    const c = comentario.trim();
    if (c.length > 280) return this.nota(id, nota, "Esse comentário está longo. Use até 280 letras.");
    await this.api.dados(this.api.cliente.POST("/avaliacoes", { body: { solicitacao_id: id, nota, comentario: c || null } }));
    this.aoMudarDados();
    return passo("Obrigado pela avaliação. Você pode mudar quando quiser.", [op("Voltar ao pedido", "pedido", id), INICIO]);
  }
}
