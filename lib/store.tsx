"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { consultar } from "./consulta";
import { lerTabela, lerTexto, type Leitura } from "./entrada";
import { atualizarFolha } from "./folha";
import { PLANILHA_EXEMPLO } from "./mock/registro";
import type { Entrada, Linha, Regime, Vende } from "./tipos";

interface Toast {
  id: number;
  texto: string;
  tom: "ok" | "info" | "alerta";
  desfazer?: boolean;
}

interface Estado {
  linhas: Linha[];
  anterior: Linha[] | null;
  selecionada: string | null;
  toasts: Toast[];
  carregado: boolean;
}

type Acao =
  | { t: "carregar"; linhas: Linha[] }
  | { t: "substituir"; linhas: Linha[]; guardar: boolean }
  | { t: "anexar"; linhas: Linha[] }
  | { t: "desfazer" }
  | { t: "mexer"; id: string; f: (l: Linha) => Linha }
  | { t: "remover"; id: string }
  | { t: "selecionar"; id: string | null }
  | { t: "toast"; toast: Toast }
  | { t: "fecharToast"; id: number };

function reducer(s: Estado, a: Acao): Estado {
  switch (a.t) {
    case "carregar":
      return { ...s, linhas: a.linhas, carregado: true };
    case "substituir":
      return { ...s, linhas: a.linhas, anterior: a.guardar ? s.linhas : s.anterior, selecionada: null };
    case "anexar":
      return { ...s, linhas: [...s.linhas, ...a.linhas] };
    case "desfazer":
      return s.anterior
        ? { ...s, linhas: s.anterior.map((l) => (l.status === "consultando" ? { ...l, status: "fila" } : l)), anterior: null, selecionada: null }
        : s;
    case "mexer":
      return { ...s, linhas: s.linhas.map((l) => (l.id === a.id ? a.f(l) : l)) };
    case "remover":
      return { ...s, linhas: s.linhas.filter((l) => l.id !== a.id), selecionada: s.selecionada === a.id ? null : s.selecionada };
    case "selecionar":
      return { ...s, selecionada: a.id };
    case "toast":
      return { ...s, toasts: [...s.toasts.slice(-2), a.toast] };
    case "fecharToast":
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
  }
}

export interface ResumoImportacao {
  novas: number;
  jaNaLista: number;
  invalidas: number;
  ignoradas: number;
  zeros: number;
  repetidas: number;
}

interface Api {
  estado: Estado;
  importarTexto: (t: string) => ResumoImportacao;
  importarPlanilha: (linhas: (string | number | boolean | Date | null)[][]) => ResumoImportacao;
  carregarExemplo: () => ResumoImportacao;
  limpar: () => void;
  desfazer: () => void;
  reconsultar: (id: string) => void;
  reconsultarFalhas: () => void;
  corrigir: (id: string, texto: string) => boolean;
  confirmarRegime: (id: string, r: Regime | null) => void;
  confirmarVende: (id: string, v: Vende | null) => void;
  alternarConferida: (id: string) => void;
  observar: (id: string, texto: string) => void;
  remover: (id: string) => void;
  selecionar: (id: string | null) => void;
  avisar: (texto: string, tom?: Toast["tom"], desfazer?: boolean) => void;
  fecharToast: (id: number) => void;
}

const Ctx = createContext<Api | null>(null);
const CHAVE = "upstart-carteira-v1";
const SIMULTANEAS = 3;

let seq = 0;
const novoId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;

function paraLinhas(entradas: Entrada[], origem: Linha["origem"], ordem0: number): Linha[] {
  return entradas.map((e, i) => ({
    id: novoId(),
    ordem: ordem0 + i,
    entrada: e,
    status: e.cnpj ? "fila" : "invalido",
    empresa: null,
    erro: null,
    regimeConfirmado: null,
    vendeConfirmado: null,
    conferida: false,
    observacao: "",
    origem,
  }));
}

