"use client";

import { AlertTriangle, CheckCheck, FileDown, RefreshCw, Scale, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { grupo, nomeExibicao, pendencias, regimeFinal, simplesQueVendeParaEmpresas, vendeFinal } from "@/lib/analise";
import { PROBLEMA_TEXTO } from "@/lib/entrada";
import { exportarCsv, exportarXlsx } from "@/lib/exportar";
import { cnaeFormatado } from "@/lib/normaliza";
import { useCarteira } from "@/lib/store";
import { VENDE_ROTULO, type Linha } from "@/lib/tipos";
import { contar, type Filtro } from "./Resumo";
import { Cnpj, Skel } from "./ui";

const POR_PAGINA = 50;

function SeloSituacao({ l }: { l: Linha }) {
  if (l.status === "fila") return <span className="selo neutro">Na fila</span>;
  if (l.status === "consultando")
    return (
      <span className="carregando">
        <span className="giro" /> consultando
      </span>
    );
  if (l.status === "invalido") return <span className="selo bad">CNPJ inválido</span>;
  if (l.status === "nao_encontrado") return <span className="selo bad">Sem registro</span>;
  if (l.status === "falha") return <span className="selo warn">Sem resposta</span>;
  const s = l.empresa!.situacao;
  return <span className={`selo ${s === "ativa" ? "ok" : "bad"}`}>{l.empresa!.situacaoTexto}</span>;
}

export function SeloRegime({ l }: { l: Linha }) {
  const e = l.empresa;
  if (!e) return null;
  const r = regimeFinal(l);
  if (l.regimeConfirmado) return <span className="selo ok">{r} · conferido</span>;
  const m = e.regimeSugerido.daMatriz ? " · matriz" : "";
  if (e.regimeSugerido.origem === "opcao_atual") return <span className="selo info">{r}{m}</span>;
  if (e.regimeSugerido.origem === "registro") return <span className="selo warn">{r ?? "?"} em {e.regimeSugerido.ano}{m}</span>;
  return <span className="selo warn">a confirmar</span>;
}

function SeloVende({ l }: { l: Linha }) {
  const v = vendeFinal(l);
  if (!l.empresa || !v) return <span className="sub">sem sugestão</span>;
  return (
    <div>
      <span className={`selo ${simplesQueVendeParaEmpresas(l) ? "cyan" : "neutro"}`}>
        {simplesQueVendeParaEmpresas(l) && <Scale size={12} />}
        {VENDE_ROTULO[v]}
      </span>
      <div className="sub">{l.vendeConfirmado ? "conferido" : "sugestão pelo CNAE"}</div>
    </div>
  );
}

function Pend({ l }: { l: Linha }) {
  if (l.status === "fila" || l.status === "consultando") return <Skel w="60px" />;
  const p = pendencias(l);
  if (l.status !== "ok") return <span className="pend-n erro">erro</span>;
  if (l.conferida) return <span className="pend-n zero"><CheckCheck size={13} /> conferida</span>;
  if (!p.length) return <span className="pend-n zero">ok</span>;
  return (
    <span className="pend-n">
      <AlertTriangle size={12} /> {p.length}
    </span>
  );
}

function filtrar(l: Linha, f: Filtro) {
  const g = grupo(l);
  if (f === "todas") return true;
  if (f === "prontas") return g === "pronta";
  if (f === "conferir") return g === "conferir";
  if (f === "fora") return g === "fora";
  if (f === "erro") return g === "erro";
  return simplesQueVendeParaEmpresas(l);
}

const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Carteira({ filtro, setFiltro }: { filtro: Filtro; setFiltro: (f: Filtro) => void }) {
  const { estado, selecionar, limpar, reconsultarFalhas, avisar } = useCarteira();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"planilha" | "nome" | "pendencias">("planilha");
  const [paginas, setPaginas] = useState(1);
  const linhas = estado.linhas;
  const c = contar(linhas);

  const vis = useMemo(() => {
    const q = semAcento(busca.trim());
    const qDig = q.replace(/[.\-/\s]/g, "");
    let r = linhas.filter((l) => filtrar(l, filtro));
    if (q)
      r = r.filter((l) => {
        const e = l.empresa;
        const alvo = semAcento([e?.razao, e?.fantasia, e?.municipio, e?.setor, e?.cnae?.descricao, l.entrada.bruto].filter(Boolean).join(" "));
        const cnpj = (e?.cnpj ?? l.entrada.cnpj ?? "").toLowerCase();
        return alvo.includes(q) || (qDig.length >= 3 && cnpj.includes(qDig));
      });
    if (ordem === "nome") r = [...r].sort((a, b) => (a.empresa ? 0 : 1) - (b.empresa ? 0 : 1) || nomeExibicao(a).localeCompare(nomeExibicao(b), "pt-BR"));
    if (ordem === "pendencias") r = [...r].sort((a, b) => pendencias(b).length - pendencias(a).length || a.ordem - b.ordem);
    return r;
  }, [linhas, filtro, busca, ordem]);

  const abas: { f: Filtro; rot: string; n: number }[] = [
    { f: "todas", rot: "Todas", n: c.todas },
    { f: "conferir", rot: "A conferir", n: c.conferir },
    { f: "simplesB2B", rot: "Simples que vende p/ empresas", n: c.simplesB2B },
    { f: "fora", rot: "Baixadas ou inaptas", n: c.fora },
    { f: "erro", rot: "Não preenchidas", n: c.erro },
  ];
  const mostrar = vis.slice(0, paginas * POR_PAGINA);
  const temFalha = linhas.some((l) => l.status === "falha");

  return (
    <section className="secao" id="carteira">
      <div className="secao-cab">
        <div>
          <h2>Carteira</h2>
          <p>Clique numa empresa para ver de onde veio cada dado, confirmar o regime e para quem ela vende.</p>
        </div>
        {linhas.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {temFalha && (
              <button type="button" className="btn btn-sec btn-p" onClick={reconsultarFalhas}>
                <RefreshCw size={15} /> Consultar de novo
              </button>
            )}
            <button
              type="button"
              className="btn btn-sec btn-p"
              onClick={() => {
                void exportarXlsx(linhas).then(() => avisar("Planilha preenchida baixada."));
              }}
            >
              <FileDown size={15} /> Excel
            </button>
            <button
              type="button"
              className="btn btn-sec btn-p"
              onClick={() => {
                exportarCsv(linhas);
                avisar("CSV baixado, separado por ponto e vírgula.");
              }}
            >
              CSV
            </button>
            <button type="button" className="btn btn-perigo btn-p" onClick={limpar}>
              <Trash2 size={15} /> Limpar
            </button>
          </div>
        )}
      </div>

      {linhas.length === 0 ? (
        <div className="cartao vazio">
          <b>A carteira ainda está vazia</b>
          Cole os CNPJs lá em cima, envie a planilha ou use a carteira de exemplo.
        </div>
      ) : (
        <>
          <div className="ferramentas">
            <div className="abas" role="tablist">
              {abas.map((a) => (
                <button
                  key={a.f}
                  type="button"
                  role="tab"
                  aria-selected={filtro === a.f}
                  className={`aba ${filtro === a.f ? "ativa" : ""}`}
                  onClick={() => {
                    setFiltro(a.f);
                    setPaginas(1);
                  }}
                >
                  {a.rot} <em>{a.n}</em>
                </button>
              ))}
            </div>
            <div className="filtro-dir">
            <div className="busca">
              <Search size={16} />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPaginas(1);
                }}
                placeholder="Buscar nome, CNPJ, cidade ou atividade"
                aria-label="Buscar na carteira"
              />
            </div>
            <select className="ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
              <option value="planilha">Ordem da planilha</option>
              <option value="nome">Nome</option>
              <option value="pendencias">Mais pendências primeiro</option>
            </select>
            </div>
          </div>

          <div className="cartao tabela-caixa">
            {vis.length === 0 ? (
              <div className="vazio">
                <b>Nada nesse filtro</b>
                {busca ? "Nenhuma empresa bate com a busca." : "Quando houver empresas nesse grupo, elas aparecem aqui."}
              </div>
            ) : (
              <>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Situação</th>
                      <th>Regime</th>
                      <th>Atividade</th>
                      <th>Vende para</th>
                      <th>Município</th>
                      <th>Conferir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostrar.map((l, i) => (
                      <tr key={l.id} className={estado.selecionada === l.id ? "sel" : ""} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }} onClick={() => selecionar(l.id)}>
                        <td style={{ maxWidth: 320 }}>
                          {l.empresa ? (
                            <>
                              <div className="emp-nome">
                                {nomeExibicao(l)}
                                {!l.empresa.matriz && <span className="selo fil">filial</span>}
                              </div>
                              {l.empresa.fantasia && <div className="emp-razao">{l.empresa.razao}</div>}
                              <Cnpj valor={l.empresa.cnpj} />
                            </>
                          ) : (
                            <>
                              <Cnpj valor={l.entrada.cnpj} bruto={l.entrada.bruto} />
                              {l.status === "invalido" && l.entrada.problema && <div className="sub" style={{ color: "var(--bad)" }}>{PROBLEMA_TEXTO[l.entrada.problema]}</div>}
                              {(l.status === "nao_encontrado" || l.status === "falha") && <div className="sub">{l.erro}</div>}
                              {(l.status === "fila" || l.status === "consultando") && (
                                <div style={{ marginTop: 6 }}>
                                  <Skel w="70%" />
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          <SeloSituacao l={l} />
                        </td>
                        <td>{l.empresa ? <SeloRegime l={l} /> : l.status === "consultando" || l.status === "fila" ? <Skel w="80px" /> : null}</td>
                        <td style={{ maxWidth: 220 }}>
                          {l.empresa?.cnae ? (
                            <>
                              <div>{l.empresa.setor}</div>
                              <div className="sub">
                                {cnaeFormatado(l.empresa.cnae.codigo)} · {l.empresa.cnae.descricao.length > 48 ? l.empresa.cnae.descricao.slice(0, 46) + "…" : l.empresa.cnae.descricao}
                              </div>
                            </>
                          ) : l.status === "consultando" || l.status === "fila" ? (
                            <Skel w="110px" />
                          ) : null}
                        </td>
                        <td>{l.empresa ? <SeloVende l={l} /> : null}</td>
                        <td>{l.empresa ? `${l.empresa.municipio ?? ""}${l.empresa.uf ? `/${l.empresa.uf}` : ""}` : null}</td>
                        <td>
                          <Pend l={l} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="cartoes-m">
                  {mostrar.map((l, i) => (
                    <div key={l.id} className="cm" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }} onClick={() => selecionar(l.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && selecionar(l.id)}>
                      <div className="cm-topo">
                        <div style={{ minWidth: 0 }}>
                          <div className="emp-nome">{nomeExibicao(l)}</div>
                          <Cnpj valor={l.empresa?.cnpj ?? l.entrada.cnpj} bruto={l.entrada.bruto} />
                        </div>
                        <Pend l={l} />
                      </div>
                      {l.empresa ? (
                        <div className="cm-selos">
                          <SeloSituacao l={l} />
                          <SeloRegime l={l} />
                          {simplesQueVendeParaEmpresas(l) && (
                            <span className="selo cyan">
                              <Scale size={12} /> vende p/ empresas
                            </span>
                          )}
                          {!l.empresa.matriz && <span className="selo fil">filial</span>}
                          <span className="selo neutro">{l.empresa.setor}</span>
                        </div>
                      ) : (
                        <div className="cm-selos">
                          <SeloSituacao l={l} />
                        </div>
                      )}
                      {l.status === "invalido" && l.entrada.problema && <div className="sub" style={{ color: "var(--bad)", marginTop: 6 }}>{PROBLEMA_TEXTO[l.entrada.problema]}</div>}
                    </div>
                  ))}
                </div>
                {vis.length > mostrar.length && (
                  <div className="mais">
                    <button type="button" className="btn btn-sec btn-p" onClick={() => setPaginas((p) => p + 1)}>
                      Mostrar mais {Math.min(POR_PAGINA, vis.length - mostrar.length)} de {vis.length - mostrar.length}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="rodape-tab">
            <span>
              Mostrando {mostrar.length} de {vis.length}
              {filtro !== "todas" || busca ? ` (filtro ativo, ${linhas.length} no total)` : ""}
            </span>
            <span>Dados públicos do CNPJ, Receita Federal. A carteira de exemplo usa empresas inventadas.</span>
          </div>
        </>
      )}
    </section>
  );
}
