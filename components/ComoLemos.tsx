"use client";

/* eslint-disable @next/next/no-img-element */
import { Briefcase, Building, Landmark, ReceiptText, Type } from "lucide-react";
import { useRef } from "react";
import { FOTOS } from "@/lib/fotos";

const CAMPOS = [
  {
    ico: <Building size={18} />,
    tit: "Razão social, situação, atividade e município",
    txt: "Vêm da base pública do CNPJ que a Receita publica todo mês. A consulta tenta a BrasilAPI e, se ela não responder, a Minha Receita, que lê a mesma base.",
    fonte: "Direto da Receita",
    tom: "ok",
  },
  {
    ico: <ReceiptText size={18} />,
    tit: "Simples e MEI",
    txt: "A opção atual está na base pública, com a data de entrada e de saída. Quando a planilha diz Simples e a Receita diz que a empresa saiu, a linha vai para conferir.",
    fonte: "Direto da Receita",
    tom: "ok",
  },
  {
    ico: <Landmark size={18} />,
    tit: "Lucro Presumido ou Real",
    txt: "Não existe opção atual pública. O que há é o registro anual, e o mais novo hoje é de 2024. A tela mostra esse histórico e pede confirmação do regime de 2026.",
    fonte: "Sugestão a confirmar",
    tom: "warn",
  },
  {
    ico: <Briefcase size={18} />,
    tit: "Para quem a empresa vende",
    txt: "Nenhuma base pública traz. A sugestão sai da atividade principal e das secundárias, e o escritório confirma com um clique. É a coluna que separa os dois casos abaixo.",
    fonte: "Sugestão a confirmar",
    tom: "warn",
  },
  {
    ico: <Type size={18} />,
    tit: "CNPJ com letras",
    txt: "Desde 31/07/2026 a Receita emite CNPJ com letras nas 12 primeiras posições; os 2 dígitos finais continuam números. A importação aceita os dois formatos e confere o dígito dos dois.",
    fonte: "Os dois formatos",
    tom: "ok",
  },
];

function Inclina({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="cartao foto-cartao"
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-3px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}

export default function ComoLemos() {
  return (
    <section className="secao" id="como-lemos">
      <div className="secao-cab">
        <div>
          <h2>De onde vem cada campo</h2>
          <p>O que é dado da Receita aparece direto. O que é dedução fica marcado como sugestão até alguém do escritório confirmar.</p>
        </div>
      </div>
      <div className="campos">
        {CAMPOS.map((c) => (
          <div key={c.tit} className="cartao campo">
            <div className="campo-ico">{c.ico}</div>
            <h3>{c.tit}</h3>
            <p>{c.txt}</p>
            <span className={`fonte ${c.tom}`}>{c.fonte}</span>
          </div>
        ))}
      </div>
      <div className="dupla">
        <Inclina>
          <figure>
            <img src={FOTOS.distribuidora.src} alt={FOTOS.distribuidora.alt} width={900} height={520} loading="lazy" />
            <figcaption>
              <span className="selo info">Simples</span>
              <span className="selo cyan">vende para construtoras</span>
            </figcaption>
          </figure>
          <div className="foto-texto">
            <h3>Distribuidora de materiais</h3>
            <p>O comprador é empresa e quer o crédito inteiro de IBS e CBS. Ficar no DAS pode custar cliente; sair muda o caixa. A conta muda a cada semestre.</p>
            <span className="veredito" style={{ color: "var(--deep)" }}>Pesa muito</span>
          </div>
        </Inclina>
        <Inclina>
          <figure>
            <img src={FOTOS.padaria.src} alt={FOTOS.padaria.alt} width={900} height={520} loading="lazy" />
            <figcaption>
              <span className="selo info">Simples</span>
              <span className="selo neutro">vende para o bairro</span>
            </figcaption>
          </figure>
          <div className="foto-texto">
            <h3>Padaria do bairro</h3>
            <p>Quem compra pão não toma crédito. Seguir no DAS costuma bastar, e o alerta para esse cliente pode ser só informativo.</p>
            <span className="veredito" style={{ color: "var(--accent)" }}>Quase não pesa</span>
          </div>
        </Inclina>
      </div>
    </section>
  );
}
