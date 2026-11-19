"use client";

import { AlertTriangle, ArrowRight, CircleCheck, CircleX, Layers, Scale, Store } from "lucide-react";
import { grupo, simplesQueVendeParaEmpresas } from "@/lib/analise";
import { useCarteira } from "@/lib/store";

export type Filtro = "todas" | "conferir" | "simplesB2B" | "fora" | "erro" | "prontas";

export function contar(linhas: ReturnType<typeof useCarteira>["estado"]["linhas"]) {
  const c = { todas: linhas.length, prontas: 0, conferir: 0, fora: 0, erro: 0, simplesB2B: 0, andamento: 0 };
  for (const l of linhas) {
    const g = grupo(l);
    if (g === "pronta") c.prontas++;
    else if (g === "conferir") c.conferir++;
    else if (g === "fora") c.fora++;
    else if (g === "erro") c.erro++;
    else c.andamento++;
    if (simplesQueVendeParaEmpresas(l)) c.simplesB2B++;
  }
  return c;
}

export default function Resumo({ filtro, setFiltro }: { filtro: Filtro; setFiltro: (f: Filtro) => void }) {
  const { estado } = useCarteira();
  const c = contar(estado.linhas);
  if (!estado.linhas.length) return null;

  const ir = (f: Filtro) => {
    setFiltro(f);
    document.getElementById("carteira")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const kpis: { f: Filtro; rot: string; num: number; pe: string; tom: string; ico: React.ReactNode }[] = [
    { f: "todas", rot: "Na lista", num: c.todas, pe: c.andamento ? `${c.andamento} em consulta` : "linhas da planilha", tom: "", ico: <Layers size={14} /> },
    { f: "prontas", rot: "Prontas", num: c.prontas, pe: "nada a conferir", tom: "t-ok", ico: <CircleCheck size={14} /> },
    { f: "conferir", rot: "A conferir", num: c.conferir, pe: "regime ou divergência", tom: "t-warn", ico: <AlertTriangle size={14} /> },
    { f: "simplesB2B", rot: "Simples que vende p/ empresas", num: c.simplesB2B, pe: "decisão a cada semestre", tom: "t-cyan", ico: <Scale size={14} /> },
    { f: "fora", rot: "Baixadas ou inaptas", num: c.fora, pe: "fora da rotina normal", tom: "t-bad", ico: <Store size={14} /> },
    { f: "erro", rot: "Não preenchidas", num: c.erro, pe: "número com erro ou sem registro", tom: "t-bad", ico: <CircleX size={14} /> },
  ];

  return (
    <section className="secao" id="resumo" aria-label="Resumo da carteira">
      <div className="kpis">
        {kpis.map((k, i) => (
          <button key={k.f} type="button" className={`kpi ${k.tom} ${filtro === k.f ? "ativo" : ""}`} style={{ animationDelay: `${i * 50}ms` }} onClick={() => ir(k.f)}>
            <div className="kpi-rot">
              {k.ico} {k.rot}
            </div>
            <div className="kpi-num">{k.num}</div>
            <div className="kpi-pe">{k.pe}</div>
          </button>
        ))}
      </div>
      {c.simplesB2B > 0 && (
        <div className="aviso-reforma">
          <Scale size={22} />
          <div>
            <p>
              <b>
                {c.simplesB2B} {c.simplesB2B === 1 ? "cliente do Simples vende" : "clientes do Simples vendem"} para outras empresas.
              </b>{" "}
              A partir de 2027, cada um escolhe por semestre se recolhe IBS e CBS dentro do DAS ou por fora. Dentro do DAS, o comprador só aproveita como crédito o que foi pago no DAS, e
              isso pesa na hora de fechar pedido. Quem optou por recolher por fora no 1º semestre de 2027 ainda pode desistir até 20/12/2026.
            </p>
            <button type="button" className="btn btn-p" onClick={() => ir("simplesB2B")}>
              Ver esses clientes <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
