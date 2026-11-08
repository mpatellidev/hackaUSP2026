import type { Api } from "@uhealth/api-client";
import { describe, expect, it, vi } from "vitest";
import { Guia, ehAcaoGuiada, type PassoGuia } from "./guia";

const CLINICA_A = {
  id: "c1", nome: "Clínica-Escola A", cidade: "São Paulo", uf: "SP", publico: ["adultos"], especialidades: ["clinica_geral"],
  custo_informado: "gratuito", recebendo_pedidos: true, telefone: "(11) 0000-0001",
};
const CLINICA_B = { ...CLINICA_A, id: "c2", nome: "Clínica-Escola B", cidade: "Campinas", recebendo_pedidos: false };
const PEDIDO = { id: "p1", clinica_id: "c1", especialidade: "clinica_geral", estado: "em_analise", criado_em: "2026-11-07T10:00:00-03:00" };
const VAGA = { id: "v1", clinica_id: "c1", especialidade: "clinica_geral", estado: "aberta", inicio: "2026-11-10T14:00:00-03:00", interesse: null };

/** API falsa: responde como o backend e registra toda escrita (POST/PUT). */
function criarApi() {
  const escritas: unknown[][] = [];
  const GET = vi.fn(async (caminho: string, opcoes?: { params?: { query?: { cidade?: string; lat?: number } } }) => {
    switch (caminho) {
      case "/clinicas": {
        const q = opcoes?.params?.query ?? {};
        const itens = [CLINICA_A, CLINICA_B].filter((c) => !q.cidade || c.cidade === q.cidade)
          .map((c) => (q.lat !== undefined ? { ...c, distancia_km: 1.2 } : c));
        return { data: { itens, total: itens.length, ...(q.lat !== undefined ? { localizacao: { fonte: "aparelho", aproximada: false, descricao: "sua localização" } } : {}) } };
      }
      case "/clinicas/{clinica_id}/horarios":
        return { data: { clinica_id: "c1", itens: [{ vaga_id: "v1", especialidade: "clinica_geral", inicio: VAGA.inicio, fim: VAGA.inicio }], total: 1, aviso: "A clínica confirma." } };
      case "/clinicas/{clinica_id}": return { data: CLINICA_A };
      case "/perfil": return { data: { latitude: null } };
      case "/solicitacoes/{solicitacao_id}": return { data: PEDIDO };
      case "/vagas": return { data: { itens: [VAGA], total: 1 } };
      default: throw new Error(`GET inesperado: ${caminho}`);
    }
  });
  const escrever = async (...args: unknown[]) => { escritas.push(args); return { data: { id: "novo" } }; };
  const api = { dados: (p: Promise<{ data: unknown }>) => p.then((r) => r.data), cliente: { GET, POST: escrever, PUT: escrever } } as unknown as Api;
  return { api, GET, escritas };
}

const valorDe = (p: PassoGuia, rotulo: string) => {
  const o = p.opcoes.find((x) => x.label === rotulo);
  if (!o) throw new Error(`Sem a opção "${rotulo}". Opções: ${p.opcoes.map((x) => x.label).join(" | ")}`);
  return o.value;
};
const texto = (p: PassoGuia) => p.mensagens.map((m) => m.texto).join("\n");

