import type { RegistroBruto } from "../tipos";

// Carteira de exemplo: empresas inventadas, no formato exato que a consulta pública devolve.
// Cada número foi consultado na base pública em 20/11/2026 e voltou "não encontrado", para nenhum
// exemplo apontar para empresa real. O da linha com dígito trocado também, depois de corrigido.

const CNAE: Record<string, string> = {
  "1091102": "Fabricação de produtos de padaria e confeitaria com predominância de produção própria",
  "4679699": "Comércio atacadista de materiais de construção em geral",
  "1412601": "Confecção de peças de vestuário, exceto roupas íntimas e as confeccionadas sob medida",
  "4712100": "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns",
  "6911701": "Serviços advocatícios",
  "8630504": "Atividade odontológica",
  "4520001": "Serviços de manutenção e reparação mecânica de veículos automotores",
  "4930202": "Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional",
  "4120400": "Construção de edifícios",
  "4321500": "Instalação e manutenção elétrica",
  "6201501": "Desenvolvimento de programas de computador sob encomenda",
  "2222600": "Fabricação de embalagens de material plástico",
  "9602501": "Cabeleireiros, manicure e pedicure",
  "9313100": "Atividades de condicionamento físico",
  "4771701": "Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas",
  "5611201": "Restaurantes e similares",
  "4637107": "Comércio atacadista de chocolates, confeitos, balas, bombons e semelhantes",
  "3101200": "Fabricação de móveis com predominância de madeira",
  "4754701": "Comércio varejista de móveis",
  "0151201": "Criação de bovinos para corte",
  "7112000": "Serviços de engenharia",
  "8121400": "Limpeza em prédios e em domicílios",
  "4530703": "Comércio a varejo de peças e acessórios novos para veículos automotores",
  "4530701": "Comércio por atacado de peças e acessórios novos para veículos automotores",
  "5510801": "Hotéis",
  "8513900": "Ensino fundamental",
  "4731800": "Comércio varejista de combustíveis para veículos automotores",
  "4644301": "Comércio atacadista de medicamentos e drogas de uso humano",
  "5611203": "Lanchonetes, casas de chá, de sucos e similares",
  "1813001": "Impressão de material para uso publicitário",
  "8650004": "Atividades de fisioterapia",
  "7311400": "Agências de publicidade",
  "4724500": "Comércio varejista de hortifrutigranjeiros",
  "4774100": "Comércio varejista de artigos de óptica",
};

type Porte = "ME" | "EPP" | "DEMAIS";
const PORTE: Record<Porte, string> = { ME: "MICRO EMPRESA", EPP: "EMPRESA DE PEQUENO PORTE", DEMAIS: "DEMAIS" };

interface Base {
  cnpj: string;
  razao: string;
  fantasia?: string;
  cnae: string;
  sec?: string[];
  cidade: string;
  uf?: string;
  abertura: string;
  porte: Porte;
  natureza?: string;
  simplesDesde?: string; // optante atual
  simplesSaiu?: { desde: string; saiu: string };
  mei?: string;
  regimes?: [number, string][];
  situacao?: { cod: 4 | 8; data: string; motivo: string };
}

