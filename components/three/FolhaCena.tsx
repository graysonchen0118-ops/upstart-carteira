"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { COLUNAS, COR, MAX_LINHAS, folha } from "@/lib/folha";
import { cssVar, damp, mount, softShadow } from "./kit";

// A carteira como uma folha de planilha em 3D: cada linha é uma empresa, cada célula um campo.
// A coluna do CNPJ já chega preenchida; as outras enchem conforme a consulta volta.

const LARG = [1.55, 2.3, 0.85, 1.15, 1.35, 1.0]; // CNPJ, empresa, situação, regime, atividade, vende para
const GAP = 0.09;
const PASSO = 0.34; // distância entre linhas
const ALT = 0.07;
const ENSAIO_LINHAS = 14;

export default function FolhaCena() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = mount(el);
    if (!st) return;
    const { renderer, scene } = st;

    const bg = new THREE.Color(cssVar("--bg", "#eef4f8"));
    scene.fog = new THREE.Fog(bg, 16, 34);

    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9cad6, 1.25));
    const sol = new THREE.DirectionalLight(0xffffff, 1.35);
    sol.position.set(-4, 9, 6);
    scene.add(sol);

    const paleta: Record<number, THREE.Color> = {
      [COR.vazia]: new THREE.Color("#e4ecf1"),
      [COR.consultando]: new THREE.Color(cssVar("--cyan", "#1ebff2")),
      [COR.pronta]: new THREE.Color(cssVar("--accent", "#006eac")),
      [COR.conferir]: new THREE.Color("#e0a033"),
      [COR.fora]: new THREE.Color("#c94a63"),
      [COR.erro]: new THREE.Color("#a7b4bd"),
      [COR.confirmada]: new THREE.Color(cssVar("--ok", "#16825c")),
      [COR.cnpj]: new THREE.Color(cssVar("--deep", "#004c6d")),
      [COR.destaque]: new THREE.Color(cssVar("--cyan", "#1ebff2")),
    };
    // cada coluna pronta com um tom um pouco diferente, como uma planilha de verdade
    const tomColuna = [0, 0.0, 0.1, 0.18, 0.26, 0.12];

    const largura = LARG.reduce((s, w) => s + w, 0) + GAP * (COLUNAS - 1);
    const xCol: number[] = [];
    let acc = -largura / 2;
    LARG.forEach((w) => {
      xCol.push(acc + w / 2);
      acc += w + GAP;
    });
    const profundidade = MAX_LINHAS * PASSO + 0.9;

    const folhaG = new THREE.Group();
    const pivo = new THREE.Group();
    pivo.add(folhaG);
    scene.add(pivo);

    // papel
    const papelMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const papel = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.7, 0.08, profundidade), papelMat);
    papel.position.set(0, -0.06, profundidade / 2 - 0.55);
    folhaG.add(papel);
    // faixa do cabeçalho
    const cab = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.7, 0.1, 0.42), new THREE.MeshLambertMaterial({ color: paleta[COR.cnpj] }));
    cab.position.set(0, -0.03, -0.45);
    folhaG.add(cab);
    // linhas de grade
    const grade = new THREE.Group();
    const linhaMat = new THREE.MeshBasicMaterial({ color: 0xd5e1e8 });
    for (let i = 0; i <= MAX_LINHAS; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.5, 0.005, 0.012), linhaMat);
      m.position.set(0, -0.015, i * PASSO - PASSO / 2);
      grade.add(m);
    }
    folhaG.add(grade);

    // folhas de trás: outras planilhas empilhadas
    const tras: THREE.Mesh[] = [];
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.7, 0.06, profundidade), new THREE.MeshLambertMaterial({ color: k ? 0xdbe9f2 : 0xe9f2f7 }));
      m.position.set(0.5 + k * 0.45, -0.35 - k * 0.32, profundidade / 2 - 0.25 + k * 0.4);
      m.rotation.y = 0.05 + k * 0.04;
      pivo.add(m);
      tras.push(m);
    }
    const sombra = softShadow(largura + 3, profundidade + 3, 0.28);
    sombra.position.set(0.4, -1.05, profundidade / 2 - 0.4);
    pivo.add(sombra);

    // células
    const total = MAX_LINHAS * COLUNAS;
    const celula = new THREE.BoxGeometry(1, ALT, PASSO * 0.66);
    const celMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const cels = new THREE.InstancedMesh(celula, celMat, total);
    cels.frustumCulled = false;
    cels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    folhaG.add(cels);

    // barra de leitura que passa sobre a linha em consulta
    const leitor = new THREE.Mesh(
      new THREE.BoxGeometry(largura + 0.6, 0.02, PASSO * 0.95),
      new THREE.MeshBasicMaterial({ color: paleta[COR.consultando], transparent: true, opacity: 0.22, depthWrite: false })
    );
    leitor.position.y = 0.09;
    folhaG.add(leitor);

    const altura = new Float32Array(total).fill(0.25);
    const alvoAlt = new Float32Array(total).fill(0.25);
    const cor = Array.from({ length: total }, () => paleta[COR.vazia].clone());
    const alvoCor = Array.from({ length: total }, () => paleta[COR.vazia].clone());
    const codigo = new Int8Array(total).fill(-1);
    const elev = new Float32Array(MAX_LINHAS);
    const tmp = new THREE.Object3D();
    const branco = new THREE.Color(0xffffff);
    const tmpCor = new THREE.Color();

    const codigosEnsaio: number[][] = [];
    const tons = [COR.pronta, COR.pronta, COR.conferir, COR.pronta, COR.destaque, COR.pronta, COR.fora, COR.pronta, COR.pronta, COR.conferir, COR.pronta, COR.destaque, COR.pronta, COR.pronta];
    for (let i = 0; i < ENSAIO_LINHAS; i++) {
      const t = tons[i];
      codigosEnsaio.push(
        t === COR.fora
          ? [COR.cnpj, COR.fora, COR.fora, COR.fora, COR.fora, COR.fora]
          : [COR.cnpj, COR.pronta, COR.pronta, t === COR.conferir ? COR.conferir : COR.pronta, COR.pronta, t === COR.destaque ? COR.destaque : COR.pronta]
      );
    }

    const definir = (i: number, c: number, col: number) => {
      if (codigo[i] === c) return;
      codigo[i] = c;
      const base = paleta[c] ?? paleta[COR.vazia];
      alvoCor[i].copy(base);
      if (c === COR.pronta) alvoCor[i].lerp(branco, tomColuna[col]);
      alvoAlt[i] = c === COR.vazia ? 0.25 : c === COR.erro ? 0.5 : 1;
      if (c !== COR.vazia && c !== COR.consultando) altura[i] = Math.min(altura[i], 0.2); // pula ao preencher
    };

    let versao = -1;
    let ensaioT = 0;
    let leitorZ = 0;
    let rotX = 0;
    let rotY = 0;
    let ponteiroX = 0;
    let ponteiroY = 0;
    let rolagem = 0;
    let rolagemSuave = 0;

    const aoMover = (e: PointerEvent) => {
      ponteiroX = (e.clientX / window.innerWidth) * 2 - 1;
      ponteiroY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const aoRolar = () => {
      rolagem = window.scrollY / Math.max(1, window.innerHeight);
    };
    window.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();

    let estreito = false;
    const enquadrar = (w: number, h: number) => {
      cam.aspect = w / h;
      estreito = w < 900;
      if (estreito) cam.setViewOffset(w, h, 0, h * 0.24, w, h);
      else cam.setViewOffset(w, h, -w * 0.17, 0, w, h);
      cam.updateProjectionMatrix();
    };
    enquadrar(st.size().w, st.size().h);
    st.onResize(enquadrar);

    st.loop((dt, t) => {
      // 1. o que cada célula deve mostrar
      const vazia = folha.linhas.length === 0;
      if (vazia) {
        if (!st.reduce) ensaioT += dt;
        const ciclo = ENSAIO_LINHAS * 0.42 + 2.6;
        const passo = st.reduce ? ENSAIO_LINHAS : Math.floor((ensaioT % ciclo) / 0.42);
        for (let r = 0; r < MAX_LINHAS; r++) {
          for (let c = 0; c < COLUNAS; c++) {
            const i = r * COLUNAS + c;
            if (r >= ENSAIO_LINHAS) definir(i, COR.vazia, c);
            else if (c === 0) definir(i, COR.cnpj, c);
            else if (r < passo) definir(i, codigosEnsaio[r][c], c);
            else if (r === passo) definir(i, COR.consultando, c);
            else definir(i, COR.vazia, c);
          }
        }
        leitorZ = Math.min(passo, ENSAIO_LINHAS - 1) * PASSO;
        (leitor.material as THREE.MeshBasicMaterial).opacity = passo < ENSAIO_LINHAS && !st.reduce ? 0.22 : 0;
        versao = -1;
      } else if (folha.versao !== versao) {
        versao = folha.versao;
        for (let r = 0; r < MAX_LINHAS; r++) {
          const lin = folha.linhas[r];
          for (let c = 0; c < COLUNAS; c++) definir(r * COLUNAS + c, lin ? lin[c] : COR.vazia, c);
        }
        const emConsulta = folha.linhas.findIndex((l) => l[1] === COR.consultando);
        (leitor.material as THREE.MeshBasicMaterial).opacity = emConsulta >= 0 ? 0.22 : 0;
        if (emConsulta >= 0) leitorZ = emConsulta * PASSO;
      }
      leitor.position.z = damp(leitor.position.z, leitorZ, 9, dt);

      // 2. animação das células
      const pulso = 0.55 + 0.45 * Math.sin(t * 7);
      for (let r = 0; r < MAX_LINHAS; r++) {
        elev[r] = damp(elev[r], r === folha.selecionada ? 0.22 : 0, 10, dt);
        for (let c = 0; c < COLUNAS; c++) {
          const i = r * COLUNAS + c;
          altura[i] = damp(altura[i], alvoAlt[i], 7, dt);
          cor[i].lerp(alvoCor[i], 1 - Math.exp(-8 * dt));
          const h = codigo[i] === COR.consultando ? 0.55 + 0.35 * pulso : altura[i];
          tmp.position.set(xCol[c], (h * ALT) / 2 + elev[r], r * PASSO);
          tmp.scale.set(LARG[c] - 0.08, Math.max(0.05, h), r === folha.selecionada ? 1.12 : 1);
          tmp.updateMatrix();
          cels.setMatrixAt(i, tmp.matrix);
          cels.setColorAt(i, codigo[i] === COR.consultando ? tmpCor.copy(cor[i]).lerp(branco, 0.35 * pulso) : cor[i]);
        }
      }
      cels.instanceMatrix.needsUpdate = true;
      if (cels.instanceColor) cels.instanceColor.needsUpdate = true;

      // 3. câmera, rolagem e ponteiro
      rolagemSuave = damp(rolagemSuave, Math.min(rolagem, 4), 5, dt);
      const p = rolagemSuave;
      rotX = damp(rotX, st.reduce ? 0 : ponteiroY * 0.05, 3, dt);
      rotY = damp(rotY, st.reduce ? 0 : ponteiroX * 0.08, 3, dt);
      const balanco = st.reduce ? 0 : Math.sin(t * 0.35) * 0.03;
      pivo.rotation.set(0.0 + rotX + p * 0.05, (estreito ? -0.18 : -0.32) + rotY + balanco - p * 0.1, 0.08);
      const fog = scene.fog as THREE.Fog;
      fog.near = (estreito ? 30 : 16) - Math.min(p, 1.5) * 5;
      fog.far = (estreito ? 52 : 34) - Math.min(p, 1.5) * 9;
      folhaG.position.set(0, 0, -profundidade / 2 + 0.6);
      tras.forEach((m, k) => (m.position.y = -0.35 - k * 0.32 - p * (0.25 + k * 0.2)));

      const dist = estreito ? 33 : 19;
      cam.position.set(estreito ? 0 : 1.5, (estreito ? 17 : 9.6) + p * 2.2, dist + p * 4.5);
      cam.lookAt(estreito ? 0 : 0.6, -0.6 - p * 1.4, (estreito ? -1.4 : 0) - p * 1.2);

      renderer.render(scene, cam);
    });

    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("scroll", aoRolar);
      st.dispose();
    };
  }, []);

  return <div ref={ref} className="fundo3d" aria-hidden="true" />;
}
