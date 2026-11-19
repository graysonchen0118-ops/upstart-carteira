"use client";

import { ArrowDown, Building2, ClipboardPaste, Download, FileSpreadsheet, Hash, Loader2, ShieldCheck, Sparkles, Type } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { estimativaSegundos } from "@/lib/consulta";
import { lerTexto } from "@/lib/entrada";
import { baixarModelo } from "@/lib/exportar";
import { TOTAL_EXEMPLO } from "@/lib/mock/registro";
import { useCarteira, type ResumoImportacao } from "@/lib/store";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function frase(r: ResumoImportacao): string {
  const partes: string[] = [];
  if (r.novas) partes.push(`${plural(r.novas, "CNPJ", "CNPJs")} na fila`);
  if (r.invalidas) partes.push(`${plural(r.invalidas, "com erro", "com erro")}`);
  if (r.zeros) partes.push(`${plural(r.zeros, "com zeros à esquerda recuperados", "com zeros à esquerda recuperados")}`);
  if (r.repetidas) partes.push(`${plural(r.repetidas, "repetido juntado", "repetidos juntados")}`);
  if (r.jaNaLista) partes.push(`${plural(r.jaNaLista, "já estava", "já estavam")} na lista`);
  if (!partes.length) return "Nenhum CNPJ encontrado nesse texto.";
  return partes.join(" · ");
}

