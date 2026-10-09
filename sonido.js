/* Sonidos de la página, con tus propios audios (carpeta audio/).
   - select.mp3 → al pasar el mouse sobre una imagen
   - click.mp3  → al ampliar y al disminuir una imagen (más bajo al disminuir)
   - intro.mp3  → solo la primera vez que entras a la página */
(() => {
  // Volúmenes: de 0 (mudo) a 1 (máximo). Cámbialos aquí.
  const VOLUMEN = {
    select: 0.3,
    clicAmpliar: 0.6,
    clicDisminuir: 0.3, // un poquito más bajo al salir de la imagen
  };

  const boton = document.getElementById("sonido");
  let activo = true;
  try { activo = localStorage.getItem("sonido") !== "off"; } catch (e) {}
  boton.setAttribute("aria-pressed", String(activo));

  // Se cargan una sola vez; cada reproducción usa una copia para que puedan solaparse
  const base = {};
  ["click", "select", "intro"].forEach((nombre) => {
    const a = new Audio(`audio/${nombre}.mp3`);
    a.preload = "auto";
    base[nombre] = a;
  });

  function sonar(nombre, volumen) {
    if (!activo) return;
    const copia = base[nombre].cloneNode(true);
    copia.volume = volumen;
    copia.play().catch(() => {});
  }

  window.Sonido = {
    hover()  { sonar("select", VOLUMEN.select); },
    abrir()  { sonar("click", VOLUMEN.clicAmpliar); },
    cerrar() { sonar("click", VOLUMEN.clicDisminuir); },
  };

  /* ---------- Intro: solo la primera vez que entras ---------- */
  let introSonada = false;
  try { introSonada = sessionStorage.getItem("intro") === "1"; } catch (e) {}

  function intro() {
    if (introSonada || !activo) return;
    base.intro.volume = VOLUMEN.intro;
    base.intro.play().then(() => {
      introSonada = true;
      try { sessionStorage.setItem("intro", "1"); } catch (e) {}
      quitarEscuchas();
    }).catch(() => {
      // El navegador la bloqueó: se reproduce con el primer click, toque o tecla
    });
  }

  function quitarEscuchas() {
    removeEventListener("pointerdown", intro);
    removeEventListener("keydown", intro);
  }

  if (!introSonada) {
    intro();
    addEventListener("pointerdown", intro);
    addEventListener("keydown", intro);
  }

  /* ---------- Botón para silenciar ---------- */
  boton.addEventListener("click", () => {
    activo = !activo;
    boton.setAttribute("aria-pressed", String(activo));
    try { localStorage.setItem("sonido", activo ? "on" : "off"); } catch (e) {}
    if (activo) window.Sonido.hover();
    else base.intro.pause();
  });
})();
