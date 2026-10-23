import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { GA4_ID } from "../lib/medicion.ts";
import { SITIO_URL } from "../components/Metadatos.tsx";
import { Cabecera, Mensaje } from "../components/ui.tsx";

interface Resumen {
  desde: string;
  hasta: string;
  porDia: { dia: string; visitas: number; reservas: number }[];
  paginas: { ruta: string; visitas: number }[];
  eventos: Record<string, number>;
}

const NOMBRE_RUTA: Record<string, string> = {
  "/": "Inicio",
  "/carta": "Carta",
  "/parrilla-libre": "Parrilla libre",
  "/reservar": "Reservar",
  "/como-llegar": "Cómo llegar",
  "/m": "Mesa (QR)",
  otra: "Otras",
};
const diaCorto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** RF-W3: medición propia (anónima, sin cookies) y estado de Google Analytics 4 y Search Console. */
export function AdminMedicion() {
  const [dias, setDias] = useState(30);
  const [r, setR] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (periodo: number) => {
    setCargando(true);
    setError("");
    try {
      const datos = await api<Resumen>(`/admin/medicion?dias=${periodo}`);
      setR(datos);
    } catch {
      setError("No pudimos cargar la medición. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(dias);
  }, [dias, cargar]);

  const e = r?.eventos ?? {};
  const visitas = e.pagina_vista ?? 0;
  const embudo = [
    ["Visitas al sitio", visitas],
    ["Vieron la carta", e.carta_vista ?? 0],
    ["Empezaron una reserva", e.reserva_iniciada ?? 0],
    ["Enviaron la reserva", e.reserva_enviada ?? 0],
    ["Reservas confirmadas", e.reserva_confirmada ?? 0],
  ] as const;
  const max = Math.max(1, ...(r?.porDia.map((d) => d.visitas) ?? [1]));

  return (
    <>
      <Cabecera
        titulo="Medición del sitio"
        bajada="Cuánta gente visita el sitio, qué mira y cuántos terminan reservando. Medición anónima: sin cookies ni datos personales."
      >
        <div className="franjas" role="group" aria-label="Período">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" aria-pressed={n === dias} onClick={() => setDias(n)}>
              {n} días
            </button>
          ))}
        </div>
      </Cabecera>
      {error && (
        <div className="acciones" style={{ alignItems: "center", marginBottom: "1rem" }}>
          <Mensaje tipo="error">{error}</Mensaje>
          <button type="button" className="mini mini--brasa" onClick={() => void cargar(dias)}>
            Reintentar
          </button>
        </div>
      )}
      {cargando && !r && !error && <p className="cargando">Cargando…</p>}
      {r && (
        <>
          <ul className="kpis" aria-label="Resumen del período">
            <li className="kpi">
              <p className="kpi__v">{visitas}</p>
              <p className="kpi__t">Visitas</p>
              <p className="kpi__n">
                del {diaCorto(r.desde)} al {diaCorto(r.hasta)}
              </p>
            </li>
            <li className="kpi">
              <p className="kpi__v">{e.reserva_confirmada ?? 0}</p>
              <p className="kpi__t">Reservas web</p>
              <p className="kpi__n">confirmadas desde el sitio</p>
            </li>
            <li className="kpi">
              <p className="kpi__v">{(e.clic_telefono ?? 0) + (e.clic_whatsapp ?? 0)}</p>
              <p className="kpi__t">Llamadas y WhatsApp</p>
              <p className="kpi__n">toques en el teléfono del local</p>
            </li>
            <li className="kpi">
              <p className="kpi__v">{e.clic_como_llegar ?? 0}</p>
              <p className="kpi__t">Cómo llegar</p>
              <p className="kpi__n">abrieron el mapa para ir</p>
            </li>
          </ul>

          <section className="panel" aria-labelledby="t-visitas">
            <div className="panel__cab">
              <h2 id="t-visitas">Visitas por día</h2>
              <p>Pasá el mouse o el dedo por una barra para ver el número.</p>
            </div>
            {visitas === 0 ? (
              <p className="vacio">
                Todavía no hay visitas registradas en este período. Se empiezan a contar apenas el sitio se publica.
              </p>
            ) : (
              <>
                <div className="barras-dia" aria-hidden="true">
                  {r.porDia.map((d) => (
                    <div key={d.dia} className="barras-dia__col" data-valor={`${diaCorto(d.dia)}: ${d.visitas}`}>
                      <span style={{ height: `${(d.visitas / max) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <p className="barras-dia__ejes" aria-hidden="true">
                  <span>{diaCorto(r.desde)}</span>
                  <span>máximo {max} por día</span>
                  <span>{diaCorto(r.hasta)}</span>
                </p>
                <table className="sr-only">
                  <caption>Visitas por día</caption>
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Visitas</th>
                      <th>Reservas confirmadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.porDia.map((d) => (
                      <tr key={d.dia}>
                        <td>{diaCorto(d.dia)}</td>
                        <td>{d.visitas}</td>
                        <td>{d.reservas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <div className="tablero__dos">
            <section className="panel" aria-labelledby="t-embudo">
              <div className="panel__cab">
                <h2 id="t-embudo">De la visita a la reserva</h2>
              </div>
              <ol className="embudo">
                {embudo.map(([nombre, n], i) => (
                  <li key={nombre}>
                    <span className="embudo__t">{nombre}</span>
                    <span className="embudo__barra" aria-hidden="true">
                      <span style={{ width: `${visitas ? Math.max(2, (n / visitas) * 100) : 0}%` }} />
                    </span>
                    <b>{n}</b>
                    {i > 0 && visitas > 0 && <small>{Math.round((n / visitas) * 100)} % de las visitas</small>}
                  </li>
                ))}
              </ol>
              {(e.reserva_error ?? 0) > 0 && (
                <p className="nota">
                  {e.reserva_error} {e.reserva_error === 1 ? "intento terminó" : "intentos terminaron"} en un error (por
                  ejemplo, horario completo). Conviene revisar el aforo de esas franjas.
                </p>
              )}
            </section>
            <section className="panel" aria-labelledby="t-paginas">
              <div className="panel__cab">
                <h2 id="t-paginas">Páginas más vistas</h2>
              </div>
              {r.paginas.length === 0 ? (
                <p className="vacio">Sin datos todavía.</p>
              ) : (
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Página</th>
                      <th className="num">Visitas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.paginas.map((p) => (
                      <tr key={p.ruta}>
                        <td>{NOMBRE_RUTA[p.ruta] ?? p.ruta}</td>
                        <td className="num">{p.visitas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="nota">Pedidos enviados desde el QR: {e.pedido_qr_enviado ?? 0}.</p>
            </section>
          </div>

          <section className="panel" aria-labelledby="t-google">
            <div className="panel__cab">
              <h2 id="t-google">Google Analytics y Search Console</h2>
              <p>Las cuentas son del local: el sistema queda listo para conectarlas.</p>
            </div>
            <dl className="datos">
              <div>
                <dt>Google Analytics 4</dt>
                <dd>{GA4_ID ? `Conectado (${GA4_ID}), con aviso de consentimiento` : "Sin conectar"}</dd>
              </div>
              <div>
                <dt>Mapa del sitio</dt>
                <dd>
                  <a href={`${SITIO_URL}/sitemap.xml`}>{`${SITIO_URL}/sitemap.xml`}</a>
                </dd>
              </div>
            </dl>
            <ol className="pasos-google">
              <li>
                <b>GA4:</b> crear la propiedad en analytics.google.com con la cuenta del local, copiar el ID de medición
                (empieza con «G-») y cargarlo en Vercel como variable <code>VITE_GA4_ID</code>. Al volver a publicar, el
                sitio pide permiso a cada visitante antes de usarlo.
              </li>
              <li>
                <b>Search Console:</b> agregar la propiedad con la URL del sitio, elegir «Etiqueta HTML», cargar el
                código en Vercel como <code>VITE_GSC_VERIFICACION</code>, publicar, verificar y enviar el mapa del sitio
                de arriba.
              </li>
            </ol>
          </section>
        </>
      )}
    </>
  );
}
