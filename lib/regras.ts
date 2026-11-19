import type { Regime, Vende } from "./tipos";

/** seção da CNAE 2.3 pela divisão (2 primeiros dígitos), com o comércio separado em atacado e varejo */
export function setorPorCnae(codigo: string | null): string {
  if (!codigo) return "Sem atividade informada";
  const d = Number(codigo.slice(0, 2));
  if (d <= 3) return "Agropecuária";
  if (d <= 9) return "Indústria extrativa";
  if (d <= 33) return "Indústria";
  if (d === 35) return "Energia e gás";
  if (d <= 39) return "Água, esgoto e resíduos";
  if (d <= 43) return "Construção";
  if (d === 45) return "Veículos e peças";
  if (d === 46) return "Comércio atacadista";
  if (d === 47) return "Comércio varejista";
  if (d <= 53) return "Transporte e armazenagem";
  if (d <= 56) return "Hospedagem e alimentação";
  if (d <= 63) return "Informação e tecnologia";
  if (d <= 66) return "Financeiro e seguros";
  if (d === 68) return "Imobiliário";
  if (d <= 75) return "Serviços profissionais";
  if (d <= 82) return "Serviços administrativos";
  if (d === 84) return "Administração pública";
  if (d === 85) return "Educação";
  if (d <= 88) return "Saúde";
  if (d <= 93) return "Cultura, esporte e lazer";
  if (d <= 96) return "Outros serviços";
  if (d === 97) return "Serviços domésticos";
  return "Organismos internacionais";
}

// Exceções conhecidas, onde a divisão engana.
const EXCECOES: Record<string, Vende> = {
  "1091102": "consumidor", // padaria com produção própria é indústria na CNAE, mas vende no balcão
  "1093702": "consumidor", // chocolate artesanal
  "5620101": "empresas", // fornecimento de refeições para empresas
  "5620102": "ambos", // bufê para eventos
  "4530701": "empresas", // atacado de peças
  "4530702": "empresas",
  "8599604": "empresas", // treinamento gerencial
  "6911701": "ambos", // advocacia
  "4744099": "ambos", // material de construção no varejo vende para obra e para empreiteiro
  "4744001": "ambos",
  "4744005": "ambos",
  "4742300": "ambos",
  "4743100": "ambos",
};

function porDivisao(codigo: string): Vende | null {
  const d = Number(codigo.slice(0, 2));
  const g = Number(codigo.slice(0, 3));
  if (d <= 33) return "empresas"; // agro, extração e indústria
  if (d === 35) return "ambos";
  if (d <= 39) return "ambos";
  if (d === 41) return "ambos";
  if (d <= 43) return "empresas";
  if (d === 45) return g === 451 ? "ambos" : g === 452 ? "ambos" : g === 453 ? "consumidor" : "ambos";
  if (d === 46) return "empresas";
  if (d === 47) return "consumidor";
  if (d === 49) return g === 493 ? "empresas" : "consumidor";
  if (d <= 51) return "ambos";
  if (d === 52) return "empresas";
  if (d === 53) return "ambos";
  if (d === 55) return "consumidor";
  if (d === 56) return "consumidor";
  if (d <= 61) return "ambos";
  if (d <= 63) return "empresas";
  if (d <= 68) return "ambos";
  if (d <= 74) return "empresas";
  if (d === 75) return "consumidor";
  if (d === 77) return "ambos";
  if (d === 78) return "empresas";
  if (d === 79) return "consumidor";
  if (d <= 82) return "empresas";
  if (d === 84) return null;
  if (d <= 88) return "consumidor";
  if (d <= 93) return "consumidor";
  if (d === 94) return "ambos";
  if (d <= 97) return "consumidor";
  return null;
}

export function vendePorCnae(codigo: string): Vende | null {
  return EXCECOES[codigo] ?? porDivisao(codigo);
}

const VENDE_FRASE: Record<Vende, string> = {
  empresas: "costuma vender para outras empresas",
  consumidor: "costuma vender para o consumidor final",
  ambos: "costuma vender tanto para empresas quanto para o consumidor",
};

export function sugerirVende(principal: string | null, secundarios: string[]): { valor: Vende | null; motivo: string } {
  if (!principal) return { valor: null, motivo: "Sem CNAE na base pública." };
  const p = vendePorCnae(principal);
  if (!p) return { valor: null, motivo: "A atividade principal não indica para quem a empresa vende." };
  const outros = new Set(secundarios.map(vendePorCnae).filter((v): v is Vende => !!v));
  const mistura = [...outros].some((v) => v !== p);
  if (mistura && p !== "ambos") {
    return { valor: "ambos", motivo: `A atividade principal ${VENDE_FRASE[p]}, mas há atividade secundária que aponta para o outro lado.` };
  }
  return { valor: p, motivo: `Pela atividade principal: quem tem esse CNAE ${VENDE_FRASE[p]}.` };
}

/** "SN", "simples", "L. Presumido"... para o nome do regime */
export function normalizarRegime(s: string | null | undefined): Regime | null {
  if (!s) return null;
  const t = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (/\bmei\b|microempreendedor/.test(t)) return "MEI";
  if (/simples|^sn$/.test(t)) return "Simples Nacional";
  if (/presum|^lp$/.test(t)) return "Lucro Presumido";
  if (/arbitr/.test(t)) return "Lucro Arbitrado";
  if (/real|^lr$/.test(t)) return "Lucro Real";
  if (/imun|isent/.test(t)) return "Imune ou isenta";
  return null;
}

/** a forma de tributação do registro anual, em texto de gente */
export function formaLegivel(f: string): string {
  const r = normalizarRegime(f);
  if (r) return r;
  return f.charAt(0) + f.slice(1).toLowerCase();
}