function emp(b: Base): RegistroBruto {
  const filial = b.cnpj.slice(8, 12) !== "0001";
  return {
    cnpj: b.cnpj,
    razao_social: b.razao,
    nome_fantasia: b.fantasia ?? "",
    situacao_cadastral: b.situacao?.cod ?? 2,
    descricao_situacao_cadastral: b.situacao ? (b.situacao.cod === 8 ? "BAIXADA" : "INAPTA") : "ATIVA",
    data_situacao_cadastral: b.situacao?.data ?? b.abertura,
    descricao_motivo_situacao_cadastral: b.situacao?.motivo ?? "SEM MOTIVO",
    identificador_matriz_filial: filial ? 2 : 1,
    data_inicio_atividade: b.abertura,
    porte: PORTE[b.porte],
    natureza_juridica: b.natureza ?? (b.mei ? "Empresário (Individual)" : "Sociedade Empresária Limitada"),
    uf: b.uf ?? "SP",
    municipio: b.cidade,
    cnae_fiscal: b.cnae,
    cnae_fiscal_descricao: CNAE[b.cnae],
    cnaes_secundarios: (b.sec ?? []).map((c) => ({ codigo: c, descricao: CNAE[c] })),
    opcao_pelo_simples: !!(b.simplesDesde || b.mei),
    data_opcao_pelo_simples: b.simplesDesde ?? b.mei ?? b.simplesSaiu?.desde ?? null,
    data_exclusao_do_simples: b.simplesSaiu?.saiu ?? null,
    opcao_pelo_mei: !!b.mei,
    data_opcao_pelo_mei: b.mei ?? null,
    data_exclusao_do_mei: null,
    regime_tributario: (b.regimes ?? []).map(([ano, forma]) => ({ ano, forma_de_tributacao: forma })),
  };
}

const anos = (de: number, ate: number, forma: string): [number, string][] =>
  Array.from({ length: ate - de + 1 }, (_, i) => [de + i, forma]);

