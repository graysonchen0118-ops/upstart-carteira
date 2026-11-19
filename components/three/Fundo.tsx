"use client";

import dynamic from "next/dynamic";

const Cena = dynamic(() => import("./FolhaCena"), {
  ssr: false,
  loading: () => <div className="fundo3d-espera" aria-hidden="true" />,
});

export default function Fundo() {
  return <Cena />;
}
