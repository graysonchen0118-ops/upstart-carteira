"use client";

import { useState } from "react";
import { CarteiraProvider } from "@/lib/store";
import Cabecalho from "./Cabecalho";
import Carteira from "./Carteira";
import ComoLemos from "./ComoLemos";
import Ficha from "./Ficha";
import Importar from "./Importar";
import Resumo, { type Filtro } from "./Resumo";
import Rodape from "./Rodape";
import Fundo from "./three/Fundo";
import { Toasts } from "./ui";

export default function Aplicativo() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  return (
    <CarteiraProvider>
      <Fundo />
      <Cabecalho />
      <main className="conteudo">
        <section className="abertura">
          <div className="abertura-texto">
            <span className="chapeu">Importação de carteira</span>
            <h1>
              Cole os CNPJs da carteira. <span>O resto vem da Receita.</span>
            </h1>
            <p className="abertura-sub">
              Razão social, situação, atividade, município e opção pelo Simples ou MEI aparecem sozinhos. O que a base pública não tem, como o regime de quem não é do Simples e para quem a
              empresa vende, fica marcado para o escritório conferir.
            </p>
            <Importar />
          </div>
          <div className="abertura-palco" aria-hidden="true">
            <div className="legenda3d">
              <span>
                <i style={{ background: "var(--deep)" }} />
                CNPJ
              </span>
              <span>
                <i style={{ background: "var(--accent)" }} />
                preenchido
              </span>
              <span>
                <i style={{ background: "#e0a033" }} />
                conferir
              </span>
              <span>
                <i style={{ background: "var(--cyan)" }} />
                Simples que vende p/ empresas
              </span>
              <span>
                <i style={{ background: "#c94a63" }} />
                baixada ou inapta
              </span>
            </div>
          </div>
        </section>
        <Resumo filtro={filtro} setFiltro={setFiltro} />
        <Carteira filtro={filtro} setFiltro={setFiltro} />
        <ComoLemos />
      </main>
      <Rodape />
      <Ficha />
      <Toasts />
    </CarteiraProvider>
  );
}