const BASES: Base[] = [
  { cnpj: "99864326000124", razao: "ROCHA & FILHOS DISTRIBUIDORA DE MATERIAIS DE CONSTRUCAO LTDA", fantasia: "ROCHA MATERIAIS", cnae: "4679699", cidade: "SOROCABA", abertura: "2009-03-16", porte: "EPP", simplesDesde: "2015-01-01" },
  { cnpj: "99864326000205", razao: "ROCHA & FILHOS DISTRIBUIDORA DE MATERIAIS DE CONSTRUCAO LTDA", fantasia: "ROCHA MATERIAIS ITU", cnae: "4679699", cidade: "ITU", abertura: "2019-08-05", porte: "EPP", simplesDesde: "2015-01-01" },
  { cnpj: "86224375000150", razao: "PADARIA E CONFEITARIA PAO DA VILA LTDA", fantasia: "PAO DA VILA", cnae: "1091102", sec: ["5611203"], cidade: "CAMPINAS", abertura: "2011-10-03", porte: "ME", simplesDesde: "2012-01-01" },
  { cnpj: "92984140000160", razao: "BELLACORTE CONFECCOES LTDA", fantasia: "BELLACORTE", cnae: "1412601", cidade: "AMERICANA", abertura: "2017-06-21", porte: "EPP", simplesDesde: "2018-01-01" },
  { cnpj: "85965565000166", razao: "MERCADINHO BOM PRECO DA VILA INDUSTRIAL LTDA", fantasia: "MERCADINHO BOM PRECO", cnae: "4712100", cidade: "CAMPINAS", abertura: "2009-11-30", porte: "ME", simplesDesde: "2010-01-01" },
  { cnpj: "90893536000176", razao: "CARVALHO E NOGUEIRA ADVOGADOS ASSOCIADOS", cnae: "6911701", cidade: "RIBEIRAO PRETO", abertura: "2014-02-10", porte: "DEMAIS", natureza: "Sociedade Simples Pura", regimes: anos(2019, 2024, "LUCRO PRESUMIDO") },
  { cnpj: "90650988000127", razao: "ODONTOVIDA CLINICA ODONTOLOGICA LTDA", fantasia: "ODONTOVIDA", cnae: "8630504", cidade: "JUNDIAI", abertura: "2015-09-14", porte: "ME", simplesDesde: "2016-01-01" },
  { cnpj: "97776465000170", razao: "AUTO MECANICA IRMAOS PRADO LTDA", fantasia: "IRMAOS PRADO", cnae: "4520001", sec: ["4530703"], cidade: "PIRACICABA", abertura: "2008-04-22", porte: "ME", simplesDesde: "2009-01-01" },
  { cnpj: "89708413000139", razao: "TRANSVALE LOGISTICA E TRANSPORTES LTDA", fantasia: "TRANSVALE", cnae: "4930202", cidade: "SAO JOSE DOS CAMPOS", abertura: "2012-07-02", porte: "DEMAIS", regimes: anos(2019, 2024, "LUCRO PRESUMIDO") },
  { cnpj: "81254562000163", razao: "CONSTRUTORA ALICERCE FORTE LTDA", fantasia: "ALICERCE FORTE", cnae: "4120400", cidade: "RIBEIRAO PRETO", abertura: "2016-05-09", porte: "DEMAIS", regimes: [...anos(2020, 2022, "LUCRO PRESUMIDO"), ...anos(2023, 2024, "LUCRO REAL")] },
  { cnpj: "80740412000105", razao: "PONTO ELETRICO INSTALACOES LTDA", fantasia: "PONTO ELETRICO", cnae: "4321500", cidade: "CAMPINAS", abertura: "2018-10-17", porte: "ME", simplesDesde: "2019-01-01" },
  { cnpj: "81046394000110", razao: "NEXO SISTEMAS E CONSULTORIA EM TECNOLOGIA LTDA", fantasia: "NEXO SISTEMAS", cnae: "6201501", cidade: "CAMPINAS", abertura: "2019-12-02", porte: "EPP", simplesDesde: "2020-01-01" },
  { cnpj: "85802105000117", razao: "PLASTIFLEX INDUSTRIA E COMERCIO DE EMBALAGENS LTDA", fantasia: "PLASTIFLEX", cnae: "2222600", cidade: "SUMARE", abertura: "2005-03-28", porte: "DEMAIS", regimes: anos(2019, 2024, "LUCRO REAL") },
  { cnpj: "83280786000175", razao: "MARIANA LOPES COSTA", fantasia: "STUDIO MARI CABELO E UNHA", cnae: "9602501", cidade: "VALINHOS", abertura: "2021-03-08", porte: "ME", mei: "2021-03-08" },
  { cnpj: "98868559000132", razao: "ACADEMIA CORPO EM MOVIMENTO LTDA", fantasia: "CORPO EM MOVIMENTO", cnae: "9313100", cidade: "INDAIATUBA", abertura: "2016-08-01", porte: "ME", simplesDesde: "2017-01-01" },
  { cnpj: "90181156000109", razao: "FARMACIA SAUDE DO BAIRRO LTDA", fantasia: "FARMACIA SAUDE DO BAIRRO", cnae: "4771701", cidade: "HORTOLANDIA", abertura: "2013-11-11", porte: "ME", simplesDesde: "2014-01-01" },
  { cnpj: "93520957000140", razao: "RESTAURANTE SABOR DE MINAS LTDA", fantasia: "SABOR DE MINAS", cnae: "5611201", cidade: "CAMPINAS", abertura: "2012-05-15", porte: "ME", simplesDesde: "2013-01-01" },
  { cnpj: "94854708000153", razao: "DOCE ENCANTO DISTRIBUIDORA DE DOCES LTDA", fantasia: "DOCE ENCANTO", cnae: "4637107", cidade: "LIMEIRA", abertura: "2015-07-20", porte: "EPP", simplesDesde: "2016-01-01" },
  { cnpj: "96462340000103", razao: "MOVEIS ARTESANAIS IPE LTDA", fantasia: "MOVEIS IPE", cnae: "3101200", sec: ["4754701"], cidade: "ITATIBA", abertura: "2010-09-06", porte: "ME", simplesDesde: "2011-01-01" },
  { cnpj: "92008633000164", razao: "AGROPECUARIA SANTA LUZIA LTDA", fantasia: "FAZENDA SANTA LUZIA", cnae: "0151201", cidade: "ARACATUBA", abertura: "2007-01-15", porte: "DEMAIS", regimes: anos(2019, 2024, "LUCRO PRESUMIDO") },
  { cnpj: "96118571000102", razao: "ENGEPLAN PROJETOS E ENGENHARIA LTDA", fantasia: "ENGEPLAN", cnae: "7112000", cidade: "SAO CARLOS", abertura: "2018-02-26", porte: "ME", simplesDesde: "2019-01-01" },
  { cnpj: "99120244000175", razao: "LIMPA BEM SERVICOS DE LIMPEZA E CONSERVACAO LTDA", fantasia: "LIMPA BEM", cnae: "8121400", cidade: "CAMPINAS", abertura: "2014-04-07", porte: "EPP", simplesDesde: "2015-01-01" },
  { cnpj: "92639956000156", razao: "AUTO PECAS ROTA 330 LTDA", fantasia: "ROTA 330 AUTO PECAS", cnae: "4530703", sec: ["4530701"], cidade: "RIBEIRAO PRETO", abertura: "2011-06-13", porte: "ME", simplesDesde: "2012-01-01" },
  { cnpj: "98892822000129", razao: "HOTEL RECANTO DAS AGUAS LTDA", fantasia: "RECANTO DAS AGUAS", cnae: "5510801", cidade: "AGUAS DE LINDOIA", abertura: "2006-10-02", porte: "EPP", regimes: anos(2019, 2024, "LUCRO PRESUMIDO") },
  { cnpj: "82391717000176", razao: "COLEGIO NOVO SABER LTDA", fantasia: "COLEGIO NOVO SABER", cnae: "8513900", cidade: "CAMPINAS", abertura: "2004-01-19", porte: "DEMAIS", regimes: anos(2019, 2024, "LUCRO PRESUMIDO") },
  { cnpj: "82975671000132", razao: "AUTO POSTO ESTRELA DO NORTE LTDA", fantasia: "POSTO ESTRELA DO NORTE", cnae: "4731800", cidade: "PAULINIA", abertura: "2003-08-11", porte: "DEMAIS", regimes: anos(2019, 2024, "LUCRO REAL") },
  { cnpj: "99514083000102", razao: "MEDIFARMA DISTRIBUIDORA DE MEDICAMENTOS LTDA", fantasia: "MEDIFARMA", cnae: "4644301", cidade: "CAMPINAS", abertura: "2010-03-01", porte: "DEMAIS", regimes: anos(2019, 2024, "LUCRO REAL") },
  { cnpj: "86899975000119", razao: "CANTINHO DO PASTEL LANCHONETE LTDA", fantasia: "CANTINHO DO PASTEL", cnae: "5611203", cidade: "CAMPINAS", abertura: "2016-03-14", porte: "ME", simplesSaiu: { desde: "2016-03-14", saiu: "2025-03-14" }, situacao: { cod: 8, data: "2025-03-14", motivo: "EXTINCAO POR ENCERRAMENTO LIQUIDACAO VOLUNTARIA" } },
  { cnpj: "96351340000136", razao: "GRAFICA RAPIDA IMPRESSAO CERTA LTDA", fantasia: "IMPRESSAO CERTA", cnae: "1813001", cidade: "CAMPINAS", abertura: "2013-09-09", porte: "ME", simplesSaiu: { desde: "2014-01-01", saiu: "2025-12-31" }, situacao: { cod: 4, data: "2026-05-18", motivo: "OMISSAO DE DECLARACOES" } },
  { cnpj: "89656546000109", razao: "CLINICA FISIO EQUILIBRIO LTDA", fantasia: "FISIO EQUILIBRIO", cnae: "8650004", cidade: "JUNDIAI", abertura: "2017-04-03", porte: "EPP", simplesSaiu: { desde: "2017-04-03", saiu: "2025-12-31" } },
  { cnpj: "91563946000111", razao: "AGENCIA PONTO CRIATIVO PUBLICIDADE LTDA", fantasia: "PONTO CRIATIVO", cnae: "7311400", cidade: "CAMPINAS", abertura: "2017-11-06", porte: "ME", simplesDesde: "2018-01-01" },
  { cnpj: "95253864000121", razao: "OTICA VISAO CLARA LTDA", fantasia: "VISAO CLARA", cnae: "4774100", cidade: "VINHEDO", abertura: "2013-07-08", porte: "ME", simplesDesde: "2014-01-01" },
  { cnpj: "BQUG728S000102", razao: "ROTA FRESCA HORTIFRUTI LTDA", fantasia: "ROTA FRESCA", cnae: "4724500", cidade: "CAMPINAS", abertura: "2026-09-22", porte: "ME", simplesDesde: "2026-09-22" },
];

