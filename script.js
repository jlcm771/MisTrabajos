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

let W, H, R, cy, tam, tamDisp, dx, dyArriba, dyAbajo;
const proporcion = items.map(() => 1); // ancho / alto real de cada imagen (1 = cuadrada)
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
  dx = W / 2 - tamDisp / 2 - 12;                  // hasta dónde se dispersan
  dyArriba = cy - tamDisp / 2 - 12;
  dyAbajo = H - cy - tamDisp / 2 - 12;

  // El fondo de partículas se coloca en el centro de la ruleta
  window.__esfera = { x: W / 2, y: cy, r: Math.max(40, R * 0.7) };
}

// Caja expandida: respeta la proporción real de la imagen, sin recortarla
function cajaGrande(r) {
  const MARCO = 8;                              // borde + margen del marco de cristal
  const maxW = Math.min(W * 0.9, 1000) - MARCO;
  const maxH = Math.min(H * 0.58, 700) - MARCO;
  const ancho = Math.min(maxW, maxH * r);
  return [ancho + MARCO, ancho / r + MARCO];
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
  window.__abre = e; // el fondo se atenúa cuando hay un proyecto abierto

  items.forEach((item, i) => {
    hover[i] += ((i === sobre ? 1 : 0) - hover[i]) * amortiguar(dt, 12);
    item.classList.toggle("is-hover", i === sobre);

    const a = anguloDe(i);
    const ox = R * Math.cos(a);
    const oy = R * Math.sin(a);
    let x, y, w, h, o;

    if (item === seleccionado) {
      x = ox * (1 - e);
      y = oy * (1 - e);
      const [gw, gh] = cajaGrande(proporcion[i]);
      w = tam + (gw - tam) * e;
      h = tam + (gh - tam) * e;
      o = 1;
    } else {
      const tx = Math.cos(a) * dx;
      const ty = Math.sin(a) * (Math.sin(a) > 0 ? dyAbajo : dyArriba);
      x = ox + (tx - ox) * e;
      y = oy + (ty - oy) * e;
      w = h = tam + (tamDisp - tam) * e;
      o = 1 - 0.55 * e;
    }
    const crece = 1 + AUMENTO * hover[i];
    w *= crece;
    h *= crece;

    item.style.width = w + "px";
    item.style.height = h + "px";
    item.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
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

/* ---------- Logos: se recorta el espacio vacío para que llenen toda la caja ---------- */
// Se usa con data-ajuste="logo". Funciona con logos de fondo transparente o de un color liso.
function recortarLogo(img) {
  if (img.dataset.recortado || !img.naturalWidth) return;
  img.dataset.recortado = "1"; // para no repetirlo cuando se cambie la imagen
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    const esc = Math.min(1, 400 / Math.max(w, h)); // se analiza en chico para que sea rápido
    const aw = Math.max(1, Math.round(w * esc)), ah = Math.max(1, Math.round(h * esc));
    const lienzo = document.createElement("canvas");
    lienzo.width = aw;
    lienzo.height = ah;
    const cx = lienzo.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0, aw, ah);
    const d = cx.getImageData(0, 0, aw, ah).data;
    const px = (x, y) => { const k = (y * aw + x) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
    const dif = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

    // ¿El fondo es transparente o de un color liso?
    const esq = [px(0, 0), px(aw - 1, 0), px(0, ah - 1), px(aw - 1, ah - 1)];
    let fondo = null;
    if (!esq.every((c) => c[3] < 20)) {
      if (!esq.every((c) => c[3] > 235 && dif(c, esq[0]) < 40)) return; // fondo irregular: no se recorta
      fondo = esq[0];
    }
    const hayLogo = (x, y) => {
      const c = px(x, y);
      return fondo ? c[3] > 20 && dif(c, fondo) > 60 : c[3] > 20;
    };

    let x0 = aw, y0 = ah, x1 = -1, y1 = -1;
    for (let y = 0; y < ah; y++) {
      for (let x = 0; x < aw; x++) {
        if (hayLogo(x, y)) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return;

    // Se recorta de la imagen original, con 1 px de margen
    const k = 1 / esc;
    const ox = Math.max(0, Math.floor(x0 * k) - 1);
    const oy = Math.max(0, Math.floor(y0 * k) - 1);
    const ow = Math.min(w - ox, Math.ceil((x1 - x0 + 1) * k) + 2);
    const oh = Math.min(h - oy, Math.ceil((y1 - y0 + 1) * k) + 2);
    if (ow >= w - 2 && oh >= h - 2) return; // ya estaba justo

    const rec = document.createElement("canvas");
    rec.width = ow;
    rec.height = oh;
    rec.getContext("2d").drawImage(img, ox, oy, ow, oh, 0, 0, ow, oh);
    rec.toBlob((b) => { if (b) img.src = URL.createObjectURL(b); }, "image/png");
  } catch (e) {
    // Abriendo el archivo directo (file://) el navegador no deja leer la imagen: queda sin recortar
  }
}

/* ---------- Enlaces: proyectos que son páginas web ---------- */
// Un proyecto con data-url="https://..." lleva a esa página al hacer click otra vez en la imagen abierta
function urlDe(item) {
  if (!item.dataset.url) return null;
  try {
    const u = new URL(item.dataset.url, location.href);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch (e) {
    return null;
  }
}

function visitar(item) {
  const url = urlDe(item);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

function ponerPie(item) {
  caption.textContent = item.dataset.title;
  const url = urlDe(item);
  if (url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Visitar sitio ↗";
    caption.append(a);
  }
}

/* ---------- Abrir y cerrar ---------- */
function abrir(item) {
  if (abierto || p > 0) return;
  seleccionado = item;
  item.classList.add("is-selected");
  ponerPie(item);
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
items.forEach((item, i) => {
  if (urlDe(item)) item.classList.add("tiene-enlace");

  item.addEventListener("click", () => {
    if (abierto && item === seleccionado) {
      if (p > 0.95) visitar(item); // ya está abierta del todo: segundo click = ir a la página
      return;
    }
    abrir(item);
  });

  // Si la imagen aún no existe, se muestra el nombre del proyecto
  const img = item.querySelector("img");
  const sinImagen = () => {
    img.remove();
    item.classList.add("sin-imagen");
  };
  const leerProporcion = () => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) proporcion[i] = img.naturalWidth / img.naturalHeight;
  };
  img.addEventListener("error", sinImagen);
  img.addEventListener("load", leerProporcion);
  if (item.dataset.ajuste === "logo") img.addEventListener("load", () => recortarLogo(img));
  if (img.complete) {
    if (img.naturalWidth === 0) sinImagen();
    else {
      leerProporcion();
      if (item.dataset.ajuste === "logo") recortarLogo(img);
    }
  }
});

// Click fuera de la imagen abierta → se minimiza
stage.addEventListener("click", (e) => {
  if (abierto && p > 0.35 && !e.target.closest(".item.is-selected, .caption a")) cerrar();
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
