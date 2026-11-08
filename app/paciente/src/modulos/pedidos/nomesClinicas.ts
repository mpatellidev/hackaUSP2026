import { useQuery } from "@tanstack/react-query";
import { useSessao, type Clinica } from "@uhealth/api-client";

/** Clínicas por id (para mostrar o nome nos pedidos). Uma única consulta compartilhada pelas telas. */
export function useClinicasPorId(): Map<string, Clinica> {
  const { api } = useSessao();
  const q = useQuery({ queryKey: ["clinicas", "todas"], queryFn: () => api.dados(api.cliente.GET("/clinicas", {})) });
  return new Map((q.data?.itens ?? []).map((c) => [c.id, c]));
}

/** "Clínica-Escola A" → "Clínica A" (forma curta usada nos avisos do design). */
export const nomeCurto = (nome: string) => nome.replace(/^Clínica-Escola /, "Clínica ");
/** "Clínica-Escola B" → "B" (rótulo de botão do design); outros nomes ficam inteiros. */
export const letraOuNome = (nome: string) => nome.match(/^Clínica-Escola ([A-Z])$/)?.[1] ?? nome;
