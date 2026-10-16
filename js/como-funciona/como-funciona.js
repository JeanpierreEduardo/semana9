import '../auth/auth.js';
// js/script.js — CineMax Perú
// Comportamiento general compartido por todas las páginas:
// animación de aparición (fade-in) de las tarjetas de película al
// desplazarse por la pantalla.

document.addEventListener("DOMContentLoaded", () => {
  activarFadeInCartelera();
});

function activarFadeInCartelera() {
  const tarjetas = document.querySelectorAll(".tarjeta-pelicula");
  if (!tarjetas.length) return;

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  tarjetas.forEach((tarjeta) => observador.observe(tarjeta));
}
