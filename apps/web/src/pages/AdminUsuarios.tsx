import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ROLES, ROLES_GESTIONABLES, ROL_NOMBRE, puedeGestionarRol } from "@dv/shared";
import { useSesion } from "../lib/sesion.tsx";
import type { Permiso, Rol } from "@dv/shared";
import { api, ApiError } from "../lib/api.ts";
import { coincideBusqueda } from "../lib/formato.ts";
import { hoyAr, sumarDias } from "../lib/fechas.ts";
import { Cabecera, Mensaje } from "../components/ui.tsx";

interface U {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string | null;
}
interface Evento {
  id: number;
  creadaEn: string;
  usuario: string | null;
  usuarioNombre?: string | null;
  rol?: Rol | null;
  accion: string;
  recurso: string | null;
  resultado: string;
  detalle?: Record<string, unknown> | null;
}

type CategoriaAccion = "todas" | "login" | "acceso" | "reservas" | "pedidos" | "carta" | "config";

function categoriaDeAccion(accion: string): Exclude<CategoriaAccion, "todas"> {
  if (accion === "login") return "login";
  if (accion.startsWith("acceso:")) return "acceso";
  if (accion.startsWith("reserva:") || accion.startsWith("salon:")) return "reservas";
  if (accion.startsWith("pedido") || accion.startsWith("mesa:") || accion.startsWith("sesion_mesa:")) return "pedidos";
  if (accion.startsWith("carta:")) return "carta";
  return "config";
}

function descripcionAccion(e: Evento): string {
  const det = e.detalle && typeof e.detalle === "object" ? e.detalle : null;
  const motivo = typeof det?.motivo === "string" ? det.motivo : null;
  if (e.accion === "login") {
    if (e.resultado === "denegado") {
      if (motivo === "usuario_inexistente") return "Intento de ingreso con usuario inexistente";
      if (motivo === "password") return "Intento de ingreso con contraseña incorrecta";
      if (motivo === "bloqueado") return "Ingreso bloqueado temporalmente por intentos fallidos";
      if (motivo === "inactivo") return "Intento de ingreso con usuario desactivado";
      return "Intento de ingreso denegado";
    }
    return "Ingreso al panel";
  }
  if (e.accion.startsWith("acceso:")) {
    const perm = e.accion.replace(/^acceso:/, "");
    return `Acceso sin permiso (${perm})`;
  }
  if (e.accion === "usuario:crear") return "Alta de usuario";
  if (e.accion === "usuario:activar") return "Activación de usuario";
  if (e.accion === "usuario:desactivar") return "Desactivación de usuario";
  if (e.accion.startsWith("parametro:") || e.accion.startsWith("aforo:") || e.accion.startsWith("tiempo:"))
    return "Cambio en parámetros del local";
  if (e.accion.startsWith("carta:")) return "Actualización de carta o precios";
  if (e.accion.startsWith("reserva:")) return "Gestión de reserva";
  if (e.accion.startsWith("mesa:") || e.accion.startsWith("pedido")) return "Operación de mesa o pedido";
  return e.accion;
}

function fechaIsoAr(isoUtc: string): string {
  const ms = Date.parse(isoUtc);
  if (Number.isNaN(ms)) return "";
  return new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);
}

function formatearTiempoAr(isoUtc: string, hoy: string): { hora: string; fecha: string } {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return { hora: "—", fecha: "—" };
  const hora = d.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const diaIso = fechaIsoAr(isoUtc);
  const corta = `${diaIso.slice(8, 10)}/${diaIso.slice(5, 7)}/${diaIso.slice(0, 4)}`;
  if (diaIso === hoy) return { hora: `${hora} hs`, fecha: `Hoy · ${diaIso.slice(8, 10)}/${diaIso.slice(5, 7)}` };
  if (diaIso === sumarDias(hoy, -1))
    return { hora: `${hora} hs`, fecha: `Ayer · ${diaIso.slice(8, 10)}/${diaIso.slice(5, 7)}` };
  return { hora: `${hora} hs`, fecha: corta };
}

