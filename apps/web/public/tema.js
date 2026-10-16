// Modo claro u oscuro antes de pintar, para que no parpadee. La primera vez sigue al sistema.
(function () {
  var t = null;
  try {
    t = localStorage.getItem("dv-tema");
  } catch {
    // sin almacenamiento (modo privado): se usa la preferencia del sistema
  }
  if (t !== "oscuro" && t !== "claro") t = matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  document.documentElement.setAttribute("data-tema", t);
})();
