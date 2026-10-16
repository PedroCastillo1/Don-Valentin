import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { VideoLoop } from "../components/VideoLoop.tsx";
import "../styles/admin.css";

export function Login() {
  const { usuario, entrar, cargando } = useSesion();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [ver, setVer] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario) return <Navigate to="/admin" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await entrar(u.trim(), p);
      nav("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos conectar. Probá de nuevo en un momento.");
      setP("");
    } finally {
      setEnviando(false);
    }
  }
  const teclas = (e: KeyboardEvent<HTMLInputElement>) => setMayusculas(e.getModifierState("CapsLock"));

  return (
    <main className="login" id="contenido">
      <div className="login__lado">
        <VideoLoop className="login__video" src="/media/video/brasas.mp4" poster="/media/video/brasas.webp" />
        <div className="login__velo" aria-hidden="true" />
        <p className="login__sello" aria-hidden="true">
          Don Valentín
          <small>Parrilla libre · San Miguel</small>
        </p>
        <p className="login__pie" aria-hidden="true">
          Salón · Parrilla · Cocina · Barra
        </p>
      </div>
      <div className="login__panel">
        <form className="login__form" onSubmit={enviar} noValidate>
          <h1>Ingreso del personal</h1>
          <p className="login__intro">
            Administración de Don Valentín. Entrá con tu usuario para ver las reservas y el salón del día.
          </p>
          <label>
            Usuario
            <span className="login__campo">
              <input
                value={u}
                onChange={(e) => setU(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                required
              />
            </span>
          </label>
          <label>
            Contraseña
            <span className="login__campo">
              <input
                type={ver ? "text" : "password"}
                data-visible={ver ? "" : undefined}
                value={p}
                onChange={(e) => setP(e.target.value)}
                onKeyUp={teclas}
                onKeyDown={teclas}
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                required
              />
              <button type="button" className="login__ver" aria-pressed={ver} onClick={() => setVer((v) => !v)}>
                {ver ? "Ocultar" : "Mostrar"}
              </button>
            </span>
          </label>
          {mayusculas && <p className="login__aviso">Tenés las mayúsculas activadas.</p>}
          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--brasa" disabled={enviando || !u || !p}>
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>
          <p className="login__nota">Si no recordás tu clave, pedísela al Encargado de Salón.</p>
          <Link className="login__volver" to="/">
            Volver al sitio
          </Link>
        </form>
      </div>
    </main>
  );
}
