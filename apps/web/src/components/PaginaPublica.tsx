import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav.tsx";
import { Pie } from "./Pie.tsx";
import { LOCAL } from "@dv/shared";
import { estadoDelLocal } from "../lib/horario.ts";

export function PaginaPublica({
  titulo,
  ojo,
  children,
  ancha = false,
}: {
  titulo: string;
  ojo?: string;
  children: ReactNode;
  ancha?: boolean;
}) {
  const e = estadoDelLocal();
  return (
    <>
      <SiteNav />
      <main id="contenido" className="pag">
        <header className="pag__cab">
          <div className="pag__tit">
            <h1>{titulo}</h1>
            {ojo && <p className="pag__sub">{ojo}</p>}
          </div>
          <p className="pag__estado">
            <span className={e.abierto ? "punto punto--on" : "punto"} aria-hidden="true" />
            <span>
              <span className="pag__estado-t">{e.texto}</span>
              <br />
              <span className="pag__dir">
                {LOCAL.direccion}, {LOCAL.localidad}
              </span>
            </span>
          </p>
        </header>
        <div className={ancha ? "pag__cuerpo pag__cuerpo--ancha" : "pag__cuerpo"}>{children}</div>
      </main>
      <Pie />
    </>
  );
}
