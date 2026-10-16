import { useEffect, useState } from "react";
import { Icono } from "./Iconos.tsx";

type Tema = "claro" | "oscuro";

const actual = (): Tema => (document.documentElement.getAttribute("data-tema") === "oscuro" ? "oscuro" : "claro");

/** Botón sol/luna: cambia entre modo claro y oscuro y lo recuerda en este navegador. */
export function BotonTema({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<Tema>(actual);
  useEffect(() => {
    document.documentElement.setAttribute("data-tema", tema);
    try {
      localStorage.setItem("dv-tema", tema);
    } catch {
      // sin almacenamiento (modo privado): el cambio dura mientras la página esté abierta
    }
  }, [tema]);
  const oscuro = tema === "oscuro";
  return (
    <button
      type="button"
      className={`tema ${className}`}
      aria-pressed={oscuro}
      aria-label="Modo oscuro"
      title={oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro"}
      onClick={() => setTema(oscuro ? "claro" : "oscuro")}
    >
      <Icono nombre={oscuro ? "sol" : "luna"} />
    </button>
  );
}
