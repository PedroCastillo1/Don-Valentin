import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav.tsx";
import { Pie } from "./Pie.tsx";

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
  return (
    <>
      <SiteNav />
      <main id="contenido" className="pag">
        <header className="pag__cab">
          {ojo && <p className="pag__ojo">{ojo}</p>}
          <h1>{titulo}</h1>
        </header>
        <div className={ancha ? "pag__cuerpo pag__cuerpo--ancha" : "pag__cuerpo"}>{children}</div>
      </main>
      <Pie />
    </>
  );
}
