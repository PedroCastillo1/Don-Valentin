import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { LOCAL, PARRILLA_LIBRE } from "@dv/shared";
import { precio } from "../lib/formato.ts";
import { api, ApiError } from "../lib/api.ts";
import { diaLargo, hoyAr, sumarDias } from "../lib/fechas.ts";
import { PaginaPublica } from "../components/PaginaPublica.tsx";
import { VideoLoop } from "../components/VideoLoop.tsx";
import "../styles/reservar.css";

interface Franja {
  id: number;
  nombre: string;
  estado: "disponible" | "completa" | "sin_mesa" | "cerrada";
}
interface Confirmada {
  codigo: string;
  fecha: string;
  franja: { nombre: string };
  personas: number;
  nombre: string;
}

export function Reservar() {
  const hoy = hoyAr();
  const [diasMax, setDiasMax] = useState(30);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [personas, setPersonas] = useState(2);
  const [fecha, setFecha] = useState(sumarDias(hoy, 1));
  const [franjaId, setFranjaId] = useState<number | "">("");
  const [comentarios, setComentarios] = useState("");
  const [aviso, setAviso] = useState(false);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState<Confirmada | null>(null);
  const franjaElegida = franjas.find((f) => f.id === franjaId);
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));

  useEffect(() => {
    api<{ reservaDiasMax: number }>("/public/info")
      .then((i) => setDiasMax(i.reservaDiasMax))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    let vivo = true;
    api<{ franjas: Franja[] }>(`/public/disponibilidad?fecha=${fecha}&personas=${personas}`)
      .then((r) => {
        if (!vivo) return;
        setFranjas(r.franjas);
        setFranjaId((id) => (r.franjas.some((f) => f.id === id && f.estado === "disponible") ? id : ""));
        setError("");
      })
      .catch((e) => {
        if (!vivo) return;
        setFranjas([]);
        setError(e instanceof ApiError ? e.message : "No pudimos consultar los horarios.");
      });
    return () => {
      vivo = false;
    };
  }, [fecha, personas]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrores({});
    setError("");
    setEnviando(true);
    try {
      setOk(
        await api<Confirmada>("/public/reservas", {
          method: "POST",
          body: {
            nombre,
            telefono,
            personas,
            fecha,
            franjaId,
            comentarios: comentarios || undefined,
            aceptaAviso: aviso,
          },
        }),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrores(err.campos ?? {});
        setError(err.message);
      } else setError("No pudimos guardar tu reserva. Probá de nuevo o llamanos.");
    } finally {
      setEnviando(false);
    }
  }

  if (ok)
    return (
      <PaginaPublica
        titulo="¡Listo, tu mesa está reservada!"
        ojo="Reserva confirmada"
        medio={{ tipo: "foto", n: 7, alt: "Una parrillada servida en brasero sobre la mesa", posicion: "50% 55%" }}
      >
        <div className="ticket ticket--ok" role="status">
          <p className="ticket__linea">
            A nombre de <strong>{ok.nombre}</strong>
          </p>
          <p className="ticket__linea">
            {diaLargo(ok.fecha)} · {ok.franja.nombre}
          </p>
          <p className="ticket__linea">
            {ok.personas} {ok.personas === 1 ? "persona" : "personas"}
          </p>
          <p className="ticket__codigo">{ok.codigo}</p>
          <p className="ticket__ayuda">
            Guardá este código. Si necesitás cambiar o cancelar, llamanos al{" "}
            <a href={`tel:${LOCAL.telefonos[0].tel}`}>{LOCAL.telefonos[0].valor}</a> o al{" "}
            <a href={`tel:${LOCAL.telefonos[1].tel}`}>{LOCAL.telefonos[1].valor}</a> y nombrá el código.
          </p>
        </div>
        <p className="acciones-pag">
          <Link className="btn" to="/">
            Volver al inicio
          </Link>
        </p>
      </PaginaPublica>
    );

  return (
    <PaginaPublica
      titulo="Reservá tu mesa"
      ojo="Elegí el día y el horario"
      ancha
      medio={{
        tipo: "foto",
        n: 4,
        alt: "Una pareja almorzando en el salón, con la parrillada en brasero sobre la mesa",
        posicion: "35% 45%",
      }}
    >
      <div className="reservar">
        <form className="form-pub" onSubmit={enviar} noValidate>
          <p className="paso__t">Primero, tus datos</p>
          <label>
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              required
              maxLength={80}
              aria-invalid={!!errores.nombre}
            />
            {errores.nombre && <span className="campo-error">{errores.nombre}</span>}
          </label>
          <label>
            Teléfono
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              required
              aria-invalid={!!errores.telefono}
            />
            {errores.telefono && <span className="campo-error">{errores.telefono}</span>}
          </label>
          <p className="paso__t">Después, cuándo venís</p>
          <div className="fila">
            <label>
              Personas
              <input
                type="number"
                min={1}
                max={40}
                value={personas}
                onChange={(e) => setPersonas(Math.max(1, Number(e.target.value)))}
                required
              />
            </label>
            <label>
              Día
              <input
                type="date"
                min={hoy}
                max={sumarDias(hoy, diasMax)}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </label>
          </div>
          <fieldset>
            <legend>Horario</legend>
            <div className="franjas">
              {franjas.map((f) => (
                <label
                  key={f.id}
                  className={`franja ${franjaId === f.id ? "franja--sel" : ""} ${f.estado !== "disponible" ? "franja--no" : ""}`}
                >
                  <input
                    type="radio"
                    name="franja"
                    value={f.id}
                    checked={franjaId === f.id}
                    disabled={f.estado !== "disponible"}
                    onChange={() => setFranjaId(f.id)}
                  />
                  <span>{f.nombre.replace(" a ", " – ")}</span>
                  {f.estado !== "disponible" && <small>no disponible</small>}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="paso__t">Por último, confirmá</p>
          <label>
            Comentarios (opcional)
            <input
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              maxLength={200}
              placeholder="Cumpleaños, silla para bebé…"
            />
          </label>
          <label className="aviso">
            <input type="checkbox" checked={aviso} onChange={(e) => setAviso(e.target.checked)} />
            <span>
              Acepto que Don Valentín use mi nombre y teléfono solo para gestionar esta reserva (Ley 25.326 de
              Protección de Datos Personales).
            </span>
          </label>
          {error && (
            <p className="mensaje mensaje--error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn--brasa btn--grande"
            disabled={enviando || !franjaId || !aviso || !nombre || !telefono}
          >
            {enviando ? "Guardando…" : "Reservar mesa"}
          </button>
          <p className="form-pub__pie">
            ¿Preferís llamar? <a href={`tel:${LOCAL.telefonos[0].tel}`}>{LOCAL.telefonos[0].valor}</a> (WhatsApp) o{" "}
            <a href={`tel:${LOCAL.telefonos[1].tel}`}>{LOCAL.telefonos[1].valor}</a>.
          </p>
        </form>
        <aside className="reservar__lado" aria-label="Resumen de tu reserva y datos del local">
          <div className="resumen">
            <p className="resumen__mono">Tu reserva</p>
            <dl>
              <div>
                <dt>A nombre de</dt>
                <dd>{nombre.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Día</dt>
                <dd>{fecha ? diaLargo(fecha) : "—"}</dd>
              </div>
              <div>
                <dt>Horario</dt>
                <dd>{franjaElegida ? franjaElegida.nombre.replace(" a ", " – ") : "Elegí un horario"}</dd>
              </div>
              <div>
                <dt>Personas</dt>
                <dd>{personas}</dd>
              </div>
            </dl>
            <p className="resumen__pie">
              Parrilla libre desde {precio(desde)} por persona. <Link to="/parrilla-libre">Qué incluye</Link>
            </p>
          </div>
          <div className="reservar__video">
            <VideoLoop src="/media/video/brasas.mp4" poster="/media/video/brasas.webp" />
            <div className="reservar__datos">
              <p className="rotulo__mono">Parrilla libre · San Miguel</p>
              <p>
                Todos los días de {LOCAL.horario.apertura} a {LOCAL.horario.cierre}.
              </p>
              <p>
                {LOCAL.direccion}, {LOCAL.localidad}. <Link to="/como-llegar">Cómo llegar</Link>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </PaginaPublica>
  );
}
