import { ehMatriz, limpar } from "./cnpj";
import { formaLegivel, normalizarRegime, setorPorCnae, sugerirVende } from "./regras";
import type { Cnae, Empresa, Fonte, Regime, RegistroBruto, Situacao } from "./tipos";

const SITUACAO: Record<number, Situacao> = { 1: "nula", 2: "ativa", 3: "suspensa", 4: "inapta", 8: "baixada" };
const SITUACAO_TEXTO: Record<Situacao, string> = {
  ativa: "Ativa",
  baixada: "Baixada",
  inapta: "Inapta",
  suspensa: "Suspensa",
  nula: "Nula",
};

const cod7 = (c: number | string | null | undefined) => (c === null || c === undefined || c === "" ? null : String(c).replace(/\D/g, "").padStart(7, "0"));

function capitalizar(s: string): string {
  // a base pública vem em maiúsculas; deixa legível sem mexer em siglas curtas
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o", "para", "com"]);
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((p, i) => {
      if (/^\s+$/.test(p) || !p) return p;
      if (i > 0 && minusculas.has(p)) return p;
      if (/^(ltda|me|epp|s\/a|sa|eireli)$/.test(p)) return p === "ltda" ? "Ltda" : p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("");
}

function data(d: string | null | undefined): string | null {
  if (!d || d === "0000-00-00") return null;
  return /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
}

/** a base pública às vezes traz entrada e saída no mesmo dia: a empresa nunca esteve de fato no regime */
function saida(entrou: string | null | undefined, saiu: string | null | undefined): string | null {
  const s = data(saiu);
  if (!s) return null;
  const e = data(entrou);
  return e && s <= e ? null : s;
}

export function normalizar(b: RegistroBruto, fonte: Fonte): Empresa {
  const cnpj = limpar(b.cnpj);
  const situacao: Situacao = SITUACAO[b.situacao_cadastral ?? 2] ?? "ativa";
  const principal = cod7(b.cnae_fiscal);
  const cnae: Cnae | null = principal ? { codigo: principal, descricao: b.cnae_fiscal_descricao ?? "" } : null;
  const secundarios: Cnae[] = (b.cnaes_secundarios ?? [])
    .map((s) => ({ codigo: cod7(s.codigo) ?? "", descricao: s.descricao }))
    .filter((s) => s.codigo && s.codigo !== "0000000");
  const simples = {
    optante: b.opcao_pelo_simples === true,
    desde: data(b.data_opcao_pelo_simples),
    saiuEm: b.opcao_pelo_simples === true ? null : saida(b.data_opcao_pelo_simples, b.data_exclusao_do_simples),
  };
  const mei = {
    optante: b.opcao_pelo_mei === true,
    desde: data(b.data_opcao_pelo_mei),
    saiuEm: b.opcao_pelo_mei === true ? null : saida(b.data_opcao_pelo_mei, b.data_exclusao_do_mei),
  };
  const historico = (b.regime_tributario ?? [])
    .filter((r) => r && r.ano && r.forma_de_tributacao)
    .map((r) => ({ ano: r.ano, forma: formaLegivel(r.forma_de_tributacao) }))
    .sort((a, c) => a.ano - c.ano);

  let regimeSugerido: Empresa["regimeSugerido"];
  if (mei.optante) regimeSugerido = { valor: "MEI", origem: "opcao_atual", ano: null };
  else if (simples.optante) regimeSugerido = { valor: "Simples Nacional", origem: "opcao_atual", ano: null };
  else if (historico.length) {
    const ult = historico[historico.length - 1];
    regimeSugerido = { valor: normalizarRegime(ult.forma) as Regime | null, origem: "registro", ano: ult.ano };
  } else regimeSugerido = { valor: null, origem: "sem_dado", ano: null };

  const fantasia = (b.nome_fantasia ?? "").trim();
  return {
    cnpj,
    matriz: b.identificador_matriz_filial ? b.identificador_matriz_filial === 1 : ehMatriz(cnpj),
    razao: capitalizar(b.razao_social ?? ""),
    fantasia: fantasia ? capitalizar(fantasia) : "",
    situacao,
    situacaoTexto: SITUACAO_TEXTO[situacao],
    dataSituacao: data(b.data_situacao_cadastral),
    motivo:
      b.descricao_motivo_situacao_cadastral && !/sem motivo/i.test(b.descricao_motivo_situacao_cadastral)
        ? b.descricao_motivo_situacao_cadastral.charAt(0) + b.descricao_motivo_situacao_cadastral.slice(1).toLowerCase()
        : null,
    abertura: data(b.data_inicio_atividade),
    porte: b.porte ? capitalizar(b.porte) : null,
    natureza: b.natureza_juridica ?? null,
    uf: b.uf ?? null,
    municipio: b.municipio ? capitalizar(b.municipio) : null,
    cnae,
    secundarios,
    setor: setorPorCnae(principal),
    simples,
    mei,
    historico,
    regimeSugerido,
    vendeSugerido: sugerirVende(principal, secundarios.map((s) => s.codigo)),
    fonte,
  };
}

export function dataBR(d: string | null): string {
  if (!d) return "";
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

export function cnaeFormatado(c: string): string {
  return c.length === 7 ? `${c.slice(0, 4)}-${c.slice(4, 5)}/${c.slice(5)}` : c;
}
