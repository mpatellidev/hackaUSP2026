/** CPF no navegador: máscara e dígitos verificadores (o servidor valida de novo).
 *  Cópia de `app/paciente/src/cpf.ts` (os apps não importam código um do outro); mantenha as duas iguais. */
export const soDigitos = (v: string) => v.replace(/\D/g, "");

export function formatarCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function digito(base: string): number {
  const peso = base.length + 1;
  const soma = [...base].reduce((t, d, i) => t + Number(d) * (peso - i), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10]);
}

/** "Parece CPF": só números (com ou sem pontos e traço). */
export const pareceCpf = (v: string) => /^[\d.\-\s]+$/.test(v.trim()) && soDigitos(v).length > 0;
