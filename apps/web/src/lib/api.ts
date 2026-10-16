export interface ErrorApi {
  codigo: string;
  mensaje: string;
  campos?: Record<string, string>;
}
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly campos: Record<string, string> | undefined;
  constructor(status: number, e: ErrorApi) {
    super(e.mensaje);
    this.status = status;
    this.codigo = e.codigo;
    this.campos = e.campos;
  }
}

let csrf = "";
export const fijarCsrf = (t: string): void => {
  csrf = t;
};

export async function api<T>(ruta: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const res = await fetch(`/api${ruta}`, {
    method,
    credentials: "same-origin",
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res
    .json()
    .catch(() => ({ error: { codigo: "RESPUESTA_INVALIDA", mensaje: "El servidor respondió algo inesperado." } }));
  if (!res.ok) throw new ApiError(res.status, (data as { error: ErrorApi }).error);
  return data as T;
}
