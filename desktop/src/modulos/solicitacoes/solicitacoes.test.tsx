import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErro } from "../../api/cliente";
import { usuarioDe } from "../../api/mock/dados";
import { criarMockSolicitacoes } from "../../api/mock/solicitacoes";
import type { SolicitacoesApi } from "../../api/solicitacoes";

const estado = vi.hoisted(() => ({ api: null as unknown as SolicitacoesApi }));
vi.mock("../../api/solicitacoes", () => ({ solicitacoesApi: new Proxy({}, { get: (_, k) => (estado.api as any)[k] }) }));

import DetalheSolicitacao from "./DetalheSolicitacao";
import ListaSolicitacoes from "./ListaSolicitacoes";

const A = usuarioDe("funcionario.atendimento.a")!;
const ENVIADA_A = "b1000000-0000-4000-8000-000000000003";

function montar(caminho: string) {
  window.location.hash = caminho;
  return render(
    <HashRouter><Routes>
      <Route path="/solicitacoes" element={<ListaSolicitacoes />} />
      <Route path="/solicitacoes/:id" element={<DetalheSolicitacao />} />
    </Routes></HashRouter>,
  );
}

beforeEach(() => { estado.api = criarMockSolicitacoes(() => A, 0); });

describe("lista", () => {
  it("mostra carregando e depois só os pedidos da clínica", async () => {
    montar("/solicitacoes");
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByRole("link", { name: "Bruno S." })).toBeInTheDocument();
    expect(within(tabela).queryByText("Eva R.")).not.toBeInTheDocument(); // paciente da clínica B
  });

  it("lista vazia mostra mensagem, não tabela", async () => {
    estado.api = { ...estado.api, listar: async () => [] };
    montar("/solicitacoes");
    expect(await screen.findByText(/Nenhuma solicitação/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("erro aparece como alerta e permite tentar de novo", async () => {
    const listar = vi.fn().mockRejectedValueOnce(new ApiErro(0, "sem_conexao", "Sem conexão com o servidor."))
      .mockResolvedValue([]);
    estado.api = { ...estado.api, listar };
    montar("/solicitacoes");
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor.");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText(/Nenhuma solicitação/)).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it("botão Atualizar busca de novo", async () => {
    const listar = vi.spyOn(estado.api, "listar");
    montar("/solicitacoes");
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });
});

describe("detalhe", () => {
  it("muda para indisponível exigindo motivo e atualiza o histórico", async () => {
    montar(`/solicitacoes/${ENVIADA_A}`);
    await screen.findByRole("heading", { name: /Pedido de Bruno S\./ });
    await userEvent.click(screen.getByLabelText("Não recebemos agora"));
    const motivo = screen.getByLabelText(/Motivo administrativo/);
    expect(motivo).toBeRequired();
    await userEvent.type(motivo, "Sem agenda neste período.");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar mudança" }));
    expect(await screen.findAllByText(/Situação alterada para “Não recebemos agora”/)).not.toHaveLength(0);
    expect(await screen.findByText("Motivo: Sem agenda neste período.")).toBeInTheDocument();
    expect(screen.queryByText("Mudar situação")).not.toBeInTheDocument(); // estado terminal: sem ações
  });

  it("erro do servidor (409) aparece como alerta, não como sucesso", async () => {
    estado.api = { ...estado.api, transicionar: async () => { throw new ApiErro(409, "transicao_invalida", "Esta mudança não é permitida."); } };
    montar(`/solicitacoes/${ENVIADA_A}`);
    await screen.findByRole("heading", { name: /Pedido de Bruno S\./ });
    await userEvent.click(screen.getByLabelText("Colocar em análise"));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar mudança" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Esta mudança não é permitida.");
    expect(screen.queryByText(/Situação alterada/)).not.toBeInTheDocument();
  });

  it("pedido de outra clínica mostra erro 404 e nenhum dado", async () => {
    montar("/solicitacoes/b1000000-0000-4000-8000-000000000002");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não encontramos");
    expect(screen.queryByText(/Ana M\./)).not.toBeInTheDocument();
  });
});
