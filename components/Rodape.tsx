import { FOTOS } from "@/lib/fotos";

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape-in">
        <span>
          <b>UpStart Consultoria</b> · 2026
        </span>
        <span>Dados cadastrais: base pública do CNPJ da Receita Federal, consultada pela BrasilAPI e pela Minha Receita.</span>
        <span>
          Fotos: {FOTOS.distribuidora.autor} e {FOTOS.padaria.autor}, no Unsplash.
        </span>
      </div>
    </footer>
  );
}
