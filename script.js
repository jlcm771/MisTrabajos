const stage = document.getElementById("stage");
const wheel = document.getElementById("wheel");
const caption = document.getElementById("caption");
const items = [...wheel.querySelectorAll(".item")];
const n = items.length;

const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const VEL = reducir ? 0.05 : 0.14; // radianes por segundo
const DUR = reducir ? 0.5 : 1.25;  // segundos que tarda en abrir o cerrar
const AUMENTO = 0.14;              // cuánto crece la imagen al pasar el cursor

/* ---------- Hilos que unen cada imagen con el centro ---------- */
const NS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(NS, "svg");
svg.setAttribute("class", "hilos");
svg.setAttribute("width", "1");
svg.setAttribute("height", "1");
svg.setAttribute("aria-hidden", "true");
wheel.prepend(svg);

function crearLinea(clase) {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("class", clase);
  l.setAttribute("x1", "0");
  l.setAttribute("y1", "0");
  svg.appendChild(l);
  return l;
}
const hilos = items.map(() => [crearLinea("hilo hilo--halo"), crearLinea("hilo")]);

/* ---------- Estado ---------- */
let angulo = -Math.PI / 2; // la primera imagen empieza arriba
let vel = VEL;             // velocidad actual (cambia suavemente)
let p = 0;                 // progreso de apertura: 0 = ruleta, 1 = abierto
let abierto = false;
let seleccionado = null;
let puntero = null;        // posición del mouse respecto al centro de la ruleta
let ultimo = performance.now();
const hover = items.map(() => 0); // 0..1 por imagen, suaviza el crecimiento

let W, H, R, cy, tam, tamDisp, grande, dx, dyArriba, dyAbajo;
let sobreAnterior = -1;

function medir() {
  W = stage.clientWidth;
  H = stage.clientHeight;

  // La ruleta usa solo el espacio libre debajo del título, así nunca se encima
  const titulo = stage.querySelector(".title");
  const arriba = titulo.offsetTop + titulo.offsetHeight + 24; // aire bajo el título
  const abajo = H - 24;                                       // aire al borde inferior
  const libre = Math.max(abajo - arriba, 200);

  R = Math.min(W * 0.36, libre / 2.5);            // radio de la ruleta
  tam = Math.max(64, Math.min(R * 0.5, 170));     // tamaño de cada imagen
  if (2 * R + tam > libre) R = Math.max(60, (libre - tam) / 2);
  cy = arriba + libre / 2;                        // centro vertical de la ruleta
  wheel.style.top = cy + "px";

  tamDisp = tam * 0.6;                            // tamaño al dispersarse
  grande = Math.min(W * 0.88, H * 0.62, 680);     // tamaño al expandirse
  dx = W / 2 - tamDisp / 2 - 12;                  // hasta dónde se dispersan
  dyArriba = cy - tamDisp / 2 - 12;
  dyAbajo = H - cy - tamDisp / 2 - 12;
}

/* ---------- Utilidades ---------- */
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // entra y sale con suavidad
const anguloDe = (i) => angulo + (i * 2 * Math.PI) / n;
const amortiguar = (dt, rapidez) => 1 - Math.exp(-dt * rapidez); // movimiento independiente de los FPS