export function CarteiraProvider({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducer, { linhas: [], anterior: null, selecionada: null, toasts: [], carregado: false });
  const ref = useRef(estado);
  ref.current = estado;
  const emCurso = useRef(new Map<string, AbortController>());
  const toastSeq = useRef(1);

  // Lista salva neste navegador. Consulta que ficou pela metade volta para a fila.
  useEffect(() => {
    let linhas: Linha[] = [];
    try {
      const bruto = window.localStorage.getItem(CHAVE);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Linha[];
        if (Array.isArray(salvo)) linhas = salvo.map((l) => (l.status === "consultando" ? { ...l, status: "fila" } : l));
      }
    } catch {
      linhas = [];
    }
    despachar({ t: "carregar", linhas });
  }, []);

  useEffect(() => {
    if (!estado.carregado) return;
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(estado.linhas));
    } catch {
      /* navegador sem armazenamento: a lista vale só para esta visita */
    }
  }, [estado.linhas, estado.carregado]);

  // a folha em 3D acompanha a lista
  useEffect(() => {
    atualizarFolha(estado.linhas, estado.selecionada);
  }, [estado.linhas, estado.selecionada]);

  // filial sem registro próprio herda a sugestão de regime da matriz que estiver na lista
  useEffect(() => {
    for (const l of estado.linhas) {
      const e = l.empresa;
      if (l.status !== "ok" || !e || e.matriz || e.regimeSugerido.origem !== "sem_dado") continue;
      const m = estado.linhas.find((x) => x.status === "ok" && x.empresa?.matriz && x.empresa.cnpj.slice(0, 8) === e.cnpj.slice(0, 8) && x.empresa.regimeSugerido.valor);
      if (!m || !m.empresa) continue;
      const s = m.empresa.regimeSugerido;
      despachar({
        t: "mexer",
        id: l.id,
        f: (x) => (x.empresa ? { ...x, empresa: { ...x.empresa, regimeSugerido: { valor: s.valor, origem: s.origem, ano: s.ano, daMatriz: true } } } : x),
      });
    }
  }, [estado.linhas]);

  // fila de consultas: no máximo 3 de cada vez
  useEffect(() => {
    const fila = estado.linhas.filter((l) => l.status === "fila" && !emCurso.current.has(l.id));
    const livres = SIMULTANEAS - emCurso.current.size;
    fila.slice(0, Math.max(0, livres)).forEach((l) => {
      const ctl = new AbortController();
      emCurso.current.set(l.id, ctl);
      despachar({ t: "mexer", id: l.id, f: (x) => ({ ...x, status: "consultando", erro: null }) });
      consultar(l.entrada.cnpj!, ctl.signal)
        .then((r) => {
          if (ctl.signal.aborted) return;
          despachar({
            t: "mexer",
            id: l.id,
            f: (x) =>
              r.ok
                ? { ...x, status: "ok", empresa: r.empresa, erro: null }
                : { ...x, status: r.motivo === "nao_encontrado" ? "nao_encontrado" : "falha", empresa: null, erro: r.detalhe },
          });
        })
        .catch(() => {
          /* cancelada: a linha saiu da lista */
        })
        .finally(() => {
          emCurso.current.delete(l.id);
          // acorda a fila mesmo sem outra mudança na lista
          despachar({ t: "mexer", id: "__", f: (x) => x });
        });
    });
  }, [estado.linhas]);

  const cancelarTudo = useCallback(() => {
    emCurso.current.forEach((c) => c.abort());
    emCurso.current.clear();
  }, []);

  const avisar = useCallback((texto: string, tom: Toast["tom"] = "ok", desfazer = false) => {
    const id = toastSeq.current++;
    despachar({ t: "toast", toast: { id, texto, tom, desfazer } });
    setTimeout(() => despachar({ t: "fecharToast", id }), desfazer ? 7000 : 4200);
  }, []);

  const importar = useCallback((leitura: Leitura, origem: Linha["origem"]): ResumoImportacao => {
    const atuais = new Set(ref.current.linhas.map((l) => l.empresa?.cnpj ?? l.entrada.cnpj).filter(Boolean) as string[]);
    const novas = leitura.entradas.filter((e) => !e.cnpj || !atuais.has(e.cnpj));
    const ordem0 = ref.current.linhas.reduce((m, l) => Math.max(m, l.ordem + 1), 0);
    const linhas = paraLinhas(novas, origem, ordem0);
    if (linhas.length) despachar({ t: "anexar", linhas });
    return {
      novas: linhas.filter((l) => l.status === "fila").length,
      jaNaLista: leitura.entradas.length - novas.length,
      invalidas: linhas.filter((l) => l.status === "invalido").length,
      ignoradas: leitura.ignoradas,
      zeros: novas.filter((e) => e.zerosRecuperados).length,
      repetidas: novas.reduce((s, e) => s + e.repeticoes, 0),
    };
  }, []);

  const api = useMemo<Api>(
    () => ({
      estado,
      importarTexto: (t) => importar(lerTexto(t), "colado"),
      importarPlanilha: (rows) => importar(lerTabela(rows), "planilha"),
      carregarExemplo: () => {
        cancelarTudo();
        const leitura = lerTabela(PLANILHA_EXEMPLO);
        const tinha = ref.current.linhas.length > 0;
        const linhas = paraLinhas(leitura.entradas, "exemplo", 0);
        despachar({ t: "substituir", linhas, guardar: tinha });
        if (tinha) avisar("Carteira de exemplo no lugar da sua lista.", "info", true);
        return {
          novas: linhas.filter((l) => l.status === "fila").length,
          jaNaLista: 0,
          invalidas: linhas.filter((l) => l.status === "invalido").length,
          ignoradas: leitura.ignoradas,
          zeros: leitura.entradas.filter((e) => e.zerosRecuperados).length,
          repetidas: leitura.entradas.reduce((n, e) => n + e.repeticoes, 0),
        };
      },
      limpar: () => {
        cancelarTudo();
        despachar({ t: "substituir", linhas: [], guardar: true });
        avisar("Lista apagada.", "info", true);
      },
      desfazer: () => {
        cancelarTudo();
        despachar({ t: "desfazer" });
      },
      reconsultar: (id) => despachar({ t: "mexer", id, f: (x) => (x.entrada.cnpj ? { ...x, status: "fila", erro: null } : x) }),
      reconsultarFalhas: () =>
        ref.current.linhas
          .filter((l) => l.status === "falha" || l.status === "nao_encontrado")
          .forEach((l) => despachar({ t: "mexer", id: l.id, f: (x) => ({ ...x, status: "fila", erro: null }) })),
      corrigir: (id, texto) => {
        const e = lerTexto(texto).entradas[0];
        if (!e || !e.cnpj) {
          if (e) despachar({ t: "mexer", id, f: (x) => ({ ...x, entrada: { ...x.entrada, bruto: texto.trim(), problema: e.problema } }) });
          return false;
        }
        const ja = ref.current.linhas.some((l) => l.id !== id && (l.empresa?.cnpj ?? l.entrada.cnpj) === e.cnpj);
        if (ja) {
          avisar("Esse CNPJ já está na lista.", "alerta");
          return false;
        }
        despachar({
          t: "mexer",
          id,
          f: (x) => ({ ...x, status: "fila", erro: null, empresa: null, entrada: { ...x.entrada, bruto: texto.trim(), cnpj: e.cnpj, problema: null, zerosRecuperados: e.zerosRecuperados } }),
        });
        return true;
      },
      confirmarRegime: (id, r) => despachar({ t: "mexer", id, f: (x) => ({ ...x, regimeConfirmado: r }) }),
      confirmarVende: (id, v) => despachar({ t: "mexer", id, f: (x) => ({ ...x, vendeConfirmado: v }) }),
      alternarConferida: (id) => despachar({ t: "mexer", id, f: (x) => ({ ...x, conferida: !x.conferida }) }),
      observar: (id, texto) => despachar({ t: "mexer", id, f: (x) => ({ ...x, observacao: texto }) }),
      remover: (id) => {
        emCurso.current.get(id)?.abort();
        emCurso.current.delete(id);
        despachar({ t: "remover", id });
      },
      selecionar: (id) => despachar({ t: "selecionar", id }),
      avisar,
      fecharToast: (id) => despachar({ t: "fecharToast", id }),
    }),
    [estado, importar, cancelarTudo, avisar]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCarteira(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCarteira fora do CarteiraProvider");
  return c;
}
