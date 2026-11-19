import { formatar, raiz } from "./cnpj";
import { PROBLEMA_TEXTO } from "./entrada";
import { dataBR } from "./normaliza";
import { normalizarRegime } from "./regras";
import type { Linha, Regime, Vende } from "./tipos";

export type Grupo = "pronta" | "conferir" | "fora" | "erro" | "andamento";

export interface Pendencia {
  tipo: "situacao" | "regime" | "divergencia" | "saiu_simples" | "erro";
  texto: string;
}

export function regimeFinal(l: Linha): Regime | null {
  return l.regimeConfirmado ?? l.empresa?.regimeSugerido.valor ?? null;
}

export function vendeFinal(l: Linha): Vende | null {
  return l.vendeConfirmado ?? l.empresa?.vendeSugerido.valor ?? null;
}

const HOJE = new Date("2026-11-20T12:00:00-03:00");

function mesesAte(d: string): number {
  const x = new Date(d + "T12:00:00-03:00");
  return (HOJE.getFullYear() - x.getFullYear()) * 12 + (HOJE.getMonth() - x.getMonth());
}

export function pendencias(l: Linha): Pendencia[] {
  const p: Pendencia[] = [];
  if (l.status === "invalido" && l.entrada.problema) p.push({ tipo: "erro", texto: PROBLEMA_TEXTO[l.entrada.problema] });
  if ((l.status === "nao_encontrado" || l.status === "falha") && l.erro) p.push({ tipo: "erro", texto: l.erro });
  const e = l.empresa;
  if (!e || l.status !== "ok") return p;

  if (e.situacao === "baixada" || e.situacao === "nula") {
    p.push({ tipo: "situacao", texto: `${e.situacaoTexto} na Receita${e.dataSituacao ? ` desde ${dataBR(e.dataSituacao)}` : ""}${e.motivo ? ` (${e.motivo})` : ""}. Sai da rotina de prazos.` });
    return p;
  } else if (e.situacao === "inapta" || e.situacao === "suspensa")
    p.push({ tipo: "situacao", texto: `${e.situacaoTexto} na Receita${e.dataSituacao ? ` desde ${dataBR(e.dataSituacao)}` : ""}${e.motivo ? `: ${e.motivo}` : ""}.` });

  const declarado = normalizarRegime(l.entrada.declarado.regime);
  const sug = e.regimeSugerido;
  if (!l.regimeConfirmado) {
    if (declarado && sug.origem === "opcao_atual" && sug.valor && declarado !== sug.valor) {
      p.push({ tipo: "divergencia", texto: `A planilha diz ${declarado}; a Receita mostra opção atual pelo ${sug.valor}.` });
    } else if (declarado && (declarado === "Simples Nacional" || declarado === "MEI") && sug.origem !== "opcao_atual") {
      const saiu = declarado === "MEI" ? e.mei.saiuEm : e.simples.saiuEm;
      p.push({
        tipo: "divergencia",
        texto: `A planilha diz ${declarado}, mas a empresa não está no ${declarado === "MEI" ? "MEI" : "Simples"} na Receita${saiu ? `: saiu em ${dataBR(saiu)}` : ""}.`,
      });
    } else if (declarado && sug.origem === "registro" && sug.valor && declarado !== sug.valor) {
      p.push({ tipo: "divergencia", texto: `A planilha diz ${declarado}; o último registro público (${sug.ano}) é ${sug.valor}. Confirme o regime de 2026.` });
    } else if (sug.origem === "registro") {
      if (!declarado) p.push({ tipo: "regime", texto: `Regime a confirmar. O último registro público é de ${sug.ano}: ${sug.valor ?? "forma não informada"}.` });
    } else if (sug.origem === "sem_dado" && !declarado) {
      p.push({ tipo: "regime", texto: "Regime a confirmar. Não é do Simples nem MEI, e ainda não há registro anual público." });
    } else if (sug.origem === "sem_dado" && declarado) {
      p.push({ tipo: "regime", texto: `A planilha diz ${declarado}. Não há registro público para comparar; confirme.` });
    }
  }
  if (!e.simples.optante && e.simples.saiuEm && mesesAte(e.simples.saiuEm) <= 24 && !p.some((x) => x.tipo === "divergencia"))
    p.push({ tipo: "saiu_simples", texto: `Saiu do Simples em ${dataBR(e.simples.saiuEm)}. Vale conferir se o regime da carteira acompanhou.` });
  return p;
}

export function grupo(l: Linha): Grupo {
  if (l.status === "fila" || l.status === "consultando") return "andamento";
  if (l.status !== "ok") return "erro";
  const e = l.empresa!;
  if (e.situacao !== "ativa") return "fora";
  return pendencias(l).length && !l.conferida ? "conferir" : "pronta";
}

export function simplesQueVendeParaEmpresas(l: Linha): boolean {
  if (l.status !== "ok" || l.empresa?.situacao !== "ativa") return false;
  const v = vendeFinal(l);
  return regimeFinal(l) === "Simples Nacional" && (v === "empresas" || v === "ambos");
}

/** matriz e filiais da mesma empresa na lista */
export function irmas(linhas: Linha[], l: Linha): Linha[] {
  const c = l.empresa?.cnpj ?? l.entrada.cnpj;
  if (!c) return [];
  const r = raiz(c);
  return linhas.filter((x) => x.id !== l.id && (x.empresa?.cnpj ?? x.entrada.cnpj ?? "").slice(0, 8) === r);
}

export function nomeExibicao(l: Linha): string {
  if (l.empresa) return l.empresa.fantasia || l.empresa.razao;
  return l.entrada.cnpj ? formatar(l.entrada.cnpj) : l.entrada.bruto || "(vazio)";
}
