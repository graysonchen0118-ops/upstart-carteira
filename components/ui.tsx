"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { formatar, temLetra } from "@/lib/cnpj";
import { useCarteira } from "@/lib/store";

export function Cnpj({ valor, bruto }: { valor: string | null; bruto?: string }) {
  if (!valor) return <span className="cnpj">{bruto || "(vazio)"}</span>;
  const f = formatar(valor);
  if (!temLetra(valor)) return <span className="cnpj">{f}</span>;
  // destaca as letras do CNPJ alfanumérico
  return (
    <span className="cnpj letra" title="CNPJ alfanumérico, formato emitido desde julho de 2026">
      {f.split("").map((c, i) => (/[A-Z]/.test(c) ? <b key={i}>{c}</b> : <span key={i}>{c}</span>))}
    </span>
  );
}

export function Toasts() {
  const { estado, desfazer, fecharToast } = useCarteira();
  return (
    <div className="toasts" aria-live="polite">
      {estado.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tom}`} role="status">
          {t.tom === "ok" ? <CheckCircle2 size={18} /> : t.tom === "alerta" ? <AlertTriangle size={18} /> : <Info size={18} />}
          <span>{t.texto}</span>
          {t.desfazer && estado.anterior && (
            <button
              type="button"
              onClick={() => {
                desfazer();
                fecharToast(t.id);
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Skel({ w = "100%" }: { w?: string }) {
  return <span className="skel" style={{ width: w }} />;
}
