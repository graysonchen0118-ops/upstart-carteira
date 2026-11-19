export type Regime = "Simples Nacional" | "MEI" | "Lucro Presumido" | "Lucro Real" | "Lucro Arbitrado" | "Imune ou isenta";
export const REGIMES: Regime[] = ["Simples Nacional", "MEI", "Lucro Presumido", "Lucro Real", "Lucro Arbitrado", "Imune ou isenta"];

export type Vende = "empresas" | "consumidor" | "ambos";
export const VENDE_ROTULO: Record<Vende, string> = {
  empresas: "Empresas",
  consumidor: "Consumidor final",
  ambos: "Os dois",
};

export type Situacao = "ativa" | "baixada" | "inapta" | "suspensa" | "nula";

/** formato devolvido pela consulta pública (BrasilAPI e Minha Receita usam o mesmo) */
export interface RegistroBruto {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  situacao_cadastral?: number | null;
  descricao_situacao_cadastral?: string | null;
  data_situacao_cadastral?: string | null;
  descricao_motivo_situacao_cadastral?: string | null;
  identificador_matriz_filial?: number | null;
  data_inicio_atividade?: string | null;
  porte?: string | null;
  natureza_juridica?: string | null;
  uf?: string | null;
  municipio?: string | null;
  cnae_fiscal?: number | string | null;
  cnae_fiscal_descricao?: string | null;
  cnaes_secundarios?: { codigo: number | string; descricao: string }[] | null;
  opcao_pelo_simples?: boolean | null;
  data_opcao_pelo_simples?: string | null;
  data_exclusao_do_simples?: string | null;
  opcao_pelo_mei?: boolean | null;
  data_opcao_pelo_mei?: string | null;
  data_exclusao_do_mei?: string | null;
  regime_tributario?: { ano: number; forma_de_tributacao: string }[] | null;
}

export type Fonte = "brasilapi" | "minhareceita" | "exemplo";

export interface Cnae {
  codigo: string; // 7 dígitos
  descricao: string;
}

export interface Empresa {
  cnpj: string;
  matriz: boolean;
  razao: string;
  fantasia: string;
  situacao: Situacao;
  situacaoTexto: string;
  dataSituacao: string | null;
  motivo: string | null;
  abertura: string | null;
  porte: string | null;
  natureza: string | null;
  uf: string | null;
  municipio: string | null;
  cnae: Cnae | null;
  secundarios: Cnae[];
  setor: string;
  simples: { optante: boolean; desde: string | null; saiuEm: string | null };
  mei: { optante: boolean; desde: string | null; saiuEm: string | null };
  historico: { ano: number; forma: string }[];
  regimeSugerido: { valor: Regime | null; origem: "opcao_atual" | "registro" | "sem_dado"; ano: number | null; daMatriz?: boolean };
  vendeSugerido: { valor: Vende | null; motivo: string };
  fonte: Fonte;
}

export type Problema = "dv" | "formato" | "notacao" | "cpf" | "curto";

export interface Entrada {
  bruto: string;
  linha: number;
  cnpj: string | null; // 14 caracteres quando válido
  problema: Problema | null;
  zerosRecuperados: boolean;
  declarado: { regime: string | null; setor: string | null };
  repeticoes: number; // quantas vezes apareceu além da primeira
}

export type Status = "fila" | "consultando" | "ok" | "nao_encontrado" | "falha" | "invalido";

export interface Linha {
  id: string;
  ordem: number;
  entrada: Entrada;
  status: Status;
  empresa: Empresa | null;
  erro: string | null;
  regimeConfirmado: Regime | null;
  vendeConfirmado: Vende | null;
  conferida: boolean;
  observacao: string;
  origem: "colado" | "planilha" | "exemplo";
}
