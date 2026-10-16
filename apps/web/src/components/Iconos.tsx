import type { ReactNode } from "react";

/** Íconos de trazo (24×24), dibujados para el administrador. Decorativos: el texto siempre acompaña. */
const P: Record<string, ReactNode> = {
  inicio: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  reservas: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16M8.5 14.5l2 2 4-4" />
    </>
  ),
  mesas: (
    <>
      <path d="M4 9h16M6 9v10M18 9v10M9 9V5h6v4" />
      <circle cx="12" cy="14" r="1.4" />
    </>
  ),
  parametros: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6" />,
  usuarios: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M16 5.5a3 3 0 0 1 0 6M17.5 14.2c1.7.5 2.8 2 3.2 4.3" />
    </>
  ),
  fuego: (
    <path d="M12 3c.4 3-1.4 4.4-2.8 6.1C7.8 10.8 7 12.3 7 14a5 5 0 0 0 10 0c0-1.5-.6-2.6-1.5-3.8-.3 1-.9 1.6-1.7 1.8.4-3-.2-6-1.8-9z" />
  ),
  gente: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.5-3.6 3-5.5 6.5-5.500s6 1.9 6.5 5.5" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.500V12l3 2" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  salir: <path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9" />,
};

export function Icono({ nombre, tam = 20 }: { nombre: keyof typeof P; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[nombre]}
    </svg>
  );
}