/* ---------- Un solo bucle que lo mueve todo ---------- */
function cuadro(ahora) {
  const dt = Math.min((ahora - ultimo) / 1000, 0.05);
  ultimo = ahora;
  const libre = !abierto && p === 0;

  // ¿Qué imagen tiene el cursor (o el foco del teclado) encima?
  let sobre = -1;
  if (libre && puntero) {
    for (let i = 0; i < n; i++) {
      const a = anguloDe(i);
      const mitad = (tam * (1 + AUMENTO * hover[i])) / 2 + 4;
      if (Math.abs(puntero.x - R * Math.cos(a)) < mitad && Math.abs(puntero.y - R * Math.sin(a)) < mitad) {
        sobre = i;
        break;
      }
    }
  }
  if (libre && sobre < 0) {
    sobre = items.findIndex((it) => it === document.activeElement && it.matches(":focus-visible"));
  }

  // Sonido al entrar en una imagen nueva
  if (sobre >= 0 && sobre !== sobreAnterior) window.Sonido?.hover();
  sobreAnterior = sobre;

  // La ruleta frena y arranca con suavidad
  const velObjetivo = abierto || sobre >= 0 ? 0 : VEL;
  vel += (velObjetivo - vel) * amortiguar(dt, 3.5);
  angulo += vel * dt;

  // Progreso de apertura (se puede invertir a mitad de camino)
  const objetivo = abierto ? 1 : 0;
  if (p < objetivo) p = Math.min(objetivo, p + dt / DUR);
  else if (p > objetivo) p = Math.max(objetivo, p - dt / DUR);
  const e = suave(p);
  stage.style.setProperty("--abre", e.toFixed(4));

  items.forEach((item, i) => {
    hover[i] += ((i === sobre ? 1 : 0) - hover[i]) * amortiguar(dt, 12);
    item.classList.toggle("is-hover", i === sobre);

    const a = anguloDe(i);
    const ox = R * Math.cos(a);
    const oy = R * Math.sin(a);
    let x, y, s, o;

    if (item === seleccionado) {
      x = ox * (1 - e);
      y = oy * (1 - e);
      s = tam + (grande - tam) * e;
      o = 1;
    } else {
      const tx = Math.cos(a) * dx;
      const ty = Math.sin(a) * (Math.sin(a) > 0 ? dyAbajo : dyArriba);
      x = ox + (tx - ox) * e;
      y = oy + (ty - oy) * e;
      s = tam + (tamDisp - tam) * e;
      o = 1 - 0.55 * e;
    }
    s *= 1 + AUMENTO * hover[i];

    item.style.width = item.style.height = s + "px";
    item.style.transform = `translate3d(${x - s / 2}px, ${y - s / 2}px, 0)`;
    item.style.opacity = o;

    // El hilo va del centro a la imagen dispersada
    const verHilo = item === seleccionado ? 0 : e * 0.9;
    hilos[i].forEach((l) => {
      l.setAttribute("x2", x);
      l.setAttribute("y2", y);
      l.style.opacity = verHilo;
    });
  });

  // Al terminar de cerrar, se libera la imagen seleccionada
  if (!abierto && p === 0 && seleccionado) {
    seleccionado.classList.remove("is-selected");
    seleccionado = null;
  }

  requestAnimationFrame(cuadro);
}

/* ---------- Abrir y cerrar ---------- */
function abrir(item) {
  if (abierto || p > 0) return;
  seleccionado = item;
  item.classList.add("is-selected");
  caption.textContent = item.dataset.title;
  stage.classList.add("is-open");
  abierto = true;
  window.Sonido?.abrir();
}

function cerrar() {
  if (!abierto) return;
  abierto = false;
  stage.classList.remove("is-open");
  window.Sonido?.cerrar();
}

/* ---------- Eventos ---------- */
items.forEach((item) => {
  item.addEventListener("click", () => abrir(item));

  // Si la imagen aún no existe, se muestra el nombre del proyecto
  const img = item.querySelector("img");
  const sinImagen = () => {
    img.remove();
    item.classList.add("sin-imagen");
  };
  img.addEventListener("error", sinImagen);
  if (img.complete && img.naturalWidth === 0) sinImagen();
});

// Click fuera de la imagen abierta → se minimiza
stage.addEventListener("click", (e) => {
  if (abierto && p > 0.35 && !e.target.closest(".item.is-selected")) cerrar();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrar();
});

stage.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") { puntero = null; return; }
  const c = wheel.getBoundingClientRect(); // el centro de la ruleta
  puntero = { x: e.clientX - c.left, y: e.clientY - c.top };
});
stage.addEventListener("pointerleave", () => (puntero = null));
window.addEventListener("resize", medir);
if (document.fonts) document.fonts.ready.then(medir);

/* ---------- Inicio ---------- */
medir();
requestAnimationFrame(cuadro);
