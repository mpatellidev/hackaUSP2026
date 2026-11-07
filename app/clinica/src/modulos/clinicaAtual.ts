import { useUsuario } from "@uhealth/api-client";

/** Clínica e função do funcionário logado; vêm de /auth/me (servidor), nunca do cliente. */
export function useClinicaAtual(): { clinicaId: string; funcao: string } {
  const u = useUsuario();
  if (!u.clinica_id || !u.funcao) throw new Error("Funcionário sem clínica vinculada");
  return { clinicaId: u.clinica_id, funcao: u.funcao };
}
