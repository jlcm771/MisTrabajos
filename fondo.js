/* Fondo: negro puro con una esfera de partículas que cambia de forma
   (esfera → anillos → círculo → reloj) y deja un borde de color en los puntos.
   Se coloca sola en el centro de la ruleta: script.js le pasa la posición. */
(() => {
  const canvas = document.getElementById("fondo");
  const ctx = canvas.getContext("2d");
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Ajustes que puedes cambiar ----
  const T_FORMA = reducir ? 9 : 5;       // segundos que mantiene cada forma
  const T_CAMBIO = reducir ? 3.5 : 2.2;  // segundos que tarda en transformarse
  const GIRO = reducir ? 0.08 : 0.22;    // velocidad de giro
  const ABERRACION = 0.016;              // separación de colores en el borde (0 = sin color)
  const RETARDO = 0.4;                   // qué tan escalonado es el cambio de forma

  let W, H, dpr, N;
  let cx = 0, cy = 0, Rs = 100;
  let puntero = null;
  let formas = [], retardo = null;
  let actual = 0, siguiente = 1, cambiando = false, fase = 0;
  let rotY = 0, ultimo = 0, iniciado = false;

  /* ---------- Puntos con brillo, uno por canal de color ---------- */
  function sprite(r, g, b) {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const x = c.getContext("2d");
    const gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 48, 48);
    return c;
  }
  const rojo = sprite(255, 70, 60);
  const verde = sprite(70, 255, 90);
  const azul = sprite(70, 110, 255);

  /* ---------- Las formas (posiciones de cada punto, radio 1) ---------- */
  function crearFormas(n) {
    const ORO = 2.399963; // ángulo áureo: reparte los puntos de forma pareja
    const nueva = () => new Float32Array(n * 3);
    const esfera = nueva(), anillos = nueva(), circulo = nueva(), reloj = nueva();

    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(1 - y * y);
      const a = i * ORO;
      esfera.set([r * Math.cos(a), y, r * Math.sin(a)], i * 3);
      const rr = Math.abs(y); // dos conos unidos por la punta
      reloj.set([rr * Math.cos(a), y, rr * Math.sin(a)], i * 3);
    }

    // Anillos horizontales apilados
    const M = 9;
    const ys = [], rs = [];
    for (let j = 0; j < M; j++) {
      const y = 0.88 - (1.76 * j) / (M - 1);
      ys.push(y);
      rs.push(Math.sqrt(1 - y * y));
    }
    const suma = rs.reduce((a, b) => a + b, 0);
    const cuentas = rs.map((r) => Math.floor((n * r) / suma));
    let resto = n - cuentas.reduce((a, b) => a + b, 0);
    for (let j = 0; resto > 0; j = (j + 1) % M, resto--) cuentas[j]++;
    let k = 0;
    for (let j = 0; j < M; j++) {
      for (let m = 0; m < cuentas[j]; m++, k++) {
        const a = (2 * Math.PI * m) / cuentas[j] + j * 0.5;
        anillos.set([rs[j] * Math.cos(a), ys[j], rs[j] * Math.sin(a)], k * 3);
      }
    }

    // Un círculo grande con uno pequeño adentro
    const fuera = Math.floor(n * 0.8);
    for (let i = 0; i < n; i++) {
      const dentro = i >= fuera;
      const a = dentro ? (2 * Math.PI * (i - fuera)) / (n - fuera) : (2 * Math.PI * i) / fuera;
      const r = dentro ? 0.22 : 1;
      circulo.set([r * Math.cos(a), r * Math.sin(a), 0], i * 3);
    }

    return [esfera, anillos, circulo, reloj];
  }

  function ajustar() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.width = Math.floor(innerWidth * dpr);
    H = canvas.height = Math.floor(innerHeight * dpr);
    const n = innerWidth > 900 ? 900 : 520; // menos puntos en celular
    if (n !== N) {
      N = n;
      formas = crearFormas(N);
      retardo = Float32Array.from({ length: N }, () => Math.random() * RETARDO);
    }
  }

  const suave = (t) => t * t * (3 - 2 * t);

  /* ---------- Cada cuadro ---------- */
  function dibujar(ms) {
    const t = ms / 1000;
    const dt = Math.min(t - ultimo, 0.05);
    ultimo = t;
    const abre = window.__abre || 0; // 0 = ruleta cerrada, 1 = proyecto abierto

    // Cuándo cambiar de forma
    fase += dt;
    if (!cambiando && fase > T_FORMA) {
      cambiando = true;
      fase = 0;
      siguiente = (actual + 1) % formas.length;
    } else if (cambiando && fase > T_CAMBIO) {
      cambiando = false;
      fase = 0;
      actual = siguiente;
    }
    const u = cambiando ? fase / T_CAMBIO : 0;

    // La esfera sigue el centro de la ruleta (con suavidad)
    const e = window.__esfera;
    const objX = e ? e.x * dpr : W / 2;
    const objY = e ? e.y * dpr : H * 0.55;
    const objR = (e ? e.r * dpr : Math.min(W, H) * 0.25) * (1 + 0.03 * Math.sin(t * 0.8)) * (1 + 0.3 * abre);
    if (!iniciado) { cx = objX; cy = objY; Rs = objR; iniciado = true; }
    const k = 1 - Math.exp(-dt * 6);
    cx += (objX - cx) * k;
    cy += (objY - cy) * k;
    Rs += (objR - Rs) * k;

    rotY += dt * GIRO * (1 - 0.7 * abre);
    const rotX = 0.38 + Math.sin(t * 0.25) * 0.1;
    const cY = Math.cos(rotY), sY = Math.sin(rotY);
    const cX = Math.cos(rotX), sX = Math.sin(rotX);

    // Fondo negro con un resplandor muy tenue detrás de la esfera
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const brillo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rs * 2.2);
    brillo.addColorStop(0, "rgba(255, 255, 255, 0.07)");
    brillo.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, W, H);

    // Partículas
    ctx.globalCompositeOperation = "lighter";
    const A = formas[actual];
    const B = formas[siguiente];
    const radio = 150 * dpr;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let x = A[i3], y = A[i3 + 1], z = A[i3 + 2];
      if (cambiando) {
        const p = Math.min(1, Math.max(0, (u - retardo[i]) / (1 - RETARDO)));
        const m = suave(p);
        x += (B[i3] - x) * m;
        y += (B[i3 + 1] - y) * m;
        z += (B[i3 + 2] - z) * m;
      }

      // Girar sobre Y y inclinar sobre X
      const x1 = x * cY + z * sY;
      const z1 = -x * sY + z * cY;
      const y2 = y * cX - z1 * sX;
      const z2 = y * sX + z1 * cX;

      const prof = (z2 + 1) / 2;       // 0 = lejos, 1 = cerca
      const s = 4 / (4 - z2);          // perspectiva
      let sx = cx + x1 * Rs * s;
      let sy = cy + y2 * Rs * s;

      // El puntero empuja las partículas cercanas
      if (puntero) {
        const dx = sx - puntero.x;
        const dy = sy - puntero.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radio * radio && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = Math.pow(1 - d / radio, 2) * 45 * dpr;
          sx += (dx / d) * f;
          sy += (dy / d) * f;
        }
      }

      const tam = (1.5 + 1.6 * prof) * dpr * (0.92 + 0.08 * Math.sin(t * 2 + i)) * 3.4;
      ctx.globalAlpha = (0.3 + 0.7 * prof) * (1 - 0.65 * abre);

      // Aberración cromática: rojo hacia afuera, azul hacia adentro
      const ox = (sx - cx) * ABERRACION;
      const oy = (sy - cy) * ABERRACION;
      const mitad = tam / 2;
      ctx.drawImage(rojo, sx + ox - mitad, sy + oy - mitad, tam, tam);
      ctx.drawImage(verde, sx - mitad, sy - mitad, tam, tam);
      ctx.drawImage(azul, sx - ox - mitad, sy - oy - mitad, tam, tam);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(dibujar);
  }

  addEventListener("resize", ajustar);
  addEventListener("pointermove", (ev) => { puntero = { x: ev.clientX * dpr, y: ev.clientY * dpr }; });
  addEventListener("pointerup", (ev) => { if (ev.pointerType !== "mouse") puntero = null; });
  document.addEventListener("pointerleave", () => (puntero = null));

  ajustar();
  requestAnimationFrame((ms) => { ultimo = ms / 1000; dibujar(ms); });
})();