const REGISTRO = new Map<string, RegistroBruto>(BASES.map((b) => [b.cnpj, emp(b)]));

export function buscarExemplo(cnpj: string): RegistroBruto | "nao_encontrado" | null {
  return REGISTRO.get(cnpj) ?? null;
}

/**
 * A planilha de exemplo, do jeito que um escritório costuma mandar: regime escrito de vários jeitos,
 * uma linha repetida, um dígito trocado, um número que o Excel transformou em notação científica.
 */
export const PLANILHA_EXEMPLO: [string, string, string][] = [
  ["CNPJ", "Regime", "Setor"],
  ["99.864.326/0001-24", "Simples", "Comércio"],
  ["86.224.375/0001-50", "SN", "Padaria"],
  ["92.984.140/0001-60", "Simples", "Indústria"],
  ["85.965.565/0001-66", "Simples", "Comércio"],
  ["90.893.536/0001-76", "Presumido", "Serviço"],
  ["90.650.988/0001-27", "Simples", "Saúde"],
  ["97.776.465/0001-70", "Simples", "Serviço"],
  ["89.708.413/0001-39", "L. Presumido", "Transporte"],
  ["81.254.562/0001-63", "Presumido", "Construção"],
  ["80.740.412/0001-05", "Simples", "Serviço"],
  ["81.046.394/0001-10", "Simples", "TI"],
  ["85.802.105/0001-17", "Lucro Real", "Indústria"],
  ["83.280.786/0001-75", "MEI", "Beleza"],
  ["98.868.559/0001-32", "", "Academia"],
  ["90.181.156/0001-09", "Simples", "Comércio"],
  ["93.520.957/0001-40", "Simples", "Restaurante"],
  ["94.854.708/0001-53", "Simples", "Distribuidora"],
  ["96.462.340/0001-03", "Simples", "Indústria"],
  ["92.008.633/0001-64", "Presumido", "Agro"],
  ["96.118.571/0001-02", "Simples", "Engenharia"],
  ["99.120.244/0001-75", "Simples", "Serviço"],
  ["92.639.956/0001-56", "Simples", "Comércio"],
  ["98.892.822/0001-29", "", "Hotel"],
  ["82.391.717/0001-76", "Presumido", "Educação"],
  ["82.975.671/0001-32", "Real", "Posto"],
  ["99.514.083/0001-02", "Lucro Real", "Distribuidora"],
  ["86.899.975/0001-19", "Simples", "Lanchonete"],
  ["96.351.340/0001-36", "Simples", "Gráfica"],
  ["89.656.546/0001-09", "Simples", "Saúde"],
  ["91.563.946/0001-11", "Simples", "Publicidade"],
  ["95.253.864/0001-21", "Simples", "Ótica"],
  ["99.864.326/0002-05", "Simples", "Comércio"],
  ["BQ.UG7.28S/0001-02", "Simples", "Hortifrúti"],
  ["85965565000166", "Simples", "Comércio"],
  ["88.219.935/0001-05", "Simples", "Pet shop"],
  ["9,29841E+13", "Simples", "Indústria"],
];

export const TOTAL_EXEMPLO = BASES.length;
