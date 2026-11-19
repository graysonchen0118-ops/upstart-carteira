import { buscarExemplo } from "./mock/registro";
import { normalizar } from "./normaliza";
import type { Empresa, RegistroBruto } from "./tipos";

export type Resultado =
  | { ok: true; empresa: Empresa }
  | { ok: false; motivo: "nao_encontrado" | "falha"; detalhe: string };

const espera = (ms: number, sinal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    sinal?.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new DOMException("cancelado", "AbortError"));
    });
  });

type NomeFonte = "brasilapi" | "minhareceita";
const URL: Record<NomeFonte, (c: string) => string> = {
  brasilapi: (c) => `https://brasilapi.com.br/api/cnpj/v1/${c}`,
  minhareceita: (c) => `https://minhareceita.org/${c}`,
};

// As duas consultas públicas limitam o ritmo por endereço. Cada fonte tem a sua vez:
// no mínimo 700 ms entre pedidos, e 10 s de descanso depois de um "muitas consultas" (429).
const livreEm: Record<NomeFonte, number> = { brasilapi: 0, minhareceita: 0 };
const INTERVALO = 700;

async function vez(f: NomeFonte, sinal: AbortSignal) {
  const agora = Date.now();
  const quando = Math.max(agora, livreEm[f]);
  livreEm[f] = quando + INTERVALO;
  if (quando > agora) await espera(quando - agora, sinal);
}

function maisLivre(excluir?: NomeFonte): NomeFonte {
  if (excluir) return excluir === "brasilapi" ? "minhareceita" : "brasilapi";
  return livreEm.brasilapi <= livreEm.minhareceita ? "brasilapi" : "minhareceita";
}

async function pedir(f: NomeFonte, cnpj: string, sinal: AbortSignal): Promise<{ status: number; corpo: RegistroBruto | null }> {
  await vez(f, sinal);
  const ctl = new AbortController();
  const corta = () => ctl.abort();
  sinal.addEventListener("abort", corta);
  const prazo = setTimeout(corta, 12000);
  try {
    const r = await fetch(URL[f](cnpj), { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (r.status === 429) livreEm[f] = Date.now() + 10000;
    if (r.status !== 200) return { status: r.status, corpo: null };
    return { status: 200, corpo: (await r.json()) as RegistroBruto };
  } catch (e) {
    if (sinal.aborted) throw e;
    return { status: 0, corpo: null };
  } finally {
    clearTimeout(prazo);
    sinal.removeEventListener("abort", corta);
  }
}

const NAO_ENCONTRADO =
  "O número é válido, mas não está na base pública do CNPJ. Empresa aberta nas últimas semanas costuma aparecer na atualização seguinte, que a Receita publica todo mês.";

/**
 * Consulta pública do CNPJ direto do navegador: BrasilAPI e Minha Receita, que leem a mesma base aberta
 * da Receita. Um "não encontrado" só vale depois que as duas concordam.
 */
export async function consultar(cnpj: string, sinal: AbortSignal): Promise<Resultado> {
  const exemplo = buscarExemplo(cnpj);
  if (exemplo) {
    await espera(500 + Math.random() * 900, sinal);
    if (exemplo === "nao_encontrado") return { ok: false, motivo: "nao_encontrado", detalhe: NAO_ENCONTRADO };
    return { ok: true, empresa: normalizar(exemplo, "exemplo") };
  }

  let naoAchou: NomeFonte | null = null;
  let ultimo = "";
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const f: NomeFonte = naoAchou ? maisLivre(naoAchou) : maisLivre();
    const r = await pedir(f, cnpj, sinal);
    if (r.status === 200 && r.corpo && r.corpo.razao_social) return { ok: true, empresa: normalizar(r.corpo, f) };
    if (r.status === 404) {
      if (naoAchou && naoAchou !== f) return { ok: false, motivo: "nao_encontrado", detalhe: NAO_ENCONTRADO };
      naoAchou = f;
      continue;
    }
    if (r.status === 400) return { ok: false, motivo: "falha", detalhe: "A consulta recusou o número. Confira os dígitos." };
    ultimo = r.status === 429 ? "muitas consultas seguidas" : r.status === 0 ? "sem resposta" : `resposta ${r.status}`;
    await espera(600, sinal);
  }
  if (naoAchou) return { ok: false, motivo: "nao_encontrado", detalhe: NAO_ENCONTRADO };
  return { ok: false, motivo: "falha", detalhe: `A consulta pública não respondeu (${ultimo}). Tente de novo em alguns segundos.` };
}

/** tempo aproximado para N consultas reais com as duas fontes alternando */
export function estimativaSegundos(n: number): number {
  return Math.ceil((n * INTERVALO) / 2 / 1000) + 2;
}
