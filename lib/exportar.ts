import { formatar } from "./cnpj";
import { pendencias, regimeFinal, simplesQueVendeParaEmpresas, vendeFinal } from "./analise";
import { PROBLEMA_TEXTO } from "./entrada";
import { PLANILHA_EXEMPLO } from "./mock/registro";
import { cnaeFormatado, dataBR } from "./normaliza";
import { VENDE_ROTULO, type Linha } from "./tipos";

const CABECALHO = [
  "CNPJ",
  "Matriz ou filial",
  "Razão social",
  "Nome fantasia",
  "Situação na Receita",
  "Regime",
  "De onde veio o regime",
  "Regime na planilha original",
  "CNAE principal",
  "Atividade",
  "Setor",
  "Vende para",
  "De onde veio",
  "Simples que vende para empresas",
  "Município",
  "UF",
  "Abertura",
  "Porte",
  "Pendências",
  "Conferida",
  "Observação",
];

function linhaPlanilha(l: Linha): string[] {
  const e = l.empresa;
  const cnpj = e?.cnpj ?? l.entrada.cnpj;
  const reg = regimeFinal(l);
  const origemRegime = l.regimeConfirmado
    ? "Confirmado pelo escritório"
    : e?.regimeSugerido.origem === "opcao_atual"
      ? "Opção atual na Receita"
      : e?.regimeSugerido.origem === "registro"
        ? `Último registro público (${e.regimeSugerido.ano}), a confirmar`
        : e
          ? "Sem dado público, a confirmar"
          : "";
  const origemFinal = e?.regimeSugerido.daMatriz && !l.regimeConfirmado ? `${origemRegime} (da matriz)` : origemRegime;
  const v = vendeFinal(l);
  const pend = pendencias(l).map((p) => p.texto);
  if (!e && l.status === "invalido" && l.entrada.problema) pend.unshift(PROBLEMA_TEXTO[l.entrada.problema]);
  return [
    cnpj ? formatar(cnpj) : l.entrada.bruto,
    e ? (e.matriz ? "Matriz" : "Filial") : "",
    e?.razao ?? "",
    e?.fantasia ?? "",
    e ? `${e.situacaoTexto}${e.motivo ? ` (${e.motivo})` : ""}` : l.status === "nao_encontrado" ? "Não encontrado na base pública" : l.status === "invalido" ? "CNPJ inválido" : "",
    reg ?? "",
    origemFinal,
    l.entrada.declarado.regime ?? "",
    e?.cnae ? cnaeFormatado(e.cnae.codigo) : "",
    e?.cnae?.descricao ?? "",
    e?.setor ?? "",
    v ? VENDE_ROTULO[v] : "",
    v ? (l.vendeConfirmado ? "Confirmado pelo escritório" : "Sugestão pelo CNAE") : "",
    simplesQueVendeParaEmpresas(l) ? "Sim" : "Não",
    e?.municipio ?? "",
    e?.uf ?? "",
    e?.abertura ? dataBR(e.abertura) : "",
    e?.porte ?? "",
    [...new Set(pend)].join(" | "),
    l.conferida ? "Sim" : "Não",
    l.observacao,
  ];
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const hoje = () => "2026-11-20";

export async function exportarXlsx(linhas: Linha[]) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const dados = [
    CABECALHO.map((c) => ({ value: c, fontWeight: "bold" as const, backgroundColor: "#E3F1F9" })),
    ...linhas.map((l) => linhaPlanilha(l).map((v) => ({ value: v, type: String }))),
  ];
  const larguras = [20, 10, 42, 26, 22, 18, 30, 18, 12, 50, 22, 16, 22, 14, 20, 5, 11, 22, 60, 10, 30];
  const blob = await writeXlsxFile(dados, { sheet: "Carteira", columns: larguras.map((width) => ({ width })), stickyRowsCount: 1 }).toBlob();
  baixar(blob, `carteira-preenchida-${hoje()}.xlsx`);
}

export function exportarCsv(linhas: Linha[]) {
  // Excel em português abre CSV separado por ponto e vírgula; o BOM garante os acentos
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const corpo = [CABECALHO, ...linhas.map(linhaPlanilha)].map((r) => r.map(esc).join(";")).join("\r\n");
  baixar(new Blob(["﻿" + corpo], { type: "text/csv;charset=utf-8" }), `carteira-preenchida-${hoje()}.csv`);
}

export async function baixarModelo() {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const dados = PLANILHA_EXEMPLO.map((r, i) => r.map((v) => (i === 0 ? { value: v, fontWeight: "bold" as const } : { value: v, type: String })));
  const blob = await writeXlsxFile(dados, { sheet: "Carteira", columns: [{ width: 22 }, { width: 14 }, { width: 16 }] }).toBlob();
  baixar(blob, "carteira-exemplo-upstart.xlsx");
}