export default function Importar() {
  const { estado, importarTexto, importarPlanilha, carregarExemplo, avisar } = useCarteira();
  const [texto, setTexto] = useState("");
  const [solta, setSolta] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [ultimo, setUltimo] = useState<ResumoImportacao | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const previa = useMemo(() => (texto.trim() ? lerTexto(texto) : null), [texto]);
  const linhas = estado.linhas;
  const feitas = linhas.filter((l) => l.status !== "fila" && l.status !== "consultando").length;
  const pendentes = linhas.length - feitas;
  const reais = linhas.filter((l) => (l.status === "fila" || l.status === "consultando") && l.origem !== "exemplo").length;

  const rodar = (t: string) => {
    const r = importarTexto(t);
    setUltimo(r);
    avisar(frase(r), r.novas || r.invalidas ? "ok" : "alerta");
    return r;
  };

  const lerArquivo = async (f: File) => {
    setLendo(true);
    try {
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        const dados = await readSheet(f);
        const r = importarPlanilha(dados as (string | number | boolean | Date | null)[][]);
        setUltimo(r);
        avisar(`${f.name}: ${frase(r)}`, r.novas || r.invalidas ? "ok" : "alerta");
      } else if (/\.(csv|txt)$/i.test(f.name)) {
        const t = await f.text();
        const r = importarTexto(t);
        setUltimo(r);
        avisar(`${f.name}: ${frase(r)}`, r.novas || r.invalidas ? "ok" : "alerta");
      } else if (/\.xls$/i.test(f.name)) {
        avisar("Arquivo .xls antigo: abra no Excel e salve como .xlsx ou .csv.", "alerta");
      } else {
        avisar("Envie uma planilha .xlsx, .csv ou .txt.", "alerta");
      }
    } catch {
      avisar("Não consegui ler esse arquivo. Se estiver protegido por senha, salve uma cópia sem senha.", "alerta");
    } finally {
      setLendo(false);
      if (arquivo.current) arquivo.current.value = "";
    }
  };

  return (
    <div className="cartao importar" id="importar">
      <label className="rotulo" htmlFor="cnpjs">
        CNPJs da carteira
        <small>um por linha, com ou sem pontuação</small>
      </label>
      <textarea
        id="cnpjs"
        className={`area ${solta ? "solta" : ""}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        spellCheck={false}
        placeholder={"Cole aqui a coluna do Excel. Pode vir junto com regime e setor.\n\n00.000.000/0000-00\n00000000000000"}
        onDragOver={(e) => {
          e.preventDefault();
          setSolta(true);
        }}
        onDragLeave={() => setSolta(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSolta(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void lerArquivo(f);
        }}
      />
      <div className="importar-acoes">
        <button
          type="button"
          className="btn btn-pri"
          disabled={!texto.trim()}
          onClick={() => {
            rodar(texto);
            setTexto("");
          }}
        >
          <ClipboardPaste size={17} /> Preencher
        </button>
        <button type="button" className="btn btn-sec" onClick={() => arquivo.current?.click()} disabled={lendo}>
          {lendo ? <Loader2 size={17} className="girando" /> : <FileSpreadsheet size={17} />} Enviar planilha
        </button>
        <input ref={arquivo} type="file" accept=".xlsx,.csv,.txt,.xls" hidden onChange={(e) => e.target.files?.[0] && void lerArquivo(e.target.files[0])} />
        <span className="contagem">
          {previa
            ? previa.entradas.length
              ? `${plural(previa.entradas.length, "CNPJ reconhecido", "CNPJs reconhecidos")}${previa.entradas.some((x) => !x.cnpj) ? `, ${previa.entradas.filter((x) => !x.cnpj).length} com erro` : ""}`
              : "Nenhum CNPJ reconhecido ainda"
            : ".xlsx, .csv ou texto colado"}
        </span>
      </div>

      <div className="testes">
        <div className="testes-tit">Teste com um clique</div>
        <div className="testes-lista">
          <button type="button" className="teste forte" onClick={() => setUltimo(carregarExemplo())}>
            <Building2 size={18} />
            <span>
              <b>Carteira de exemplo</b>
              <span>{TOTAL_EXEMPLO} empresas inventadas, com regime escrito de vários jeitos, linha repetida e dígito trocado</span>
            </span>
          </button>
          <button type="button" className="teste" onClick={() => rodar("00.000.000/E08G-12")}>
            <Type size={18} />
            <span>
              <b>CNPJ com letras</b>
              <span>00.000.000/E08G-12, o primeiro emitido no formato novo, em 31/07/2026</span>
            </span>
          </button>
          <button type="button" className="teste" onClick={() => rodar("CNPJ\tRegime\n191\tLucro Real")}>
            <Hash size={18} />
            <span>
              <b>Zeros que o Excel apaga</b>
              <span>A coluna virou número e 00.000.000/0001-91 chegou como 191</span>
            </span>
          </button>
          <button type="button" className="teste" onClick={() => rodar("33.000.167/0001-02")}>
            <Sparkles size={18} />
            <span>
              <b>Dígito trocado</b>
              <span>33.000.167/0001-02: um número errado na digitação</span>
            </span>
          </button>
        </div>
        <div className="privado">
          <ShieldCheck size={15} />
          <span>
            A consulta sai do seu navegador direto para a base pública do CNPJ. A lista fica só neste navegador, nada é gravado em servidor.{" "}
            <button type="button" className="btn-fant copiar" onClick={() => void baixarModelo()} style={{ fontSize: 12.5, fontWeight: 600 }}>
              <Download size={13} style={{ marginRight: 4 }} />
              Baixar a planilha de exemplo
            </button>
          </span>
        </div>
      </div>

      {linhas.length > 0 && (
        <div className="progresso">
          <div className="progresso-topo">
            {pendentes > 0 ? `Consultando ${feitas} de ${linhas.length}` : `${plural(linhas.length, "linha", "linhas")} na carteira`}
            <span>
              {pendentes > 0 && reais > 0 ? `cerca de ${estimativaSegundos(reais)} s pela consulta pública` : pendentes > 0 ? "carteira de exemplo" : "consulta concluída"}
            </span>
          </div>
          <div className="barra">
            <i style={{ width: `${linhas.length ? (feitas / linhas.length) * 100 : 0}%` }} />
          </div>
          {ultimo && (ultimo.zeros > 0 || ultimo.repetidas > 0 || ultimo.ignoradas > 0 || ultimo.jaNaLista > 0) && (
            <div className="progresso-notas">
              {ultimo.zeros > 0 && (
                <span>
                  <b>{ultimo.zeros}</b> com zeros à esquerda recuperados
                </span>
              )}
              {ultimo.repetidas > 0 && (
                <span>
                  <b>{ultimo.repetidas}</b> {ultimo.repetidas === 1 ? "linha repetida juntada" : "linhas repetidas juntadas"}
                </span>
              )}
              {ultimo.ignoradas > 0 && (
                <span>
                  <b>{ultimo.ignoradas}</b> {ultimo.ignoradas === 1 ? "linha sem CNPJ ignorada (cabeçalho)" : "linhas sem CNPJ ignoradas"}
                </span>
              )}
              {ultimo.jaNaLista > 0 && (
                <span>
                  <b>{ultimo.jaNaLista}</b> já {ultimo.jaNaLista === 1 ? "estava" : "estavam"} na lista
                </span>
              )}
            </div>
          )}
          <a className="btn btn-fant btn-p" href="#carteira" style={{ marginTop: 8, paddingLeft: 0 }}>
            <ArrowDown size={15} /> Ver a carteira
          </a>
        </div>
      )}
    </div>
  );
}
