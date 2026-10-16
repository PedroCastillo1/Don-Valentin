import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ROLES, ROL_NOMBRE } from "@dv/shared";
import type { Permiso, Rol } from "@dv/shared";
import { api, ApiError } from "../lib/api.ts";
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
  accion: string;
  recurso: string | null;
  resultado: string;
}

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<U[]>([]);
  const [permisos, setPermisos] = useState<Record<string, Permiso[]>>({});
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api<{ usuarios: U[]; permisosPorRol: Record<string, Permiso[]> }>("/admin/usuarios");
      setUsuarios(r.usuarios);
      setPermisos(r.permisosPorRol);
      setEventos((await api<{ eventos: Evento[] }>("/admin/auditoria?denegados=1")).eventos.slice(0, 8));
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
      await cargar();
    } catch (e) {
      setMsg({ tipo: "error", texto: e instanceof ApiError ? e.message : "No se pudo cambiar el estado." });
    }
  }

  return (
    <>
      <Cabecera
        titulo="Usuarios y roles"
        bajada="Cada perfil ve y hace solo lo que le corresponde. Los intentos no permitidos quedan registrados."
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
                          })
                        : "Nunca"}
                    </td>
                    <td>
                      <button className="mini" onClick={() => void activo(u, !u.activo)}>
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>Intentos denegados recientes</h2>
          {eventos.length === 0 ? (
            <p className="vacio">No hay intentos denegados registrados.</p>
          ) : (
            <ul className="reservas">
              {eventos.map((e) => (
                <li key={e.id}>
                  <time>
                    {new Date(e.creadaEn).toLocaleTimeString("es-AR", {
                      timeZone: "America/Argentina/Buenos_Aires",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <div>
                    <strong>{e.usuario ?? "Sin usuario"}</strong>
                    <small>
                      {e.accion} · {e.recurso}
                    </small>
                  </div>
                  <code>{e.resultado}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
        <NuevoUsuario onCreado={() => void cargar()} permisos={permisos} />
      </div>
    </>
  );
}

function NuevoUsuario({ onCreado, permisos }: { onCreado: () => void; permisos: Record<string, Permiso[]> }) {
  const [usuario, setUsuario] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("mozo");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api("/admin/usuarios", { method: "POST", body: { usuario, nombre, rol, password } });
      setMsg({ tipo: "ok", texto: `Usuario ${usuario} creado.` });
      setUsuario("");
      setNombre("");
      setPassword("");
      onCreado();
    } catch (err) {
      setMsg({ tipo: "error", texto: err instanceof ApiError ? err.message : "No se pudo crear el usuario." });
    }
  }
  return (
    <section>
      <h2>Nuevo usuario</h2>
      <form className="form" onSubmit={enviar}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} />
        </label>
        <label>
          Usuario
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoCapitalize="none"
            autoComplete="off"
          />
        </label>
        <label>
          Rol
          <select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            {ROLES.map((r) => (
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
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
          />
        </label>
        {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
        <button className="btn btn--brasa">Crear usuario</button>
      </form>
    </section>
  );
}
