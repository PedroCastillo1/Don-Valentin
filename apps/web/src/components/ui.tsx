import type { ReactNode } from "react";

const ETIQUETA: Record<string, string> = {
  validado: "Validado",
  provisorio: "Provisorio",
  documentado: "Documentado",
  confirmada: "Confirmada",
};

export function Estado({ valor }: { valor: string }) {
  return <span className={`estado estado--${valor}`}>{ETIQUETA[valor] ?? valor}</span>;
}

export function Cabecera({ titulo, bajada, children }: { titulo: string; bajada?: string; children?: ReactNode }) {
  return (
    <header className="cab">
      <div>
        <h1>{titulo}</h1>
        {bajada && <p>{bajada}</p>}
      </div>
      {children}
    </header>
  );
}

export function Mensaje({ tipo, children }: { tipo: "ok" | "error"; children: ReactNode }) {
  return (
    <p className={`mensaje mensaje--${tipo}`} role={tipo === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
