import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Carregando } from "@uhealth/ui";
import { ProvedorUHealth, useSessao } from "@uhealth/api-client";
import { useEffect, useState, type ReactNode } from "react";
import { Casca } from "./Casca";
import { gravarModo, useModoAtendimento } from "./modoAtendimento";
import { Assistente } from "./modulos/assistente/Assistente";
import { BoasVindas, boasVindasConcluida } from "./modulos/boasvindas/BoasVindas";
import { CompletarCadastro, cadastroAdiado } from "./modulos/cadastro/CompletarCadastro";
import { Entrar } from "./modulos/entrar/Entrar";
import { EscolhaAtendimento } from "./modulos/escolha/EscolhaAtendimento";
import { ROTAS } from "./rotas";

/** Fluxo: boas-vindas (2 passos) → entrar/criar conta → escolher o modo → (painel: endereço e preferências) → app. */
function Roteador() {
  const { api, usuario, restaurando } = useSessao();
  const [vistas, setVistas] = useState(boasVindasConcluida);
  const [adiado, setAdiado] = useState(cadastroAdiado);
  const modo = useModoAtendimento();
  // O perfil do servidor é a fonte do modo escolhido (vale em qualquer aparelho)
  const perfil = useQuery({ queryKey: ["perfil"], enabled: !!usuario, queryFn: () => api.dados(api.cliente.GET("/perfil", {})) });
  useEffect(() => {
    if (perfil.data) gravarModo(perfil.data.modo_atendimento ?? null);
  }, [perfil.data?.modo_atendimento]); // eslint-disable-line react-hooks/exhaustive-deps

  if (restaurando) return <Carregando texto="Entrando…" />;
  if (!vistas) return <BoasVindas aoConcluir={() => setVistas(true)} />;
  if (!usuario) return <Entrar />;
  if (perfil.isPending) return <Carregando texto="Carregando…" />;
  if (!modo) return <EscolhaAtendimento />;
  // Assistente: a conversa é a única tela (o botão no alto troca para o painel)
  if (modo === "conversa") {
    return (
      <div className="d-casca d-casca--conversa">
        <Assistente />
      </div>
    );
  }
  if (perfil.data && !perfil.data.cadastro_completo && !adiado) {
    return <CompletarCadastro aoTerminar={() => setAdiado(true)} />;
  }
  return (
    <Routes>
      <Route element={<Casca />}>
        {ROTAS.map((r) => <Route key={r.caminho} path={r.caminho} element={r.elemento} />)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/** Área do paciente dentro de uma moldura de celular no desktop/tablet (no celular de verdade, tela cheia). */
function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="d-moldura">
      <div className="d-moldura-tela">
        <div className="d-moldura-rolagem" id="rolagem">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ProvedorUHealth app="paciente" papelEsperado="paciente">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Moldura><Roteador /></Moldura>
      </BrowserRouter>
    </ProvedorUHealth>
  );
}
