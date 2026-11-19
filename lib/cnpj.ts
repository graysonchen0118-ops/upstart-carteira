// CNPJ numérico e alfanumérico (IN RFB 2.229/2024, emitido desde 31/07/2026).
// As 12 primeiras posições aceitam 0-9 e A-Z; os 2 dígitos verificadores são sempre números.
// Cada caractere vale (código ASCII - 48): "0" = 0 ... "9" = 9, "A" = 17 ... "Z" = 42.

const PESOS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digito(valores: number[], pesos: number[]): number {
  const soma = valores.reduce((s, v, i) => s + v * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function digitosVerificadores(base12: string): string {
  const v = base12.split("").map((c) => c.charCodeAt(0) - 48);
  const d1 = digito(v, PESOS);
  const d2 = digito([...v, d1], [6, ...PESOS]);
  return `${d1}${d2}`;
}

/** tira pontuação e espaços, deixa em maiúsculas */
export function limpar(s: string): string {
  return s.toUpperCase().replace(/[.\-/\s ]/g, "");
}

export function temFormato(c: string): boolean {
  return /^[0-9A-Z]{12}[0-9]{2}$/.test(c);
}

export function valido(c: string): boolean {
  if (!temFormato(c)) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  return digitosVerificadores(c.slice(0, 12)) === c.slice(12);
}

export function temLetra(c: string): boolean {
  return /[A-Z]/.test(c.slice(0, 12));
}

export function formatar(c: string): string {
  if (c.length !== 14) return c;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export const raiz = (c: string) => c.slice(0, 8);
export const ehMatriz = (c: string) => c.slice(8, 12) === "0001";

export function cpfValido(s: string): boolean {
  if (!/^\d{11}$/.test(s) || /^(\d)\1{10}$/.test(s)) return false;
  const n = s.split("").map(Number);
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += n[i] * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === n[9] && calc(10) === n[10];
}
