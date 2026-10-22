import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api.ts";
import { Mensaje } from "../components/ui.tsx";

/** RF-Q1: hoja A4 con el QR de cada mesa activa, su número y el código vigente impreso debajo (lo agrega el servidor). */
export function AdminQrImprimir() {
  const [codigos, setCodigos] = useState<{ numero: number; url: string; svg: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ codigos: { numero: number; url: string; svg: string }[] }>("/admin/qr")
      .then((r) => setCodigos(r.codigos))
      .catch(() => setError("No pudimos generar los códigos."));
  }, []);
  return (
    <div className="hoja-qr">
      <div className="hoja-qr__acciones no-imprimir">
        <Link to="/admin/mesas" className="btn btn--chico">
          Volver a Mesas y QR
        </Link>
        <button type="button" className="btn btn--brasa btn--chico" onClick={() => print()} disabled={!codigos}>
          Imprimir
        </button>
        <p className="nota">
          {codigos ? `${codigos.length} códigos, uno por mesa activa.` : "Generando…"} Si regenerás el QR de una mesa,
          volvé a imprimir solo esa.
        </p>
      </div>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <h1 className="sr-only">Códigos QR de las mesas</h1>
      <ul className="hoja-qr__grilla">
        {codigos?.map((c) => (
          <li key={c.numero}>
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`}
              alt={`Código QR de la mesa ${c.numero}`}
            />
            <p>
              Mesa <b>{c.numero}</b>
            </p>
            <small>Escaneá para ver la carta y pedir</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