export function AdminUsuarios() {
  const { usuario: yo } = useSesion();
  const [usuarios, setUsuarios] = useState<U[]>([]);
  const [permisos, setPermisos] = useState<Record<string, Permiso[]>>({});
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [confirmarUsuario, setConfirmarUsuario] = useState<{ u: U; valor: boolean } | null>(null);

  // Filtros del historial
  const [filtroResultado, setFiltroResultado] = useState<"denegado" | "permitido" | "todos">("denegado");
  const [orden, setOrden] = useState<"recientes" | "antiguos">("recientes");
  const [filtroRol, setFiltroRol] = useState<Rol | "todos" | "sin_rol">("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todas" | "hoy" | "7d" | "fecha">("todas");
  const [fechaExacta, setFechaExacta] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<CategoriaAccion>("todas");
  const [busqueda, setBusqueda] = useState<string>("");

  const cargar = useCallback(async () => {
    try {
      const [r, aud] = await Promise.all([
        api<{ usuarios: U[]; permisosPorRol: Record<string, Permiso[]> }>("/admin/usuarios"),
        api<{ eventos: Evento[] }>("/admin/auditoria?limite=300"),
      ]);
      setUsuarios(r.usuarios);
      setPermisos(r.permisosPorRol);
      setEventos(aud.eventos);
    } catch (e) {
      setMsg({ tipo: "error", texto: e instanceof Error ? e.message : "No pudimos cargar los usuarios." });
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function activo(u: U, valor: boolean) {
    setMsg(null);
    try {
      await api(`/admin/usuarios/${u.id}/activo`, { method: "PATCH", body: { activo: valor } });
      setConfirmarUsuario(null);
      setMsg({ tipo: "ok", texto: `Usuario ${u.usuario} ${valor ? "activado" : "desactivado"}.` });
      await cargar();
    } catch (e) {
      setConfirmarUsuario(null);
      setMsg({ tipo: "error", texto: e instanceof ApiError ? e.message : "No se pudo cambiar el estado." });
    }
  }

  const rolPorUsuario = useMemo(() => {
    const m = new Map<string, Rol>();
    for (const u of usuarios) m.set(u.usuario.toLowerCase(), u.rol);
    return m;
  }, [usuarios]);

  const hoy = useMemo(() => hoyAr(), []);
  const hace7Dias = useMemo(() => sumarDias(hoy, -6), [hoy]);

  const resolverRol = useCallback(
    (e: Evento): Rol | null => {
      if (e.rol && (ROLES as readonly string[]).includes(e.rol)) return e.rol as Rol;
      if (e.usuario) {
        const r = rolPorUsuario.get(e.usuario.toLowerCase());
        if (r) return r;
      }
      if (e.accion === "login" && e.recurso) {
        const r = rolPorUsuario.get(e.recurso.toLowerCase());
        if (r) return r;
      }
      return null;
    },
    [rolPorUsuario],
  );

  const conteos = useMemo(() => {
    let denegados = 0;
    let permitidos = 0;
    for (const e of eventos) {
      if (e.resultado === "denegado") denegados++;
      else permitidos++;
    }
    return { denegados, permitidos, todos: eventos.length };
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    const q = busqueda.trim();
    const lista = eventos.filter((e) => {
      if (filtroResultado !== "todos" && e.resultado !== filtroResultado) return false;
      const rolEv = resolverRol(e);
      if (filtroRol === "sin_rol") {
        if (rolEv !== null) return false;
      } else if (filtroRol !== "todos") {
        if (rolEv !== filtroRol) return false;
      }
      if (filtroTipo !== "todas" && categoriaDeAccion(e.accion) !== filtroTipo) return false;
      const diaEv = fechaIsoAr(e.creadaEn);
      if (filtroPeriodo === "hoy" && diaEv !== hoy) return false;
      if (filtroPeriodo === "7d" && (diaEv < hace7Dias || diaEv > hoy)) return false;
      if (filtroPeriodo === "fecha" && fechaExacta && diaEv !== fechaExacta) return false;
      if (q) {
        const nombreRol = rolEv ? ROL_NOMBRE[rolEv] : "sin usuario externo";
        const texto = `${e.usuario ?? "sin usuario"} ${e.usuarioNombre ?? ""} ${nombreRol} ${rolEv ?? ""} ${e.accion} ${e.recurso ?? ""} ${e.resultado} ${descripcionAccion(e)}`;
        if (!coincideBusqueda(texto, q)) return false;
      }
      return true;
    });

    lista.sort((a, b) => {
      const ta = Date.parse(a.creadaEn) || 0;
      const tb = Date.parse(b.creadaEn) || 0;
      const diff = tb - ta || b.id - a.id;
      return orden === "recientes" ? diff : -diff;
    });
    return lista;
  }, [
    eventos,
    filtroResultado,
    filtroRol,
    filtroTipo,
    filtroPeriodo,
    fechaExacta,
    busqueda,
    orden,
    hoy,
    hace7Dias,
    resolverRol,
  ]);

  const hayFiltrosActivos =
    filtroRol !== "todos" ||
    filtroPeriodo !== "todas" ||
    Boolean(fechaExacta) ||
    filtroTipo !== "todas" ||
    Boolean(busqueda.trim()) ||
    orden !== "recientes";

  return (
    <>
      <Cabecera
        titulo="Usuarios y roles"
        bajada="Cada perfil ve y hace solo lo que le corresponde. Los intentos no permitidos y las acciones quedan registrados."
      />
      {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
      <div className="dos">
        <section>
          <h2>Personal</h2>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Último ingreso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.activo ? "" : "apagado"}>
                    <td>
                      <strong>{u.nombre}</strong>
                      <small>{u.usuario}</small>
                    </td>
                    <td>{ROL_NOMBRE[u.rol]}</td>
                    <td>
                      {u.ultimoAcceso
                        ? new Date(u.ultimoAcceso).toLocaleString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                            dateStyle: "short",
                            timeStyle: "short",
                            hour12: false,
                          })
                        : "Nunca"}
                    </td>
                    <td>
                      {yo && u.id === yo.id ? (
                        <small className="nota">Tu usuario</small>
                      ) : yo && puedeGestionarRol(yo.rol, u.rol) ? (
                        confirmarUsuario?.u.id === u.id ? (
                          <div className="acciones-fila">
                            <button
                              type="button"
                              className="mini mini--brasa"
                              onClick={() => void activo(u, confirmarUsuario.valor)}
                            >
                              Sí, {confirmarUsuario.valor ? "activar" : "desactivar"}
                            </button>
                            <button type="button" className="mini" onClick={() => setConfirmarUsuario(null)}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mini"
                            onClick={() => setConfirmarUsuario({ u, valor: !u.activo })}
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                        )
                      ) : (
                        <small className="nota">Solo lo gestiona Administración</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <NuevoUsuario onCreado={() => void cargar()} permisos={permisos} roles={yo ? ROLES_GESTIONABLES[yo.rol] : []} />
      </div>

      <section className="panel panel--historial" aria-labelledby="t-historial">
        <div className="panel__cab panel__cab--fila">
          <div>
            <h2 id="t-historial">
              {filtroResultado === "denegado"
                ? "Intentos denegados recientes"
                : filtroResultado === "permitido"
                  ? "Actividad permitida reciente"
                  : "Historial completo de actividad"}
            </h2>
            <p>
              Mostrando {eventosFiltrados.length} de {eventos.length} registros · Hora de Argentina (24 hs).
            </p>
          </div>
          <div className="franjas" role="group" aria-label="Resultado del evento">
            <button
              type="button"
              aria-pressed={filtroResultado === "denegado"}
              onClick={() => setFiltroResultado("denegado")}
            >
              Denegados ({conteos.denegados})
            </button>
            <button
              type="button"
              aria-pressed={filtroResultado === "permitido"}
              onClick={() => setFiltroResultado("permitido")}
            >
              Permitidos ({conteos.permitidos})
            </button>
            <button
              type="button"
              aria-pressed={filtroResultado === "todos"}
              onClick={() => setFiltroResultado("todos")}
            >
              Todos ({conteos.todos})
            </button>
          </div>
        </div>

        <div className="filtros-pedidos filtros-pedidos--historial" role="region" aria-label="Filtros del historial">
          <label>
            Orden
            <select value={orden} onChange={(e) => setOrden(e.target.value as "recientes" | "antiguos")}>
              <option value="recientes">Más recientes primero</option>
              <option value="antiguos">Más antiguos primero</option>
            </select>
          </label>

          <label>
            Rol
            <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value as Rol | "todos" | "sin_rol")}>
              <option value="todos">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROL_NOMBRE[r]}
                </option>
              ))}
              <option value="sin_rol">Sin usuario / externo</option>
            </select>
          </label>

          <label>
            Período
            <select
              value={filtroPeriodo}
              onChange={(e) => {
                const v = e.target.value as "todas" | "hoy" | "7d" | "fecha";
                setFiltroPeriodo(v);
                if (v !== "fecha") setFechaExacta("");
                else if (!fechaExacta) setFechaExacta(hoy);
              }}
            >
              <option value="todas">Todas las fechas</option>
              <option value="hoy">
                Solo hoy ({hoy.slice(8, 10)}/{hoy.slice(5, 7)})
              </option>
              <option value="7d">Últimos 7 días</option>
              <option value="fecha">Día específico…</option>
            </select>
          </label>

          <label>
            Fecha exacta
            <input
              type="date"
              value={fechaExacta}
              onChange={(e) => {
                setFechaExacta(e.target.value);
                setFiltroPeriodo(e.target.value ? "fecha" : "todas");
              }}
            />
          </label>

          <label>
            Tipo de acción
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as CategoriaAccion)}>
              <option value="todas">Todas las acciones</option>
              <option value="login">Ingresos (login)</option>
              <option value="acceso">Accesos sin permiso</option>
              <option value="reservas">Reservas y salón</option>
              <option value="pedidos">Pedidos y mesas / QR</option>
              <option value="carta">Carta y precios</option>
              <option value="config">Parámetros y usuarios</option>
            </select>
          </label>

          <label>
            Buscar usuario, acción o recurso
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej. admin, encargado, login, parámetros…"
              autoComplete="off"
            />
          </label>

          {hayFiltrosActivos && (
            <div className="acciones-fila">
              <button
                type="button"
                className="btn btn--chico"
                onClick={() => {
                  setFiltroRol("todos");
                  setFiltroPeriodo("todas");
                  setFechaExacta("");
                  setFiltroTipo("todas");
                  setBusqueda("");
                  setOrden("recientes");
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {eventosFiltrados.length === 0 ? (
          <p className="vacio">
            {filtroResultado === "denegado" && !hayFiltrosActivos
              ? "No hay intentos denegados registrados."
              : "No hay eventos que coincidan con los filtros seleccionados."}
          </p>
        ) : (
          <ul className="historial-lista" aria-label="Eventos de auditoría">
            {eventosFiltrados.map((e) => {
              const t = formatearTiempoAr(e.creadaEn, hoy);
              const rolEv = resolverRol(e);
              return (
                <li
                  key={e.id}
                  className={e.resultado === "denegado" ? "historial-item historial-item--denegado" : "historial-item"}
                >
                  <div className="historial-item__tiempo">
                    <time dateTime={e.creadaEn}>{t.hora}</time>
                    <small>{t.fecha}</small>
                  </div>
                  <div className="historial-item__actor">
                    <strong>{e.usuario ?? "Sin usuario"}</strong>
                    <span className={rolEv ? "historial-rol" : "historial-rol historial-rol--ext"}>
                      {rolEv ? ROL_NOMBRE[rolEv] : "Sin sesión"}
                    </span>
                  </div>
                  <div className="historial-item__detalle">
                    <p className="historial-item__titulo">{descripcionAccion(e)}</p>
                    <small>
                      {e.accion}
                      {e.recurso ? ` · ${e.recurso}` : ""}
                    </small>
                  </div>
                  <div className="historial-item__estado">
                    <code className={`historial-badge historial-badge--${e.resultado}`}>{e.resultado}</code>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function NuevoUsuario({
  onCreado,
  permisos,
  roles,
}: {
  onCreado: () => void;
  permisos: Record<string, Permiso[]>;
  roles: readonly Rol[];
}) {
  const [usuario, setUsuario] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("mozo");
  const [password, setPassword] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setMsg(null);
    try {
      await api("/admin/usuarios", { method: "POST", body: { usuario, nombre, rol, password } });
      setMsg({ tipo: "ok", texto: `Usuario ${usuario} creado.` });
      setUsuario("");
      setNombre("");
      setPassword("");
      setConfirmando(false);
      onCreado();
    } catch (err) {
      setConfirmando(false);
      setMsg({ tipo: "error", texto: err instanceof ApiError ? err.message : "No se pudo crear el usuario." });
    }
  }
  return (
    <section>
      <h2>Nuevo usuario</h2>
      <form className="form" onSubmit={enviar}>
        <label>
          Nombre
          <input
            value={nombre}
            onChange={(e) => {
              setConfirmando(false);
              setNombre(e.target.value);
            }}
            required
            maxLength={80}
          />
        </label>
        <label>
          Usuario
          <input
            value={usuario}
            onChange={(e) => {
              setConfirmando(false);
              setUsuario(e.target.value);
            }}
            required
            autoCapitalize="none"
            autoComplete="off"
          />
        </label>
        <label>
          Rol
          <select
            value={rol}
            onChange={(e) => {
              setConfirmando(false);
              setRol(e.target.value as Rol);
            }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROL_NOMBRE[r]}
              </option>
            ))}
          </select>
        </label>
        <p className="nota">
          {(permisos[rol] ?? []).length} permisos: {(permisos[rol] ?? []).join(", ")}
        </p>
        <label>
          Contraseña inicial
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setConfirmando(false);
              setPassword(e.target.value);
            }}
            required
            minLength={10}
            autoComplete="new-password"
          />
        </label>
        {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
        {confirmando ? (
          <div className="confirmar" role="group" aria-label="Confirmar nuevo usuario">
            <p>
              ¿Crear el usuario <strong>{usuario}</strong> ({nombre}) con rol <strong>{ROL_NOMBRE[rol]}</strong>?
            </p>
            <div className="acciones-fila">
              <button type="submit" className="btn btn--brasa btn--chico">
                Sí, confirmar
              </button>
              <button type="button" className="btn btn--chico" onClick={() => setConfirmando(false)}>
                No, revisar
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" className="btn btn--brasa">
            Crear usuario
          </button>
        )}
      </form>
    </section>
  );
}
