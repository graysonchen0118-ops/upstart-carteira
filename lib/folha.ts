import { grupo, regimeFinal, simplesQueVendeParaEmpresas } from "./analise";
import type { Linha } from "./tipos";

// Ponte entre a lista e a cena em 3D: a cena lê este objeto a cada quadro.
// Cada linha da folha tem 6 células: CNPJ, empresa, situação, regime, atividade, para quem vende.
export const COR = {
  vazia: 0,
  consultando: 1,
  pronta: 2,
  conferir: 3,
  fora: 4,
  erro: 5,
  confirmada: 6,
  cnpj: 7,
  destaque: 8,
} as const;

export const COLUNAS = 6;
export const MAX_LINHAS = 36;

export const folha = {
  linhas: [] as number[][],
  selecionada: -1,
  versao: 0,
  consultando: 0,
};

export function atualizarFolha(linhas: Linha[], sel: string | null) {
  const vis = linhas.slice(0, MAX_LINHAS);
  folha.linhas = vis.map((l) => {
    const g = grupo(l);
    if (l.status === "fila") return [COR.cnpj, COR.vazia, COR.vazia, COR.vazia, COR.vazia, COR.vazia];
    if (l.status === "consultando") return [COR.cnpj, COR.consultando, COR.consultando, COR.consultando, COR.consultando, COR.consultando];
    if (g === "erro") return [COR.erro, COR.erro, COR.vazia, COR.vazia, COR.vazia, COR.vazia];
    const e = l.empresa!;
    if (g === "fora") return [COR.cnpj, COR.fora, COR.fora, COR.fora, COR.fora, COR.fora];
    const regimeOk = l.regimeConfirmado ? COR.confirmada : e.regimeSugerido.origem === "opcao_atual" ? COR.pronta : regimeFinal(l) ? COR.conferir : COR.conferir;
    const vende = simplesQueVendeParaEmpresas(l) ? COR.destaque : l.vendeConfirmado ? COR.confirmada : COR.pronta;
    const conferida = l.conferida ? COR.confirmada : null;
    return [
      COR.cnpj,
      conferida ?? COR.pronta,
      conferida ?? COR.pronta,
      g === "conferir" && regimeOk !== COR.confirmada ? COR.conferir : conferida ?? regimeOk,
      conferida ?? COR.pronta,
      vende,
    ];
  });
  folha.selecionada = sel ? vis.findIndex((l) => l.id === sel) : -1;
  folha.consultando = linhas.filter((l) => l.status === "consultando" || l.status === "fila").length;
  folha.versao++;
}
