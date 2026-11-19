"use client";

import { FileDown, LayoutGrid } from "lucide-react";
import { exportarXlsx } from "@/lib/exportar";
import { useCarteira } from "@/lib/store";

export default function Cabecalho() {
  const { estado, avisar } = useCarteira();
  const tem = estado.linhas.some((l) => l.empresa);
  return (
    <header className="topo">
      <div className="topo-in">
        <a className="marca" href="#importar" aria-label="UpStart Carteira">
          <span className="marca-sinal">
            <LayoutGrid size={16} />
          </span>
          <span className="marca-nome">
            UpStart<em>Carteira</em>
          </span>
        </a>
        <nav className="topo-nav" aria-label="Seções">
          <a href="#importar">Importar</a>
          <a href="#carteira">Carteira</a>
          <a href="#como-lemos">De onde vem cada campo</a>
        </nav>
        <div className="topo-acoes">
          <button
            type="button"
            className="btn btn-sec btn-p"
            disabled={!tem}
            onClick={() => void exportarXlsx(estado.linhas).then(() => avisar("Planilha preenchida baixada."))}
          >
            <FileDown size={15} /> <span>Baixar planilha preenchida</span>
          </button>
        </div>
      </div>
    </header>
  );
}
