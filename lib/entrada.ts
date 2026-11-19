import { cpfValido, limpar, temFormato, valido } from "./cnpj";
import type { Entrada, Problema } from "./tipos";

export type Celula = string | number | boolean | Date | null | undefined;

export interface Leitura {
  entradas: Entrada[];
  ignoradas: number; // linhas sem nada que pareça CNPJ (cabeçalho, título, total)
  colunas: { cnpj: number | null; regime: number | null; setor: number | null };
}

const RX_NOTACAO = /^\d+([.,]\d+)?E\+?\d+$/i;

function texto(c: Celula): string {
  if (c === null || c === undefined) return "";
  if (typeof c === "number") {
    // números grandes do Excel chegam inteiros; sem casas decimais nem notação
    return Number.isInteger(c) ? c.toFixed(0) : String(c);
  }
  if (c instanceof Date) return "";
  return String(c).trim();
}

function acharColunas(linha: string[]) {
  const idx = (rx: RegExp) => {
    const i = linha.findIndex((c) => rx.test(c));
    return i >= 0 ? i : null;
  };
  return {
    cnpj: idx(/cnpj/i),
    regime: idx(/regime|tributa/i),
    setor: idx(/setor|atividade|ramo|segmento/i),
  };
}

interface Candidato {
  cnpj: string | null;
  problema: Problema | null;
  zeros: boolean;
}

/** lê uma célula e decide se é CNPJ, CNPJ com erro, ou nada */
function lerCelula(bruto: string, colunaDeCnpj: boolean): Candidato | null {
  if (!bruto) return null;
  if (RX_NOTACAO.test(bruto.replace(/\s/g, ""))) return { cnpj: null, problema: "notacao", zeros: false };
  const c = limpar(bruto);
  if (!c) return null;
  if (/^\d+$/.test(c) && c.length < 14) {
    // o Excel apaga zeros à esquerda quando a coluna está como número
    const minimo = colunaDeCnpj ? 1 : 12;
    if (c.length >= minimo) {
      const completo = c.padStart(14, "0");
      if (valido(completo)) return { cnpj: completo, problema: null, zeros: true };
    }
    if (c.length === 11 && cpfValido(c)) return { cnpj: null, problema: "cpf", zeros: false };
    if (colunaDeCnpj || c.length >= 12) return { cnpj: null, problema: c.length >= 12 ? "dv" : "curto", zeros: false };
    return null;
  }
  if (temFormato(c)) {
    return valido(c) ? { cnpj: c, problema: null, zeros: false } : { cnpj: null, problema: "dv", zeros: false };
  }
  // 14 caracteres com letra no dígito verificador, ou tamanho errado com cara de CNPJ
  if (/^[0-9A-Z]{13,15}$/.test(c) && /\d{6,}/.test(c) && (colunaDeCnpj || /[./-]/.test(bruto))) {
    return { cnpj: null, problema: "formato", zeros: false };
  }
  if (colunaDeCnpj && /\d{6,}/.test(c)) return { cnpj: null, problema: "formato", zeros: false };
  return null;
}

// sem cabeçalho, só aceita uma célula que seja inteira um nome de regime (evita pegar "Padaria Real Ltda")
const RX_REGIME = /^(simples( nacional)?|sn|mei|(lucro |l\. ?)?presumido|lp|(lucro |l\. ?)?real|lr|(lucro )?arbitrado|imune|isenta?)$/i;

function dividir(linha: string): string[] {
  if (linha.includes("\t")) return linha.split("\t");
  if (linha.includes(";")) return linha.split(";");
  // vírgula só separa quando há mais de um pedaço com conteúdo
  const partes = linha.split(",");
  return partes.length > 1 && partes.filter((p) => p.trim()).length > 1 ? partes : [linha];
}

