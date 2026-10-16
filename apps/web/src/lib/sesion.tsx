import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Permiso, Rol } from "@dv/shared";
import { api, ApiError, fijarCsrf } from "./api.ts";

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
}
interface RespSesion {
  usuario: Usuario;
  csrfToken: string;
  permisos: Permiso[];
}
interface Ctx {
  cargando: boolean;
  usuario: Usuario | null;
  permisos: readonly Permiso[];
  puede: (p: Permiso) => boolean;
  entrar: (usuario: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
}
const SesionCtx = createContext<Ctx | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [r, setR] = useState<RespSesion | null>(null);

  useEffect(() => {
    api<RespSesion>("/auth/me")
      .then((x) => {
        fijarCsrf(x.csrfToken);
        setR(x);
      })
      .catch((e: unknown) => {
        if (!(e instanceof ApiError) || e.status !== 401) console.error(e);
      })
      .finally(() => setCargando(false));
  }, []);

  const entrar = useCallback(async (usuario: string, password: string) => {
    const x = await api<RespSesion>("/auth/login", { method: "POST", body: { usuario, password } });
    fijarCsrf(x.csrfToken);
    setR(x);
  }, []);
  const salir = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    fijarCsrf("");
    setR(null);
  }, []);

  const valor = useMemo<Ctx>(
    () => ({
      cargando,
      usuario: r?.usuario ?? null,
      permisos: r?.permisos ?? [],
      puede: (p) => (r?.permisos ?? []).includes(p),
      entrar,
      salir,
    }),
    [cargando, r, entrar, salir],
  );
  return <SesionCtx value={valor}>{children}</SesionCtx>;
}

export function useSesion(): Ctx {
  const c = useContext(SesionCtx);
  if (!c) throw new Error("useSesion fuera del proveedor");
  return c;
}
