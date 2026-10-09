/* Fondo oscuro: solo dos ondas muy suaves */
(() => {
  const canvas = document.getElementById("fondo");
  const ctx = canvas.getContext("2d");
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VEL = reducir ? 0.05 : 0.18; // velocidad de las ondas

  let W, H, dpr, contrasteOndas = 1;
  const ondas = [
    { y: 0.74, a: 0.05, f1: 1.1, f2: 2.3, p: 0.0, alpha: 0.07 },
    { y: 0.68, a: 0.07, f1: 0.8, f2: 1.7, p: 2.4, alpha: 0.05 },
  ];

  function ajustar() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const anchoCss = canvas.clientWidth || window.innerWidth;
    const altoCss = canvas.clientHeight || window.innerHeight;
    const ancho = Math.round(anchoCss * dpr);
    const alto = Math.round(altoCss * dpr);
    contrasteOndas = window.matchMedia("(max-width: 700px)").matches ? 1.8 : 1;
    if (canvas.width !== ancho) canvas.width = ancho;
    if (canvas.height !== alto) canvas.height = alto;
    W = canvas.width;
    H = canvas.height;
  }

  function dibujar(ms) {
    const t = (ms / 500) * VEL;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#000000");
    g.addColorStop(0.6, "#0a0a0a");
    g.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Resplandor muy tenue en el centro
    const r = Math.max(W, H) * 0.55;
    const brillo = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    brillo.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    brillo.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, W, H);

    for (const o of ondas) {
      const alpha = o.alpha * contrasteOndas;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12 * dpr) {
        const u = x / W;
        const y = H * o.y
          + Math.sin(u * o.f1 * Math.PI * 2 + t + o.p) * H * o.a
          + Math.sin(u * o.f2 * Math.PI * 2 - t * 1.3 + o.p) * H * o.a * 0.35;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();

      const rel = ctx.createLinearGradient(0, H * (o.y - o.a), 0, H);
      rel.addColorStop(0, `rgba(200, 200, 200, ${alpha})`);
      rel.addColorStop(1, "rgba(200, 200, 200, 0)");
      ctx.fillStyle = rel;
      ctx.fill();

      ctx.strokeStyle = `rgba(220, 220, 220, ${alpha * 1.6})`;
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }

    requestAnimationFrame(dibujar);
  }

  addEventListener("resize", ajustar);
  window.visualViewport?.addEventListener("resize", ajustar);
  ajustar();
  requestAnimationFrame(dibujar);
})();
