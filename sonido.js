/* Sonidos de la página, con tus propios audios (carpeta audio/).
   - select.mp3 → al pasar el mouse sobre una imagen
   - click.mp3  → al ampliar y al disminuir una imagen (más bajo al disminuir)
  - intro.mp3  → al entrar a la página */
(() => {
  // Volúmenes: de 0 (mudo) a 1 (máximo). Cámbialos aquí.
  const VOLUMEN = {
    select: 0.3,
    clicAmpliar: 0.6,
    clicDisminuir: 0.3, // un poquito más bajo al salir de la imagen
    intro: 0.2,
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
    if (!activo) return Promise.resolve(false);
    const copia = base[nombre].cloneNode(true);
    copia.volume = volumen;
    return copia.play().then(() => true).catch(() => false);
  }

  window.Sonido = {
    hover()  { sonar("select", VOLUMEN.select); },
    abrir()  { sonar("click", VOLUMEN.clicAmpliar); },
    cerrar() { sonar("click", VOLUMEN.clicDisminuir); },
  };

  /* ---------- Sonido al entrar ---------- */
  let selectEntradaPendiente = true;
  let selectEntradaEnCurso = false;

  function quitarEscuchasSelectEntrada() {
    removeEventListener("pointerdown", intentarSelectEntrada);
    removeEventListener("keydown", intentarSelectEntrada);
  }

  function intentarSelectEntrada() {
    if (!selectEntradaPendiente || selectEntradaEnCurso || !activo) return;
    selectEntradaEnCurso = true;
    sonar("select", VOLUMEN.select).then((reproducido) => {
      selectEntradaEnCurso = false;
      if (!reproducido) return;
      selectEntradaPendiente = false;
      quitarEscuchasSelectEntrada();
    });
  }

  intentarSelectEntrada();
  addEventListener("pointerdown", intentarSelectEntrada);
  addEventListener("keydown", intentarSelectEntrada);

  /* ---------- Intro al entrar ---------- */
  let introSonado = false;

  function intro() {
    if (introSonado || !activo) return;
    base.intro.volume = VOLUMEN.intro;
    base.intro.currentTime = 0;
    base.intro.play().then(() => {
      introSonado = true;
      quitarEscuchas();
    }).catch(() => {
      // El navegador la bloqueó: se reproduce con el primer click, toque o tecla
    });
  }

  function quitarEscuchas() {
    removeEventListener("pointerdown", intro);
    removeEventListener("keydown", intro);
  }

  intro();
  addEventListener("pointerdown", intro);
  addEventListener("keydown", intro);

  /* ---------- Botón para silenciar ---------- */
  boton.addEventListener("click", () => {
    activo = !activo;
    boton.setAttribute("aria-pressed", String(activo));
    try { localStorage.setItem("sonido", activo ? "on" : "off"); } catch (e) {}
    if (activo) {
      intro();
      if (selectEntradaPendiente) intentarSelectEntrada();
      else window.Sonido.hover();
    } else base.intro.pause();
  });
})();
