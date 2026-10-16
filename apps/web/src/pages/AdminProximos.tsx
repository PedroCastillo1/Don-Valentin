import { useEffect, useState } from "react";
import type { CartaPublica } from "./Carta.tsx";
import { api } from "../lib/api.ts";
import { precio } from "../lib/formato.ts";
import { Cabecera } from "../components/ui.tsx";
import { EnConstruccion } from "../components/EnConstruccion.tsx";

/*
 * Módulos que la línea base v4 entrega en hitos posteriores al H2.
 * Cada pantalla dice qué falta, en qué hito y fecha se completa, y muestra el prototipo de la pantalla (H2: prototipo
 * UX/UI) rotulado como tal. Lo que ya existe de verdad (la carta con sus precios reales) se muestra como real.
 */

/** H3 — Estado del salón por franja (RF-R3). */
export function AdminSalon() {
  const estados = ["libre", "reservada", "ocupada"] as const;
  return (
    <>
      <Cabecera titulo="Estado del salón" bajada="Mesas libres, reservadas y ocupadas en cada franja horaria." />
      <EnConstruccion
        hito="H3"
        titulo="Estado del salón por franja"
        descripcion="Vista de las 30 mesas por franja: libre, reservada u ocupada, con alta de clientes sin reserva (walk-in) y liberación por no-show según la tolerancia de la planilla."
        requisitos={["RF-R3"]}
        prototipo={
          <div className="proto-salon">
            <div className="proto-salon__franjas">
              {["12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00"].map((f, i) => (
                <span key={f} className={i === 4 ? "on" : ""}>
                  {f}
                </span>
              ))}
            </div>
            <ul className="proto-salon__mesas">
              {Array.from({ length: 30 }, (_, i) => (
                <li key={i} className={`m-${estados[(i * 7) % 3]}`}>
                  <b>{i + 1}</b>
                  <small>{estados[(i * 7) % 3]}</small>
                </li>
              ))}
            </ul>
            <p className="proto-acciones">
              <span className="btn btn--brasa">Sentar sin reserva</span>
              <span className="btn">Marcar no-show</span>
            </p>
          </div>
        }
      />
    </>
  );
}

/** H4 — Pedido del comensal desde el QR (RF-Q1/Q2). */
export function AdminPedidosQr() {
  return (
    <>
      <Cabecera titulo="Pedidos por QR" bajada="El comensal escanea el QR de su mesa y pide desde el celular." />
      <EnConstruccion
        hito="H4"
        titulo="Carta digital y pedido desde la mesa"
        descripcion="Hoy el QR ya abre la mesa correcta (Mesas y QR). Falta que el comensal elija de la carta, envíe el pedido y que llegue al sector que lo prepara en 5 segundos o menos."
        requisitos={["RF-Q1", "RF-Q2"]}
        prototipo={
          <div className="proto-tel">
            <p className="proto-tel__cab">Mesa 12 · Don Valentín</p>
            <p className="proto-tel__cat">Carnes · Porciones individuales</p>
            {[
              ["Vacío", 15500],
              ["Bondiola", 15500],
              ["Molleja", 19000],
            ].map(([n, p]) => (
              <p key={n as string} className="proto-tel__item">
                <span>{n}</span>
                <span>{precio(p as number)}</span>
                <span className="proto-tel__mas">+</span>
              </p>
            ))}
            <p className="proto-tel__total">
              <span>2 platos</span>
              <span className="btn btn--brasa">Enviar pedido</span>
            </p>
          </div>
        }
      />
    </>
  );
}

/** H4 — Paneles de cocina, parrilla y barra (RF-Q2/Q3). */
export function AdminSectores() {
  const tarjeta = (mesa: number, items: string, min: number, tarde = false) => (
    <li className={tarde ? "tarde" : ""}>
      <b>Mesa {mesa}</b>
      <span>{items}</span>
      <small>{tarde ? `Demorado · ${min} min` : `${min} min`}</small>
    </li>
  );
  return (
    <>
      <Cabecera titulo="Cocina, parrilla y barra" bajada="Cada sector ve solo lo que tiene que preparar." />
      <EnConstruccion
        hito="H4"
        titulo="Paneles de los sectores"
        descripcion="Los pedidos llegan al sector que corresponde (cocina, parrilla o barra) y pasan por en preparación, listo y entregado. El pedido que supera el tiempo máximo de la planilla se destaca."
        requisitos={["RF-Q2", "RF-Q3"]}
        prototipo={
          <div className="proto-kanban">
            <section>
              <h3>Nuevos</h3>
              <ul>
                {tarjeta(12, "2 × Vacío", 1)}
                {tarjeta(4, "1 × Provoleta", 2)}
              </ul>
            </section>
            <section>
              <h3>En preparación</h3>
              <ul>{tarjeta(7, "1 × Parrillada para 2", 24, true)}</ul>
            </section>
            <section>
              <h3>Listos</h3>
              <ul>{tarjeta(19, "3 × Chorizo", 9)}</ul>
            </section>
          </div>
        }
      />
    </>
  );
}