export function lerTabela(linhas: Celula[][]): Leitura {
  const tab = linhas.map((l) => l.map(texto));
  let inicio = 0;
  let colunas: Leitura["colunas"] = { cnpj: null, regime: null, setor: null };
  // cabeçalho: a primeira linha com "CNPJ" escrito nas 5 primeiras
  for (let i = 0; i < Math.min(5, tab.length); i++) {
    const c = acharColunas(tab[i]);
    if (c.cnpj !== null && !tab[i].some((x) => valido(limpar(x)))) {
      colunas = c;
      inicio = i + 1;
      break;
    }
  }
  const entradas: Entrada[] = [];
  let ignoradas = inicio;
  for (let i = inicio; i < tab.length; i++) {
    const cel = tab[i];
    if (cel.every((x) => !x)) continue;
    let achado: Candidato | null = null;
    let bruto = "";
    if (colunas.cnpj !== null) {
      bruto = cel[colunas.cnpj] ?? "";
      achado = lerCelula(bruto, true);
    } else {
      for (const x of cel) {
        const a = lerCelula(x, false);
        if (a) {
          achado = a;
          bruto = x;
          break;
        }
      }
    }
    if (!achado) {
      ignoradas++;
      continue;
    }
    let regime: string | null = null;
    let setor: string | null = null;
    if (colunas.regime !== null) regime = cel[colunas.regime] || null;
    else {
      const r = cel.find((x) => x !== bruto && RX_REGIME.test(x));
      regime = r || null;
    }
    if (colunas.setor !== null) setor = cel[colunas.setor] || null;
    entradas.push({
      bruto: bruto.trim(),
      linha: i + 1,
      cnpj: achado.cnpj,
      problema: achado.problema,
      zerosRecuperados: achado.zeros,
      declarado: { regime, setor },
      repeticoes: 0,
    });
  }
  return { entradas: juntarRepetidos(entradas), ignoradas, colunas };
}

export function lerTexto(t: string): Leitura {
  const linhas = t.replace(/\r/g, "").split("\n");
  // texto corrido com vários CNPJs na mesma linha, separados por espaço
  const tabela: Celula[][] = [];
  for (const l of linhas) {
    const partes = dividir(l);
    if (partes.length === 1 && /\s/.test(l.trim())) {
      const pedacos = l.trim().split(/\s+/);
      const viram = pedacos.filter((p) => lerCelula(p, false)).length;
      if (viram > 1) {
        pedacos.forEach((p) => tabela.push([p]));
        continue;
      }
    }
    // vários CNPJs na mesma linha, separados por vírgula ou ponto e vírgula: um por linha
    const cheias = partes.map((x) => x.trim()).filter(Boolean);
    if (cheias.length > 1 && cheias.every((x) => lerCelula(x, false))) {
      cheias.forEach((x) => tabela.push([x]));
      continue;
    }
    tabela.push(partes);
  }
  return lerTabela(tabela);
}

function juntarRepetidos(lista: Entrada[]): Entrada[] {
  const vistos = new Map<string, Entrada>();
  const saida: Entrada[] = [];
  for (const e of lista) {
    if (e.cnpj) {
      const ja = vistos.get(e.cnpj);
      if (ja) {
        ja.repeticoes++;
        if (!ja.declarado.regime && e.declarado.regime) ja.declarado.regime = e.declarado.regime;
        if (!ja.declarado.setor && e.declarado.setor) ja.declarado.setor = e.declarado.setor;
        continue;
      }
      vistos.set(e.cnpj, e);
    }
    saida.push(e);
  }
  return saida;
}

export const PROBLEMA_TEXTO: Record<Problema, string> = {
  dv: "Dígito verificador não confere. Costuma ser um número trocado na digitação.",
  formato: "Não tem o formato de CNPJ (14 caracteres, os 2 últimos sempre números).",
  notacao: "O Excel converteu o número em notação científica e perdeu os últimos dígitos. Formate a coluna como Texto e copie de novo.",
  cpf: "É um CPF, não um CNPJ.",
  curto: "Faltam dígitos para ser um CNPJ.",
};
