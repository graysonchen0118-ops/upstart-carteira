"use client";

import { AlertTriangle, Briefcase, Building, Check, CheckCheck, Copy, FileSpreadsheet, Info, Landmark, RefreshCw, Scale, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { irmas, nomeExibicao, pendencias, regimeFinal, simplesQueVendeParaEmpresas, vendeFinal } from "@/lib/analise";
import { formatar } from "@/lib/cnpj";
import { PROBLEMA_TEXTO } from "@/lib/entrada";
import { cnaeFormatado, dataBR } from "@/lib/normaliza";
import { useCarteira } from "@/lib/store";
import { REGIMES, VENDE_ROTULO, type Linha, type Vende } from "@/lib/tipos";
import { Cnpj } from "./ui";

const FONTE: Record<string, string> = {
  brasilapi: "base pública do CNPJ, via BrasilAPI",
  minhareceita: "base pública do CNPJ, via Minha Receita",
  exemplo: "carteira de exemplo (empresa inventada)",
};

function Conteudo({ l, todas }: { l: Linha; todas: Linha[] }) {
  const { confirmarRegime, confirmarVende, observar, corrigir, reconsultar, selecionar, avisar } = useCarteira();
  const [novo, setNovo] = useState(l.entrada.bruto);
  const e = l.empresa;
  const pend = pendencias(l);
  const irm = irmas(todas, l);

  if (!e) {
    return (
      <div className="gaveta-corpo">
        <div className="bloco">
          <h4>
            <AlertTriangle size={14} /> O que aconteceu
          </h4>
          <div className="alerta bad">
            <AlertTriangle size={16} />
            <span>
              {l.status === "invalido" && l.entrada.problema
                ? PROBLEMA_TEXTO[l.entrada.problema]
                : l.status === "fila" || l.status === "consultando"
                  ? "Consultando a base pública agora."
                  : l.erro}
            </span>
          </div>
          <p className="nota">
            Na planilha: linha {l.entrada.linha}, escrito <span className="cnpj">{l.entrada.bruto || "(vazio)"}</span>
            {l.entrada.declarado.regime ? `, regime "${l.entrada.declarado.regime}"` : ""}.
          </p>
        </div>
        <div className="bloco">
          <h4>Corrigir o número</h4>
          <form
            className="corrige"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (corrigir(l.id, novo)) avisar("Número corrigido, consultando.");
              else avisar("Esse número ainda não fecha. Confira os dígitos.", "alerta");
            }}
          >
            <input value={novo} onChange={(ev) => setNovo(ev.target.value)} aria-label="CNPJ corrigido" spellCheck={false} />
            <button type="submit" className="btn btn-pri btn-p">
              Consultar
            </button>
          </form>
          {(l.status === "falha" || l.status === "nao_encontrado") && (
            <button type="button" className="btn btn-sec btn-p" style={{ marginTop: 10 }} onClick={() => reconsultar(l.id)}>
              <RefreshCw size={14} /> Consultar de novo
            </button>
          )}
        </div>
      </div>
    );
  }

  const r = regimeFinal(l);
  const v = vendeFinal(l);
  const sug = e.regimeSugerido;
  return (
    <div className="gaveta-corpo">
      {pend.length > 0 && !l.conferida && (
        <div className="bloco">
          <h4>
            <AlertTriangle size={14} /> Para conferir
          </h4>
          {pend.map((p, i) => (
            <div key={i} className={`alerta ${p.tipo === "situacao" || p.tipo === "divergencia" ? "bad" : "warn"}`}>
              <AlertTriangle size={16} />
              <span>{p.texto}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bloco">
        <h4>
          <Landmark size={14} /> Regime
        </h4>
        <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>{r ?? "Não identificado"}</div>
        <p className="nota" style={{ marginTop: 4 }}>
          {!l.regimeConfirmado && sug.daMatriz ? "Veio da matriz, que está na lista: o regime vale para a empresa toda. " : ""}
          {l.regimeConfirmado
            ? "Confirmado pelo escritório."
            : sug.origem === "opcao_atual"
              ? `Opção atual registrada na Receita${(sug.valor === "MEI" ? e.mei.desde : e.simples.desde) ? `, desde ${dataBR((sug.valor === "MEI" ? e.mei.desde : e.simples.desde) as string)}` : ""}.`
              : sug.origem === "registro"
                ? `Último registro anual público, de ${sug.ano}. A base pública de Lucro Presumido e Real anda uns dois anos atrás, então vale confirmar o regime de 2026.`
                : "A empresa não é do Simples nem MEI, e a base pública ainda não tem registro anual dela."}
        </p>
        {e.historico.length > 0 && (
          <div className="hist" aria-label="Histórico de forma de tributação">
            {e.historico.slice(-6).map((h) => (
              <span key={h.ano}>
                <b>{h.ano}</b>
                {h.forma}
              </span>
            ))}
          </div>
        )}
        {e.simples.saiuEm && <p className="nota">Saiu do Simples em {dataBR(e.simples.saiuEm)}.</p>}
        <div className="escolhas" role="group" aria-label="Confirmar regime">
          {REGIMES.map((x) => (
            <button
              key={x}
              type="button"
              className={`escolha ${l.regimeConfirmado === x ? "on" : !l.regimeConfirmado && sug.valor === x ? "sug" : ""}`}
              onClick={() => {
                confirmarRegime(l.id, l.regimeConfirmado === x ? null : x);
                if (l.regimeConfirmado !== x) avisar(`${nomeExibicao(l)}: regime ${x} conferido.`);
              }}
            >
              {l.regimeConfirmado === x && <Check size={13} style={{ marginRight: 4, verticalAlign: -2 }} />}
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="bloco">
        <h4>
          <Briefcase size={14} /> Para quem vende
        </h4>
        <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>
          {v ? VENDE_ROTULO[v] : "Sem sugestão"}{" "}
          {simplesQueVendeParaEmpresas(l) && (
            <span className="selo cyan" style={{ marginLeft: 6 }}>
              <Scale size={12} /> decisão de IBS e CBS a cada semestre
            </span>
          )}
        </div>
        <p className="nota" style={{ marginTop: 4 }}>
          {l.vendeConfirmado ? "Confirmado pelo escritório." : `${e.vendeSugerido.motivo} Nenhuma base pública traz esse dado, por isso fica como sugestão até alguém confirmar.`}
        </p>
        <div className="escolhas" role="group" aria-label="Confirmar para quem vende">
          {(["empresas", "consumidor", "ambos"] as Vende[]).map((x) => (
            <button
              key={x}
              type="button"
              className={`escolha ${l.vendeConfirmado === x ? "on" : !l.vendeConfirmado && e.vendeSugerido.valor === x ? "sug" : ""}`}
              onClick={() => confirmarVende(l.id, l.vendeConfirmado === x ? null : x)}
            >
              {l.vendeConfirmado === x && <Check size={13} style={{ marginRight: 4, verticalAlign: -2 }} />}
              {VENDE_ROTULO[x]}
            </button>
          ))}
        </div>
        {r === "Simples Nacional" && e.situacao === "ativa" && (
          <div className="alerta info">
            <Info size={16} />
            <span>
              {v === "consumidor"
                ? "Vendendo para o consumidor final, seguir no DAS costuma bastar: quem compra não toma crédito."
                : "Os compradores empresa querem o crédito inteiro de IBS e CBS. Ficar no DAS pode custar cliente, sair muda o caixa: é conversa para o consultor antes de cada semestre."}
            </span>
          </div>
        )}
      </div>

      <div className="bloco">
        <h4>
          <Building size={14} /> Cadastro
        </h4>
        <dl className="par">
          <dt>CNPJ</dt>
          <dd>
            <Cnpj valor={e.cnpj} />
            <button
              type="button"
              className="copiar"
              aria-label="Copiar CNPJ"
              onClick={() => {
                void navigator.clipboard?.writeText(formatar(e.cnpj)).then(
                  () => avisar("CNPJ copiado."),
                  () => avisar("Não deu para copiar neste navegador.", "alerta")
                );
              }}
            >
              <Copy size={13} />
            </button>{" "}
            <span className="selo fil">{e.matriz ? "matriz" : "filial"}</span>
          </dd>
          <dt>Situação</dt>
          <dd>
            {e.situacaoTexto}
            {e.dataSituacao ? ` desde ${dataBR(e.dataSituacao)}` : ""}
            {e.motivo ? ` · ${e.motivo}` : ""}
          </dd>
          <dt>Atividade</dt>
          <dd>{e.cnae ? `${cnaeFormatado(e.cnae.codigo)} · ${e.cnae.descricao}` : "Não informada"}</dd>
          {e.secundarios.length > 0 && (
            <>
              <dt>Secundárias</dt>
              <dd>
                {e.secundarios.slice(0, 4).map((s) => (
                  <div key={s.codigo}>
                    {cnaeFormatado(s.codigo)} · {s.descricao}
                  </div>
                ))}
                {e.secundarios.length > 4 && <div className="sub">e mais {e.secundarios.length - 4}</div>}
              </dd>
            </>
          )}
          <dt>Setor</dt>
          <dd>{e.setor}</dd>
          <dt>Município</dt>
          <dd>
            {e.municipio}
            {e.uf ? `/${e.uf}` : ""}
          </dd>
          <dt>Abertura</dt>
          <dd>{e.abertura ? dataBR(e.abertura) : "Não informada"}</dd>
          <dt>Porte</dt>
          <dd>{e.porte ?? "Não informado"}</dd>
          <dt>Natureza</dt>
          <dd>{e.natureza ?? "Não informada"}</dd>
        </dl>
        {irm.length > 0 && (
          <div className="alerta info">
            <Info size={16} />
            <span>
              Mesma empresa na lista: {irm.map((x, i) => (
                <button key={x.id} type="button" className="btn-fant copiar" style={{ fontWeight: 600, color: "var(--accent)" }} onClick={() => selecionar(x.id)}>
                  {i > 0 ? ", " : ""}
                  {x.empresa ? (x.empresa.matriz ? "matriz" : "filial") : ""} {formatar(x.empresa?.cnpj ?? x.entrada.cnpj ?? "")}
                </button>
              ))}
              . O regime vale para a empresa toda; os prazos de cada estabelecimento ficam separados.
            </span>
          </div>
        )}
        <p className="nota">Fonte: {FONTE[e.fonte]}.</p>
      </div>

      <div className="bloco">
        <h4>
          <FileSpreadsheet size={14} /> Na planilha original
        </h4>
        <dl className="par">
          <dt>Linha</dt>
          <dd>{l.entrada.linha}</dd>
          <dt>Escrito como</dt>
          <dd className="cnpj">{l.entrada.bruto}</dd>
          <dt>Regime</dt>
          <dd>{l.entrada.declarado.regime || "em branco"}</dd>
          {l.entrada.declarado.setor && (
            <>
              <dt>Setor</dt>
              <dd>{l.entrada.declarado.setor}</dd>
            </>
          )}
        </dl>
        {l.entrada.zerosRecuperados && <p className="nota">O Excel tinha apagado os zeros à esquerda; o número foi completado e o dígito verificador confere.</p>}
        {l.entrada.repeticoes > 0 && <p className="nota">Aparecia {l.entrada.repeticoes + 1} vezes na planilha; ficou uma linha só.</p>}
      </div>

      <div className="bloco">
        <h4>Observação do escritório</h4>
        <textarea className="obs" value={l.observacao} onChange={(ev) => observar(l.id, ev.target.value)} placeholder="Ex.: confirmar com o cliente o regime de 2026 na próxima reunião" />
      </div>
    </div>
  );
}

export default function Ficha() {
  const { estado, selecionar, alternarConferida, remover, avisar } = useCarteira();
  const [montado, setMontado] = useState(false);
  const l = estado.linhas.find((x) => x.id === estado.selecionada) ?? null;
  const aberto = !!l;

  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && selecionar(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, selecionar]);

  if (!montado) return null;
  return createPortal(
    <>
      <div className={`veu ${aberto ? "on" : ""}`} onClick={() => selecionar(null)} />
      <div className="gaveta-clip">
        <aside className={`gaveta ${aberto ? "on" : ""}`} aria-hidden={!aberto} aria-label="Ficha da empresa">
          {l && (
            <>
              <div className="gaveta-cab">
                <div style={{ minWidth: 0 }}>
                  <h3>{nomeExibicao(l)}</h3>
                  {l.empresa?.fantasia && <div className="emp-razao">{l.empresa.razao}</div>}
                </div>
                <button type="button" className="x" onClick={() => selecionar(null)} aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              <Conteudo key={l.id} l={l} todas={estado.linhas} />
              <div className="gaveta-pe">
                <button
                  type="button"
                  className="btn btn-perigo btn-p"
                  onClick={() => {
                    remover(l.id);
                    avisar("Empresa removida da carteira.", "info");
                  }}
                >
                  <Trash2 size={14} /> Remover
                </button>
                {l.empresa && (
                  <button
                    type="button"
                    className={`btn btn-p ${l.conferida ? "btn-sec" : "btn-pri"}`}
                    onClick={() => {
                      alternarConferida(l.id);
                      if (!l.conferida) avisar(`${nomeExibicao(l)} marcada como conferida.`);
                    }}
                  >
                    <CheckCheck size={15} /> {l.conferida ? "Conferida" : "Marcar como conferida"}
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </>,
    document.body
  );
}