/** H4 — Carga manual del mozo (RF-Q4). */
export function AdminMozo() {
  return (
    <>
      <Cabecera titulo="Pedido del mozo" bajada="Para el comensal que prefiere pedir en persona." />
      <EnConstruccion
        hito="H4"
        titulo="Carga manual del mozo"
        descripcion="El mozo carga el pedido de una mesa desde el celular y sigue el mismo circuito que el pedido por QR (mismo enrutamiento y mismos estados)."
        requisitos={["RF-Q4"]}
        prototipo={
          <div className="proto-form">
            <p>
              <span>Mesa</span>
              <span className="proto-input">12</span>
            </p>
            <p>
              <span>Producto</span>
              <span className="proto-input">Vacío (porción)</span>
            </p>
            <p>
              <span>Cantidad</span>
              <span className="proto-input">2</span>
            </p>
            <p className="proto-acciones">
              <span className="btn btn--brasa">Enviar a parrilla</span>
            </p>
          </div>
        }
      />
    </>
  );
}

/** Carta y precios: hoy se muestra la carta real (fuente: carta del local); la edición se suma en el H4. */
export function AdminCarta() {
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<CartaPublica>("/public/carta")
      .then(setCarta)
      .catch(() => setError("No pudimos cargar la carta."));
  }, []);
  const total = carta?.grupos.reduce((n, g) => n + g.categorias.reduce((m, c) => m + c.productos.length, 0), 0) ?? 0;
  return (
    <>
      <Cabecera
        titulo="Carta y precios"
        bajada="La misma carta alimenta el sitio y, desde el Hito 4, el pedido por QR."
      />
      <EnConstruccion
        compacto
        hito="H4"
        titulo="Edición de productos y precios"
        descripcion="Cambiar precios, agregar o pausar productos y elegir qué sector prepara cada uno, con impacto inmediato en el sitio y en el QR. Hoy los precios salen de la carta del local cargada en la base."
      />
      {error && <p className="mensaje mensaje--error">{error}</p>}
      {!carta && !error && <p className="cargando">Cargando la carta…</p>}
      {carta && (
        <section className="panel" aria-labelledby="t-carta-adm">
          <div className="panel__cab">
            <h2 id="t-carta-adm">Carta vigente</h2>
            <p>{total} productos · precios reales, en pesos</p>
          </div>
          <div className="carta-adm">
            {carta.grupos.map((g) =>
              g.categorias.map((c) => (
                <section key={c.id}>
                  <h3>
                    {g.grupo} · {c.nombre}
                  </h3>
                  <table className="tabla">
                    <tbody>
                      {c.productos.map((p) => (
                        <tr key={p.id}>
                          <td>{p.nombre}</td>
                          <td className="num">
                            {p.variantes
                              .map((v) => `${v.etiqueta ? `${v.etiqueta} ` : ""}${v.precio ? precio(v.precio) : "—"}`)
                              .join(" · ")}
                          </td>
                          <td>
                            <span className="mini mini--off" aria-disabled="true">
                              Editar (H4)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )),
            )}
          </div>
        </section>
      )}
    </>
  );
}

/** H5 — Medición del sitio (RF-W3). */
export function AdminMedicion() {
  return (
    <>
      <Cabecera titulo="Medición del sitio" bajada="Visitas al sitio y presencia en Google." />
      <EnConstruccion
        hito="H5"
        titulo="Google Analytics 4 y Search Console"
        descripcion="Con el sitio publicado en el ambiente de prueba se conectan GA4 (visitas y reservas iniciadas) y Search Console con el sitemap. No se muestran datos hasta que existan mediciones reales."
        requisitos={["RF-W3"]}
      />
    </>
  );
}
