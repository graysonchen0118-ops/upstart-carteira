// Fotos do Unsplash (licença livre). Créditos no rodapé.
const u = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;

export const FOTOS = {
  padaria: { src: u("1757332914512-ffaf5b521ba8", 900, 520), alt: "Pães franceses empilhados no balcão de uma padaria", autor: "Daniel Dan" },
  distribuidora: { src: u("1706027554839-a81076da137b", 900, 520), alt: "Estoque de madeira em prateleiras de um depósito de materiais de construção", autor: "Dieny Portinanni" },
};
