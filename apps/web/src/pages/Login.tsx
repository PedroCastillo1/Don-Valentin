import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import "../styles/admin.css";

export function Login() {
  const { usuario, entrar, cargando } = useSesion();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
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
      setError(err instanceof ApiError ? err.message : "No pudimos conectar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login" id="contenido">
      <div className="login__lado" aria-hidden="true">
        <img src="/media/foto-2-900.webp" alt="" />
        <p className="login__pie">Salón · Parrilla · Cocina · Barra</p>
      </div>
      <form className="login__form" onSubmit={enviar} noValidate>
        <p className="login__marca">Don Valentín</p>
        <h1>Ingreso del personal</h1>
        <label>
          Usuario
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--brasa" disabled={enviando || !u || !p}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="login__nota">Si no recordás tu clave, pedísela al Encargado de Salón.</p>
      </form>
    </main>
  );
}