describe("conversa guiada", () => {
  it("pede atendimento pelas clínicas mais perto, com horário e telefone, e só envia depois de \"Autorizo e envio\"", async () => {
    const { api, escritas, GET } = criarApi();
    const aoMudar = vi.fn();
    const g = new Guia(api, aoMudar, { nomeUsuario: "Ana Martins", localizar: async () => ({ lat: -23.56, lng: -46.65 }) });

    let p = await g.executar(valorDe(g.inicio(), "Marcar atendimento"));
    // sem endereço no perfil: pergunta onde procurar
    p = await g.executar(valorDe(p, "Usar minha localização"));
    expect(GET).toHaveBeenCalledWith("/clinicas", { params: { query: { lat: -23.56, lng: -46.65 } } });
    expect(texto(p)).toContain("Clínica-Escola A (1,2 km)");
    expect(p.opcoes.map((o) => o.label)).toEqual(["Clínica-Escola A", "Buscar de outro jeito"]); // só quem recebe pedidos
    p = await g.executar(valorDe(p, "Clínica-Escola A"));
    p = await g.executar(valorDe(p, "Para mim"));
    // uma só especialidade e um só público: pula direto para o motivo (como a tela)
    expect(g.esperaTexto()).toBe(true);
    p = await g.responderTexto("consulta de rotina");
    p = await g.executar(p.opcoes[0].value); // primeiro horário livre
    expect(g.esperaTexto()).toBe(true); // telefone
    p = await g.responderTexto("11 91234 5678");
    expect(texto(p)).toContain("Do que precisa: consulta de rotina");
    expect(texto(p)).toContain("Telefone: (11) 91234-5678");
    expect(texto(p)).toContain("Paciente: Ana Martins");
    expect(escritas).toHaveLength(0); // nada foi enviado ainda

    p = await g.executar(valorDe(p, "Autorizo e envio o pedido"));
    expect(escritas).toEqual([
      ["/solicitacoes", { body: {
        clinica_id: "c1", especialidade: "clinica_geral", publico_alvo: "adultos", descricao_administrativa: "consulta de rotina",
        para_quem: "mim", nome_paciente: "Ana Martins", telefone_contato: "(11) 91234-5678",
      } }],
      ["/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: "v1" } }, body: { solicitacao_id: "novo" } }],
    ]);
    expect(texto(p)).toContain("Só é consulta marcada quando a clínica confirmar");
    expect(aoMudar).toHaveBeenCalledOnce();

    // tocar de novo em "enviar" não cria outro pedido
    await g.executar("@enviar");
    expect(escritas).toHaveLength(2);
  });

  it("recusa motivo curto e continua esperando o texto", async () => {
    const { api } = criarApi();
    const g = new Guia(api);
    await g.executar("@clinica:c1");
    await g.executar("@quem:mim");
    let p = await g.responderTexto("oi");
    expect(texto(p)).toContain("pelo menos 3 letras");
    p = await g.responderTexto("consulta");
    p = await g.executar("@horario:sem");
    p = await g.responderTexto("123");
    expect(texto(p)).toContain("DDD");
    expect(g.esperaTexto()).toBe(true);
    p = await g.executar("@inicio");
    p = await g.executar("@clinica:c1");
    p = await g.executar("@quem:mim");
    p = await g.responderTexto("oi");
    expect(texto(p)).toContain("pelo menos 3 letras");
    expect(g.esperaTexto()).toBe(true);
  });

  it("emergência mostra SAMU 192 mesmo se a busca falhar (não cria agendamento)", async () => {
    const { api, escritas } = criarApi();
    const p = await new Guia(api).executar("@emergencia");
    expect(texto(p)).toMatch(/192/);
    expect(escritas).toHaveLength(0);
  });

  it("interesse em vaga pede confirmação e avisa que não é reserva", async () => {
    const { api, escritas } = criarApi();
    const g = new Guia(api);
    let p = await g.executar("@vagas:p1");
    expect(texto(p)).toContain("Ainda não é reserva");
    p = await g.executar(p.opcoes[0].value); // escolheu o horário: ainda não enviou
    expect(escritas).toHaveLength(0);
    p = await g.executar(valorDe(p, "Tenho interesse"));
    expect(escritas).toEqual([["/vagas/{vaga_id}/interesses", { params: { path: { vaga_id: "v1" } }, body: { solicitacao_id: "p1" } }]]);
    expect(texto(p)).toContain("Ainda não é reserva. A clínica confirma.");
  });

  it("mostra erro da API com \"Tentar de novo\"", async () => {
    const { api, GET } = criarApi();
    GET.mockRejectedValueOnce(new Error("Não foi possível conectar."));
    const p = await new Guia(api).executar("@pedidos");
    expect(p.mensagens[0]).toEqual({ texto: "Não foi possível conectar.", erro: true });
    expect(p.opcoes[0]).toEqual({ label: "Tentar de novo", value: "@pedidos" });
  });

  it("só valores com @ são ações guiadas (o resto vai para a IA)", () => {
    expect(ehAcaoGuiada("@inicio")).toBe(true);
    expect(ehAcaoGuiada("Quais clínicas existem?")).toBe(false);
  });
});
